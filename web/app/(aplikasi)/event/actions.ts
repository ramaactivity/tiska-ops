"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { eventMiliknya } from "@/lib/event-akses";
import { barisEvent, isiPesananEvent, itemDariDb, simpanEventBaru } from "@/lib/event";
import { batasKunci, CARA_LAYANAN, ringkasPerubahan, STATUS_EVENT } from "@/lib/hitung/event";
import { pesanDitugaskan, pesanRefundMenunggu } from "@/lib/hitung/notifikasi";
import { hitungRefund } from "@/lib/hitung/pembatalan-event";
import { PERAN_TUGAS } from "@/lib/hitung/penugasan";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { dibayarEvent } from "@/lib/pembatalan-event";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { aksesPenuh, bolehKelolaUang, bolehUbahEvent, PERAN_PENANGGUNG_JAWAB } from "@/lib/peran";
import { sinkronBiayaEvent } from "@/lib/biaya-stok";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { hanyaMiliknya, pastikanIzin } from "@/lib/rbac";

async function bolehUbah() {
  const sesi = await pastikanIzin("event");
  if (!bolehUbahEvent(sesi.peran)) throw new Error("Peran ini hanya bisa membaca event.");
  return sesi;
}

async function eventSaya(id: string) {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(id)) throw new Error("Event tidak dikenal.");
  const e = await prisma.events.findFirst({ where: { id: BigInt(id), ...eventMiliknya(sesi) } });
  if (!e) throw new Error("Event tidak ditemukan.");
  return { sesi, e };
}

/** Quotation disetujui → event (salinan isi pesanan tanpa harga + batas kunci). */
export async function buatEvent(idQuotation: string): Promise<void> {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(idQuotation)) throw new Error("Quotation tidak dikenal.");
  const q = await prisma.quotations.findFirst({
    where: { id: BigInt(idQuotation), ...hanyaMiliknya(sesi) },
    select: { id: true, status: true, created_by: true, events: { select: { id: true } } },
  });
  if (!q) throw new Error("Quotation tidak ditemukan.");
  if (q.events) redirect(`/event/${q.events.id}`);
  if (q.status !== "approved") throw new Error("Event dibuat dari quotation yang sudah disetujui customer.");

  const id = await simpanEventBaru(q.id, BigInt(sesi.id), q.created_by ?? BigInt(sesi.id));
  revalidatePath("/event");
  redirect(`/event/${id}`);
}

/** Ambil ulang isi pesanan dari invoice/quotation → "UPDATE ke-n". Sesudah batas kunci hanya owner. */
export async function perbaruiEvent(id: string): Promise<{ pesan: string }> {
  const { sesi, e } = await eventSaya(id);
  const isi = await isiPesananEvent(e.quotation_id);
  const lama = itemDariDb(await prisma.event_items.findMany({ where: { event_id: e.id }, orderBy: { sort: "asc" } }));
  const ringkas = ringkasPerubahan(lama, isi.items);
  if (!ringkas.length) return { pesan: "Isi pesanan sama dengan event — tidak ada yang diperbarui." };
  const lewat = Boolean(e.lock_at && e.lock_at < new Date());
  if (lewat && !aksesPenuh(sesi.peran)) throw new Error("Sudah lewat batas perubahan — minta owner yang memperbarui.");
  const ke = e.change_count + 1;
  await prisma.$transaction([
    prisma.event_items.deleteMany({ where: { event_id: e.id } }),
    prisma.event_items.createMany({ data: barisEvent(e.id, isi.items) }),
    prisma.events.update({
      where: { id: e.id },
      data: {
        change_count: ke,
        invoice_id: isi.invoiceId,
        first_date: isi.pertama ? new Date(`${isi.pertama}T00:00:00Z`) : null,
        lock_at: batasKunci(isi.pertama, isi.adaBuffet),
        updated_at: new Date(),
      },
    }),
    prisma.event_changes.create({
      data: { event_id: e.id, change_no: ke, summary: ringkas.join("\n"), after_lock: lewat, created_by: BigInt(sesi.id) },
    }),
  ]);
  if (String(isi.invoiceId ?? "") !== String(e.invoice_id ?? "")) {
    // Invoice event berganti → biaya otomatis (RAB, Biaya Sewa, barang keluar; D-146–D-148) pindah ke invoice yang benar.
    await prisma.$transaction((tx) => sinkronBiayaEvent(tx, e.id, BigInt(sesi.id)));
  }
  revalidatePath(`/event/${id}`);
  return { pesan: `UPDATE ke-${ke} tercatat (${ringkas.length} perubahan).` };
}

export async function ubahStatusEvent(id: string, status: string): Promise<void> {
  const { e } = await eventSaya(id);
  if (!Object.hasOwn(STATUS_EVENT, status)) throw new Error("Status tidak dikenal.");
  if (status === "batal") throw new Error("Batalkan lewat tombol \"Batalkan event\" supaya alasan & refund tercatat.");
  if (e.status === "batal") throw new Error("Event ini dibatalkan. Urungkan pembatalannya dulu.");
  await prisma.events.update({ where: { id: e.id }, data: { status, updated_at: new Date() } });
  revalidatePath("/event");
  revalidatePath(`/event/${id}`);
}

const kosong = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const teks = (max: number) => z.preprocess(kosong, z.string().trim().max(max).nullable());
const skemaInfo = z.object({
  id: z.string().regex(/^\d+$/),
  service_mode: z.enum(Object.keys(CARA_LAYANAN) as [string, ...string[]]),
  venue: teks(255),
  address: teks(2000),
  maps_url: z.preprocess(kosong, z.string().trim().url("Link Maps tidak sah.").max(500).nullable()),
  pic_name: teks(255),
  pic_phone: teks(50),
  eo_name: teks(255),
  guest_count: z.preprocess(kosong, z.coerce.number().int().min(0).max(100_000).nullable()),
  notes: teks(5000),
});

export async function simpanInfoEvent(_s: { pesan?: string; sukses?: boolean }, data: FormData): Promise<{ pesan?: string; sukses?: boolean }> {
  const hasil = skemaInfo.safeParse(Object.fromEntries(data));
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id, ...isi } = hasil.data;
  const { e } = await eventSaya(id);
  await prisma.events.update({ where: { id: e.id }, data: { ...isi, updated_at: new Date() } });
  revalidatePath(`/event/${id}`);
  return { sukses: true, pesan: "Info event tersimpan." };
}

/** Alihkan penanggung jawab kantor pesanan ini (D-175); kosong = belum ada. */
export async function ubahPenanggungJawab(idEvent: string, idUser: string): Promise<void> {
  const { e } = await eventSaya(idEvent);
  let pj: bigint | null = null;
  if (idUser) {
    if (!/^\d+$/.test(idUser)) throw new Error("Orang tidak dikenal.");
    const u = await prisma.users.findFirst({ where: { id: BigInt(idUser), is_active: true, role: { in: [...PERAN_PENANGGUNG_JAWAB] } }, select: { id: true } });
    if (!u) throw new Error("Hanya akun kantor yang aktif yang bisa jadi penanggung jawab.");
    pj = u.id;
  }
  await prisma.events.update({ where: { id: e.id }, data: { pic_user_id: pj, updated_at: new Date() } });
  revalidatePath(`/event/${idEvent}`);
  revalidatePath("/event");
}

/* ---------- Penugasan tim & armada (D-051) ---------- */

async function kloterSaya(idKloter: string) {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(idKloter)) throw new Error("Kloter tidak dikenal.");
  const k = await prisma.event_kloters.findFirst({ where: { id: BigInt(idKloter), events: eventMiliknya(sesi) }, select: { id: true, event_id: true } });
  if (!k) throw new Error("Kloter tidak ditemukan.");
  return k;
}

/** `idProgram`: kloter antar Ikut Menu Pesta (D-117) — menumpang event induk, tanggal = tanggal kirim program. */
export async function tambahKloter(idEvent: string, isian: { tanggal: string; jam: string; catatan: string }, idProgram?: string): Promise<void> {
  const { e } = await eventSaya(idEvent);
  let program: bigint | null = null;
  if (idProgram) {
    const p = /^\d+$/.test(idProgram) ? await prisma.retail_programs.findUnique({ where: { id: BigInt(idProgram) }, select: { id: true, event_id: true, status: true, delivery_date: true } }) : null;
    if (!p || p.event_id !== e.id) throw new Error("Program tidak ditemukan.");
    if (p.status !== "disetujui") throw new Error("Program belum disetujui.");
    program = p.id;
    isian = { ...isian, tanggal: p.delivery_date.toISOString().slice(0, 10) };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isian.tanggal)) throw new Error("Pilih tanggalnya.");
  const jam = isian.jam.trim().replace(":", ".");
  if (!/^\d{1,2}\.\d{2}$/.test(jam)) throw new Error("Jam berangkat mis. 05.00.");
  const tanggal = new Date(`${isian.tanggal}T00:00:00Z`);
  const terakhir = await prisma.event_kloters.aggregate({ where: { event_id: e.id, date: tanggal }, _max: { no: true } });
  await prisma.event_kloters.create({
    data: { event_id: e.id, program_id: program, date: tanggal, no: (terakhir._max.no ?? 0) + 1, depart_time: jam.padStart(5, "0"), note: isian.catatan.trim().slice(0, 1000) || null },
  });
  revalidatePath(`/event/${idEvent}`);
  if (program) revalidatePath(`/ikut-menu-pesta/${program}`);
}

export async function hapusKloter(idKloter: string): Promise<void> {
  const k = await kloterSaya(idKloter);
  // Honor yang sudah dikirim/dikunci/dibayar adalah biaya event — jangan hilang bersama kloternya (D-091).
  if (await prisma.event_assignments.count({ where: { kloter_id: k.id, honor_status: { not: null } } })) {
    throw new Error("Absen/honor kloter ini sudah dikirim ke Finance — kloter tidak bisa dihapus.");
  }
  await prisma.event_kloters.delete({ where: { id: k.id } });
  revalidatePath(`/event/${k.event_id}`);
  revalidatePath("/ikut-menu-pesta", "layout");
}

export async function tambahAnggota(
  idKloter: string,
  isian: { userId: string | null; nama: string; peran: string; kendaraanId: string | null; tugas: string },
): Promise<void> {
  const k = await kloterSaya(idKloter);
  if (!Object.hasOwn(PERAN_TUGAS, isian.peran)) throw new Error("Pilih perannya.");
  const nama = isian.nama.trim().slice(0, 100);
  if (!isian.userId && !nama) throw new Error("Pilih orang dari daftar atau tulis nama DW.");
  if (isian.userId && !/^\d+$/.test(isian.userId)) throw new Error("Orang tidak dikenal.");
  if (isian.kendaraanId && !/^\d+$/.test(isian.kendaraanId)) throw new Error("Kendaraan tidak dikenal.");
  const urut = await prisma.event_assignments.count({ where: { kloter_id: k.id } });
  await prisma.event_assignments.create({
    data: {
      kloter_id: k.id,
      user_id: isian.userId ? BigInt(isian.userId) : null,
      person_name: isian.userId ? null : nama,
      role: isian.peran,
      vehicle_id: isian.kendaraanId ? BigInt(isian.kendaraanId) : null,
      task_note: isian.tugas.trim().slice(0, 255) || null,
      sort: urut,
    },
  });
  revalidatePath("/ikut-menu-pesta", "layout");
  // Push ke orangnya (D-096) — hanya akun, DW tanpa akun tidak punya HP terdaftar.
  if (isian.userId) {
    const kl = await prisma.event_kloters.findUnique({ where: { id: k.id }, select: { date: true, depart_time: true, events: { select: { name: true } }, retail_programs: { select: { id: true } } } });
    if (kl) kirimNanti([BigInt(isian.userId)], pesanDitugaskan({ event: kl.retail_programs ? "Antar Ikut Menu Pesta" : kl.events.name, tanggal: kl.date.toISOString().slice(0, 10), jam: kl.depart_time, peran: PERAN_TUGAS[isian.peran as keyof typeof PERAN_TUGAS] }));
  }
  revalidatePath(`/event/${k.event_id}`);
}

/**
 * Salin tim kloter lain ke kloter ini (Mbak Ari: tim loading set-up H-1 & service hari H biasanya orang yang sama).
 * Hanya nama, peran, kendaraan, tugas — absen/honor tidak ikut. Anggota yang sudah ada tidak diduplikasi.
 */
export async function salinTim(idKloter: string, dariKloter: string): Promise<number> {
  const k = await kloterSaya(idKloter);
  const asal = await kloterSaya(dariKloter);
  if (asal.event_id !== k.event_id) throw new Error("Kloter asal bukan dari acara ini.");
  const [sumber, ada] = await Promise.all([
    prisma.event_assignments.findMany({ where: { kloter_id: asal.id }, orderBy: { sort: "asc" } }),
    prisma.event_assignments.findMany({ where: { kloter_id: k.id }, select: { user_id: true, person_name: true } }),
  ]);
  const kunci = (a: { user_id: bigint | null; person_name: string | null }) => (a.user_id ? `u${a.user_id}` : `n${(a.person_name ?? "").trim().toLowerCase()}`);
  const sudah = new Set(ada.map(kunci));
  const baru = sumber.filter((a) => !sudah.has(kunci(a)));
  await prisma.event_assignments.createMany({
    data: baru.map((a, n) => ({
      kloter_id: k.id,
      user_id: a.user_id,
      person_name: a.person_name,
      role: a.role,
      vehicle_id: a.vehicle_id,
      task_note: a.task_note,
      sort: ada.length + n,
    })),
  });
  revalidatePath(`/event/${k.event_id}`);
  return baru.length;
}

export async function hapusAnggota(idAnggota: string): Promise<void> {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(idAnggota)) throw new Error("Anggota tidak dikenal.");
  const a = await prisma.event_assignments.findFirst({
    where: { id: BigInt(idAnggota), event_kloters: { events: eventMiliknya(sesi) } },
    select: { id: true, honor_status: true, event_kloters: { select: { event_id: true } } },
  });
  if (!a) throw new Error("Anggota tidak ditemukan.");
  if (a.honor_status) throw new Error("Absen/honor anggota ini sudah dikirim ke Finance — tidak bisa dihapus.");
  await prisma.event_assignments.delete({ where: { id: a.id } });
  revalidatePath(`/event/${a.event_kloters.event_id}`);
  revalidatePath("/ikut-menu-pesta", "layout");
}

/* ---------- Tugaskan driver dari Pengiriman (docs/25 #6) ---------- */

/**
 * Satu tekan dari Pengiriman: (buat jadwal kirim bila order belum punya event) → kloter 1 di tanggal kirim
 * (dibuat / jamnya disesuaikan) → driver di kloter itu (diganti bila belum dikirim ke Finance) + pesan khusus.
 * Driver ber-akun mendapat notifikasi di HP. Mengembalikan id event.
 */
export async function tugaskanDriver(isian: {
  idEvent?: string;
  idQuotation?: string;
  userId: string | null;
  nama: string;
  kendaraanId: string | null;
  jam: string;
  pesan: string;
}): Promise<string> {
  const sesi = await bolehUbah();
  const nama = isian.nama.trim().slice(0, 100);
  if (!isian.userId && !nama) throw new Error("Pilih driver atau tulis namanya.");
  if (isian.userId && !/^\d+$/.test(isian.userId)) throw new Error("Driver tidak dikenal.");
  if (isian.kendaraanId && !/^\d+$/.test(isian.kendaraanId)) throw new Error("Kendaraan tidak dikenal.");
  const jam = isian.jam.trim().replace(":", ".");
  if (!/^\d{1,2}\.\d{2}$/.test(jam)) throw new Error("Isi jam berangkat, mis. 09.00.");

  let idEvent: bigint;
  if (isian.idEvent) {
    idEvent = (await eventSaya(isian.idEvent)).e.id;
  } else {
    if (!isian.idQuotation || !/^\d+$/.test(isian.idQuotation)) throw new Error("Order tidak dikenal.");
    const q = await prisma.quotations.findFirst({
      where: { id: BigInt(isian.idQuotation), ...hanyaMiliknya(sesi) },
      select: { id: true, status: true, created_by: true, events: { select: { id: true } } },
    });
    if (!q) throw new Error("Order tidak ditemukan.");
    if (q.status !== "approved") throw new Error("Order belum disetujui customer.");
    idEvent = q.events?.id ?? (await simpanEventBaru(q.id, BigInt(sesi.id), q.created_by ?? BigInt(sesi.id)));
  }
  const e = await prisma.events.findUnique({ where: { id: idEvent }, select: { id: true, name: true, first_date: true } });
  if (!e?.first_date) throw new Error("Tanggal kirim belum diisi di order ini — lengkapi dulu tanggalnya.");

  const kloter =
    (await prisma.event_kloters.findFirst({ where: { event_id: e.id, date: e.first_date, program_id: null }, orderBy: { no: "asc" } })) ??
    (await prisma.event_kloters.create({ data: { event_id: e.id, date: e.first_date, no: 1, depart_time: jam.padStart(5, "0") } }));
  if (kloter.depart_time !== jam.padStart(5, "0"))
    await prisma.event_kloters.update({ where: { id: kloter.id }, data: { depart_time: jam.padStart(5, "0") } });
  const data = {
    user_id: isian.userId ? BigInt(isian.userId) : null,
    person_name: isian.userId ? null : nama,
    vehicle_id: isian.kendaraanId ? BigInt(isian.kendaraanId) : null,
    task_note: isian.pesan.trim().slice(0, 255) || null,
  };
  const lama = await prisma.event_assignments.findFirst({ where: { kloter_id: kloter.id, role: "driver", honor_status: null }, orderBy: { sort: "asc" } });
  if (lama) await prisma.event_assignments.update({ where: { id: lama.id }, data });
  else
    await prisma.event_assignments.create({
      data: { ...data, kloter_id: kloter.id, role: "driver", sort: await prisma.event_assignments.count({ where: { kloter_id: kloter.id } }) },
    });
  if (isian.userId && isian.userId !== lama?.user_id?.toString())
    kirimNanti([BigInt(isian.userId)], pesanDitugaskan({ event: e.name, tanggal: e.first_date.toISOString().slice(0, 10), jam: jam.padStart(5, "0"), peran: PERAN_TUGAS.driver }));
  revalidatePath("/pengiriman");
  revalidatePath(`/event/${e.id}`);
  return e.id.toString();
}

/* ---------- Pembatalan & refund (S&K Bag. X, D-102) ---------- */

const hariIniWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const tanggalSah = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak sah.");

/**
 * Batalkan event: hitungan refund dibekukan saat itu. Nominal hanya boleh
 * diubah Finance/owner, dengan catatan (S&K VI.7 vs X belum diputuskan owner).
 */
export async function batalkanEvent(
  id: string,
  isian: { tanggal: string; pihak: string; alasan: string; nominal: number | null; catatanNominal: string },
): Promise<void> {
  const { sesi, e } = await eventSaya(id);
  if (e.status === "batal") throw new Error("Event ini sudah dibatalkan.");
  const alasan = bacaAlasanPembatalan(isian.alasan);
  if (!alasan.ok) throw new Error(alasan.pesan);
  const tanggal = tanggalSah.parse(isian.tanggal);
  if (tanggal > hariIniWib()) throw new Error("Tanggal batal tidak boleh di masa depan.");
  if (isian.pihak !== "klien" && isian.pihak !== "force_majeure") throw new Error("Pilih siapa yang membatalkan.");
  if (!e.first_date) throw new Error("Tanggal acara belum diisi — isi dulu di quotation/invoice supaya refund bisa dihitung.");
  const dibayar = await dibayarEvent(e);
  const h = hitungRefund({ tanggalAcara: e.first_date.toISOString().slice(0, 10), tanggalBatal: tanggal, dibayar, aturan: (await bacaPengaturanBisnis()).pembatalan });
  let nominal = h.refund;
  let catatan: string | null = null;
  if (isian.nominal !== null && isian.nominal !== h.refund) {
    if (!bolehKelolaUang(sesi.peran)) throw new Error("Nominal refund hanya bisa diubah Finance atau owner.");
    nominal = z.number().int("Nominal harus rupiah bulat.").min(0).max(dibayar, "Refund tidak boleh melebihi yang sudah dibayar.").parse(isian.nominal);
    catatan = isian.catatanNominal.trim().slice(0, 500);
    if (catatan.length < 5) throw new Error("Tulis alasan nominal refund diubah.");
  }
  await prisma.$transaction([
    prisma.event_cancellations.create({
      data: {
        event_id: e.id,
        cancelled_on: new Date(`${tanggal}T00:00:00Z`),
        party: isian.pihak,
        reason: alasan.alasan,
        previous_status: e.status,
        days_before: h.hari,
        paid_amount: dibayar,
        refund_pct: h.pct,
        refund_computed: h.refund,
        refund_amount: nominal,
        amount_note: catatan,
        credit_valid_until: new Date(`${h.berlakuSampai}T00:00:00Z`),
        // Tidak ada uang yang perlu dikembalikan = tidak menunggu Finance.
        status: nominal > 0 ? "menunggu" : "deposit",
        created_by: BigInt(sesi.id),
      },
    }),
    prisma.events.update({ where: { id: e.id }, data: { status: "batal", updated_at: new Date() } }),
  ]);
  if (nominal > 0) kirimNanti(["finance"], pesanRefundMenunggu(e.name, nominal, e.id.toString()));
  revalidatePath("/event");
  revalidatePath(`/event/${id}`);
  redirect(`/event/${id}`);
}

/** Salah batal: kembalikan status lama, selama Finance belum menutup refund-nya. */
export async function urungkanPembatalan(id: string): Promise<void> {
  const { e } = await eventSaya(id);
  const b = await prisma.event_cancellations.findUnique({ where: { event_id: e.id } });
  if (!b) throw new Error("Event ini tidak dibatalkan.");
  if (b.status === "ditransfer") throw new Error("Refund sudah ditransfer — pembatalan tidak bisa diurungkan.");
  await prisma.$transaction([
    prisma.event_cancellations.delete({ where: { id: b.id } }),
    prisma.events.update({ where: { id: e.id }, data: { status: b.previous_status, updated_at: new Date() } }),
  ]);
  revalidatePath("/event");
  revalidatePath(`/event/${id}`);
}

/** Finance menutup refund: ditransfer ke klien, atau dijadikan deposit pesanan lain. */
export async function selesaikanRefund(id: string, cara: string, tanggal: string, catatan: string): Promise<void> {
  const { sesi, e } = await eventSaya(id);
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang menutup refund.");
  if (cara !== "ditransfer" && cara !== "deposit") throw new Error("Pilih: ditransfer atau deposit.");
  const tgl = tanggalSah.parse(tanggal);
  const { count } = await prisma.event_cancellations.updateMany({
    where: { event_id: e.id, status: "menunggu" },
    data: { status: cara, settled_on: new Date(`${tgl}T00:00:00Z`), settle_note: catatan.trim().slice(0, 500) || null, settled_by: BigInt(sesi.id) },
  });
  if (!count) throw new Error("Refund ini sudah ditutup. Muat ulang halaman.");
  revalidatePath(`/event/${id}`);
}
