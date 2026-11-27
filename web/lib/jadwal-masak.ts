import "server-only";

import { type OrderLayar, pesananDapur } from "./pesanan-dapur";
import { prisma } from "./prisma";
import { bedaPesanan, IsiRencana, type Rencana, Sidik, SidikGabungan, sidikPesanan } from "./rencana-masak";

/** Kunci baris jadwal gabungan pesanan kecil (satu per tanggal). */
export const KUNCI_GABUNGAN = "gabungan";

/* ==========================================================================
   JADWAL MASAK (docs/24 M1) — jadwal produksi menempel ke pesanan.
   Satu baris production_plans per pesanan per tanggal. Pesanan dibaca dari
   lib/pesanan-dapur (tanpa harga), jadi kuncinya sama dengan id pesanan di TV.
   ========================================================================== */

const tgl = (t: string) => new Date(`${t}T00:00:00Z`);

type Baris = Awaited<ReturnType<typeof prisma.production_plans.findMany>>[number];

/** Isi rusak dicatat ke log & dilewati: layar dan halaman tetap jalan (bukan diam-diam kosong). */
function keRencana(b: Baris): Rencana | null {
  const t = b.date.toISOString().slice(0, 10);
  const isi = IsiRencana.safeParse({ judul: b.title ?? "", catatan: b.notes ?? "", sesi: b.sessions });
  if (!isi.success) {
    console.error(`[jadwal-masak] isi ${b.order_key} ${t} tidak sah`, isi.error.issues.slice(0, 3));
    return null;
  }
  if (b.order_key === KUNCI_GABUNGAN) {
    const g = SidikGabungan.safeParse(b.order_snapshot);
    return { ...isi.data, tanggal: t, gabungan: g.success ? g.data.gabungan.map((x) => x.nama) : [] };
  }
  return { ...isi.data, tanggal: t, pesanan: b.order_name ?? undefined };
}

/** Jadwal semua pesanan pada tanggal-tanggal ini, untuk TV (hari ini + besok). */
export async function rencanaMasak(tanggal: string[]): Promise<Rencana[]> {
  const baris = await prisma.production_plans.findMany({
    where: { date: { in: tanggal.map(tgl) } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  return baris.flatMap((b) => {
    const r = keRencana(b);
    return r && r.sesi.length ? [r] : [];
  });
}

export type JadwalPesanan = {
  kunci: string;
  nama: string;
  tanggal: string;
  /** null = pesanan sudah tidak ada di tanggal ini (dibatalkan / dipindah) tapi jadwalnya masih tersimpan. */
  order: OrderLayar | null;
  rencana: Rencana | null;
  /** Perubahan pesanan sejak jadwal disimpan ("Snack Box: 1.693 BOX → 1.750 BOX"). */
  berubah: string[];
  diubah: string | null;
  /** Pesanan ini masuk jadwal gabungan tanggal ini. */
  gabung: boolean;
};

export type JadwalGabungan = {
  rencana: Rencana | null;
  /** Pesanan yang digabung (dari sidik saat disimpan; sebelum disimpan = calon). */
  pesanan: OrderLayar[];
  /** Semua pesanan tanggal ini yang belum punya jadwal sendiri — isi draf & sidik saat disimpan. */
  calon: OrderLayar[];
  berubah: string[];
  diubah: string | null;
};

/** Semua pesanan satu tanggal beserta jadwalnya + jadwal gabungan pesanan kecil. */
export async function jadwalTanggal(tanggal: string): Promise<{ pesanan: JadwalPesanan[]; gabungan: JadwalGabungan }> {
  const [order, semua] = await Promise.all([
    pesananDapur(tanggal, null),
    prisma.production_plans.findMany({ where: { date: tgl(tanggal) }, orderBy: { id: "asc" } }),
  ]);
  const barisGabungan = semua.find((b) => b.order_key === KUNCI_GABUNGAN) ?? null;
  const baris = semua.filter((b) => b.order_key !== KUNCI_GABUNGAN);
  const perKunci = new Map(baris.map((b) => [b.order_key, b]));
  const sidikGabungan = barisGabungan ? SidikGabungan.safeParse(barisGabungan.order_snapshot) : null;
  const anggota = new Map(sidikGabungan?.success ? sidikGabungan.data.gabungan.map((x) => [x.kunci, x]) : []);
  const hasil: JadwalPesanan[] = order.map((o) => {
    const b = perKunci.get(o.id);
    const lama = b?.order_snapshot ? Sidik.safeParse(b.order_snapshot) : null;
    return {
      kunci: o.id,
      nama: o.nama,
      tanggal,
      order: o,
      rencana: b ? keRencana(b) : null,
      berubah: lama?.success ? bedaPesanan(lama.data, sidikPesanan(o)) : [],
      diubah: b?.updated_at.toISOString() ?? null,
      gabung: !b && anggota.has(o.id),
    };
  });
  for (const b of baris)
    if (!order.some((o) => o.id === b.order_key))
      hasil.push({
        kunci: b.order_key,
        nama: b.order_name ?? b.order_key,
        tanggal,
        order: null,
        rencana: keRencana(b),
        berubah: ["Pesanan ini tidak ada lagi di tanggal ini (dibatalkan atau tanggalnya dipindah)."],
        diubah: b.updated_at.toISOString(),
        gabung: false,
      });

  // Gabungan: anggota tersimpan dibanding pesanan terkini; pesanan baru tanpa jadwal sendiri = belum masuk.
  const tanpaJadwal = order.filter((o) => !perKunci.has(o.id));
  const berubah: string[] = [];
  if (barisGabungan) {
    for (const [kunci, x] of anggota) {
      const o = order.find((y) => y.id === kunci);
      if (!o) berubah.push(`${x.nama}: tidak ada lagi di tanggal ini.`);
      else if (perKunci.has(kunci)) berubah.push(`${x.nama}: sekarang punya jadwal sendiri.`);
      else berubah.push(...bedaPesanan(x.sidik, sidikPesanan(o)).map((t) => `${x.nama} — ${t}`));
    }
    for (const o of tanpaJadwal) if (!anggota.has(o.id)) berubah.push(`Pesanan baru belum masuk: ${o.nama}`);
  }
  return {
    pesanan: hasil,
    gabungan: {
      rencana: barisGabungan ? keRencana(barisGabungan) : null,
      pesanan: barisGabungan ? tanpaJadwal.filter((o) => anggota.has(o.id)) : tanpaJadwal,
      calon: tanpaJadwal,
      berubah,
      diubah: barisGabungan?.updated_at.toISOString() ?? null,
    },
  };
}

/** Satu pesanan pada satu tanggal (halaman ubah jadwal). */
export async function jadwalSatu(kunci: string, tanggal: string): Promise<JadwalPesanan | null> {
  return (await jadwalTanggal(tanggal)).pesanan.find((j) => j.kunci === kunci) ?? null;
}

/** Tanggal acara sebuah pesanan invoice ("invoice-12") untuk pindah hari di halaman ubah; pesanan lain → []. */
export async function tanggalPesanan(kunci: string): Promise<string[]> {
  const m = /^invoice-(\d+)$/.exec(kunci);
  if (!m) return [];
  const d = await prisma.invoice_event_dates.findMany({
    where: { invoice_id: BigInt(m[1]) },
    orderBy: { event_date: "asc" },
    select: { event_date: true },
  });
  return d.map((x) => x.event_date.toISOString().slice(0, 10));
}

/** Ringkas jadwal yang tersimpan untuk satu pesanan (kartu di detail invoice/event), termasuk lewat jadwal gabungan. */
export async function ringkasJadwalPesanan(kunci: string, tanggal: string[] = []) {
  const [sendiri, gabungan] = await Promise.all([
    prisma.production_plans.findMany({ where: { order_key: kunci }, orderBy: { date: "asc" } }),
    tanggal.length
      ? prisma.production_plans.findMany({ where: { order_key: KUNCI_GABUNGAN, date: { in: tanggal.map(tgl) } } })
      : Promise.resolve([]),
  ]);
  const ikut = gabungan.filter((b) => {
    const g = SidikGabungan.safeParse(b.order_snapshot);
    return g.success && g.data.gabungan.some((x) => x.kunci === kunci);
  });
  return [...sendiri.map((b) => ({ b, gabungan: false })), ...ikut.map((b) => ({ b, gabungan: true }))].flatMap(({ b, gabungan }) => {
    const r = keRencana(b);
    return r ? [{ tanggal: r.tanggal, langkah: r.sesi.reduce((n, s) => n + s.langkah.length, 0), rencana: r, gabungan }] : [];
  });
}
