import "server-only";

import type { Prisma } from "@prisma/client";

import { hariIniWib } from "./kalender";
import { prisma } from "./prisma";

/* ==========================================================================
   EVENT DUMMY (D-138, D-140) — empat order tes tetap (customer TES-00…TES-03)
   yang dengan satu tombol kembali ke keadaan awal DAN pindah ke kemarin / hari
   ini / besok / lusa, supaya tes end to end selalu mulai dari nol.

   Geser = semua kolom tanggal milik order itu (quotation, invoice, payment,
   event, kloter, tim, tracking, lead, penagihan, Ikut Menu Pesta) maju/mundur
   N hari yang sama, jadi urutan & jaraknya tetap utuh. Status tidak diubah.
   ========================================================================== */

export const EVENT_DUMMY = [
  { kode: "TES-00", geser: -1, label: "Kemarin" },
  { kode: "TES-01", geser: 0, label: "Hari ini" },
  { kode: "TES-02", geser: 1, label: "Besok" },
  { kode: "TES-03", geser: 2, label: "Lusa" },
] as const;
export const KODE_DUMMY = EVENT_DUMMY.map((d) => d.kode);

// [tabel, kolom date, kolom timestamp, penyaring baris milik customer $1]
const Q = "quotation_id in (select id from quotations where customer_id = $1)";
const I = "invoice_id in (select id from invoices where customer_id = $1)";
const E = "event_id in (select id from events where customer_id = $1)";
const K = "kloter_id in (select k.id from event_kloters k join events e on e.id = k.event_id where e.customer_id = $1)";
const C = "customer_id = $1";
const KOLOM: [string, string[], string[], string][] = [
  ["quotations", ["quotation_date", "valid_until", "event_date"], ["owner_approved_at", "client_approved_at", "cancelled_at"], C],
  ["quotation_event_dates", ["event_date"], [], Q],
  ["quotation_items", ["session_date"], [], Q],
  ["invoices", ["invoice_date", "due_date", "event_date"], ["revised_at", "cancelled_at"], C],
  ["invoice_event_dates", ["event_date"], [], I],
  ["invoice_items", ["session_date"], [], I],
  ["invoice_margins", [], ["finalized_at"], I],
  ["partner_fees", ["paid_at"], [], I],
  ["payments", ["payment_date"], ["receipt_stamped_at"], C],
  ["events", ["first_date"], ["lock_at", "recap_submitted_at", "recap_approved_at", "recap_locked_at"], C],
  ["event_items", ["session_date"], [], E],
  ["event_kloters", ["date"], [], E],
  ["event_equipment", [], ["out_at", "back_at"], E],
  ["event_cancellations", ["cancelled_on", "credit_valid_until", "settled_on"], [], E],
  ["basts", [], ["signed_at"], E],
  ["event_assignments", ["paid_at"], ["confirmed_at", "submitted_at", "locked_at"], K],
  ["kloter_tracking", [], ["at"], K],
  ["leads", ["event_date", "next_followup_at"], [], C],
  ["collection_activities", ["promise_date"], [], C],
  ["retail_programs", ["delivery_date"], ["order_deadline", "proposed_at", "decided_at"], E],
  ["retail_orders", [], ["area_decided_at", "delivered_at", "confirmed_at", "transfer_proof_at"], `${K} or ${I}`],
];
const SQL_GESER = KOLOM.map(([t, tgl, waktu, di]) => {
  const set = [...tgl.map((c) => `"${c}" = "${c}" + $2::int`), ...waktu.map((c) => `"${c}" = "${c}" + make_interval(days => $2::int)`)];
  return `update "${t}" set ${set.join(", ")} where ${di}`;
});

const hariKe = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export type BarisDummy = { kode: string; label: string; target: string; customer: string | null; idEvent: string | null; tanggal: string | null };
type Tx = Prisma.TransactionClient;

async function bacaDummy(db: Tx): Promise<BarisDummy[]> {
  const hariIni = hariIniWib();
  const c = await db.customers.findMany({
    where: { customer_code: { in: KODE_DUMMY }, is_test: true },
    select: { customer_code: true, name: true, events: { orderBy: { id: "asc" }, take: 1, select: { id: true, first_date: true } } },
  });
  return EVENT_DUMMY.map((d) => {
    const x = c.find((y) => y.customer_code === d.kode);
    const e = x?.events[0];
    return { kode: d.kode, label: d.label, target: hariKe(hariIni, d.geser), customer: x?.name ?? null, idEvent: e ? e.id.toString() : null, tanggal: e?.first_date?.toISOString().slice(0, 10) ?? null };
  });
}

export async function daftarEventDummy(): Promise<{ baris: BarisDummy[]; titikAwal: string | null }> {
  const [baris, f] = await Promise.all([bacaDummy(prisma), prisma.test_fixtures.findUnique({ where: { kode: KUNCI_TITIK_AWAL }, select: { created_at: true } })]);
  return { baris, titikAwal: f ? f.created_at.toISOString() : null };
}

/** Geser tiap order dummy ke tanggal sasarannya. Mengembalikan jumlah order yang digeser. */
async function geser(tx: Tx): Promise<number> {
  const daftar = (await bacaDummy(tx)).filter((d) => d.tanggal && d.tanggal !== d.target);
  for (const d of daftar) {
    const { id } = await tx.customers.findFirstOrThrow({ where: { customer_code: d.kode, is_test: true }, select: { id: true } });
    const selisih = Math.round((Date.parse(d.target) - Date.parse(d.tanggal!)) / 86_400_000);
    for (const sql of SQL_GESER) await tx.$executeRawUnsafe(sql, id, selisih);
  }
  return daftar.length;
}

/* --------------------------------------------------------------------------
   TITIK AWAL & RESET (D-140). "Semua yang menyangkut dummy" dicari dari peta
   foreign key database sendiri (bukan daftar tabel tulisan tangan): mulai dari
   4 customer, lalu setiap baris di tabel mana pun yang merujuk baris yang sudah
   terkumpul, berulang sampai habis. Jadi tabel baru di masa depan ikut otomatis.
   Reset = hapus semua itu (anak dulu) → masukkan lagi potret titik awal
   (induk dulu, kolom yang masih ada saja; kolom baru memakai nilai bawaannya)
   → geser tanggal. Satu transaksi: gagal di tengah = tidak ada yang berubah.
   -------------------------------------------------------------------------- */

const KUNCI_TITIK_AWAL = "event-dummy";
type Potret = { tabel: string; baris: Record<string, unknown>[] }[];

async function petaDb(tx: Tx) {
  const fk = await tx.$queryRawUnsafe<{ anak: string; kolom: string; induk: string; kolom_induk: string }[]>(`
    select c.conrelid::regclass::text anak, a.attname kolom, c.confrelid::regclass::text induk, af.attname kolom_induk
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace`);
  const pk = await tx.$queryRawUnsafe<{ t: string; kolom: string[] }[]>(`
    select i.indrelid::regclass::text t, array_agg(a.attname::text order by a.attnum) kolom
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indisprimary and i.indrelid::regclass::text not like '%.%' group by 1`);
  return { fk, pk: new Map(pk.map((x) => [x.t, x.kolom])) };
}

const q = (t: string) => `"${t.replace(/"/g, "")}"`;

/** Semua baris yang (langsung/tidak langsung) merujuk customer dummy, urut induk → anak. */
async function kumpulkan(tx: Tx): Promise<Potret> {
  const { fk, pk } = await petaDb(tx);
  const kunci = (t: string, r: Record<string, unknown>) => (pk.get(t) ?? Object.keys(r)).map((k) => String(r[k])).join("|");
  const data = new Map<string, Map<string, Record<string, unknown>>>();
  const tambah = (t: string, rows: Record<string, unknown>[]) => {
    const m = data.get(t) ?? new Map();
    data.set(t, m);
    const baru = rows.filter((r) => !m.has(kunci(t, r)));
    for (const r of baru) m.set(kunci(t, r), r);
    return baru;
  };
  const awal = await tx.$queryRawUnsafe<{ r: Record<string, unknown> }[]>(`select to_jsonb(t) r from customers t where is_test and customer_code = any($1::text[])`, KODE_DUMMY);
  let antrian: [string, Record<string, unknown>[]][] = [["customers", tambah("customers", awal.map((x) => x.r))]];
  for (let putaran = 0; antrian.length && putaran < 30; putaran++) {
    const berikut: [string, Record<string, unknown>[]][] = [];
    for (const [t, rows] of antrian) {
      for (const f of fk.filter((x) => x.induk === t)) {
        const nilai = [...new Set(rows.map((r) => r[f.kolom_induk]).filter((v) => v != null).map(String))];
        if (!nilai.length) continue;
        const anak = await tx.$queryRawUnsafe<{ r: Record<string, unknown> }[]>(`select to_jsonb(t) r from ${q(f.anak)} t where ${q(f.kolom)}::text = any($1::text[])`, nilai);
        const baru = tambah(f.anak, anak.map((x) => x.r));
        if (baru.length) berikut.push([f.anak, baru]);
      }
    }
    antrian = berikut;
  }
  // Urut induk → anak (Kahn) di antara tabel yang terkumpul; rujukan ke diri sendiri diabaikan
  // (satu INSERT/DELETE banyak baris memeriksa FK di akhir pernyataan).
  const tabel = [...data.keys()];
  const sisa = new Set(tabel);
  const urut: string[] = [];
  while (sisa.size) {
    const siap = [...sisa].filter((t) => !fk.some((f) => f.anak === t && f.induk !== t && sisa.has(f.induk)));
    if (!siap.length) throw new Error(`Rujukan melingkar antar tabel: ${[...sisa].join(", ")}`);
    for (const t of siap) { urut.push(t); sisa.delete(t); }
  }
  return urut.map((t) => ({ tabel: t, baris: [...data.get(t)!.values()] }));
}

/** Simpan keadaan dummy sekarang sebagai titik awal reset. */
export async function simpanTitikAwal(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const p = await kumpulkan(tx);
    await tx.test_fixtures.upsert({ where: { kode: KUNCI_TITIK_AWAL }, create: { kode: KUNCI_TITIK_AWAL, data: p as never }, update: { data: p as never, created_at: new Date() } });
    return p.reduce((n, x) => n + x.baris.length, 0);
  }, { timeout: 60_000 });
}

/** Kembalikan dummy ke titik awal, lalu pindahkan ke kemarin / hari ini / besok / lusa. */
export async function resetEventDummy(): Promise<{ dihapus: number; dipulihkan: number }> {
  return prisma.$transaction(async (tx) => {
    const f = await tx.test_fixtures.findUnique({ where: { kode: KUNCI_TITIK_AWAL } });
    if (!f) throw new Error("Titik awal belum disimpan.");
    const potret = f.data as unknown as Potret;
    const { pk } = await petaDb(tx);
    const sekarang = await kumpulkan(tx);
    let dihapus = 0;
    for (const { tabel, baris } of [...sekarang].reverse()) {
      const kolom = pk.get(tabel);
      if (!kolom) throw new Error(`Tabel ${tabel} tidak punya primary key.`);
      const kunci = baris.map((r) => kolom.map((k) => String(r[k])).join("|"));
      dihapus += await tx.$executeRawUnsafe(`delete from ${q(tabel)} where concat_ws('|', ${kolom.map((k) => `${q(k)}::text`).join(", ")}) = any($1::text[])`, kunci);
    }
    let dipulihkan = 0;
    for (const { tabel, baris } of potret) {
      if (!baris.length) continue;
      const ada = new Set((await tx.$queryRawUnsafe<{ c: string }[]>(`select column_name c from information_schema.columns where table_schema = 'public' and table_name = $1`, tabel)).map((x) => x.c));
      const kolom = Object.keys(baris[0]).filter((k) => ada.has(k)).map(q).join(", ");
      dipulihkan += await tx.$executeRawUnsafe(`insert into ${q(tabel)} (${kolom}) select ${kolom} from jsonb_populate_recordset(null::${q(tabel)}, $1::jsonb)`, JSON.stringify(baris));
    }
    await geser(tx);
    return { dihapus, dipulihkan };
  }, { timeout: 60_000 });
}
