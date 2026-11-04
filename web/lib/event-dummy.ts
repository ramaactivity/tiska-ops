import "server-only";

import { hariIniWib } from "./kalender";
import { prisma } from "./prisma";

/* ==========================================================================
   EVENT DUMMY (D-138) — empat order tes tetap (customer TES-00…TES-03) yang
   tanggalnya bisa digeser ke kemarin / hari ini / besok / lusa dengan satu
   tombol, supaya tes end to end tidak perlu membuat order baru tiap hari.

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

export async function daftarEventDummy(): Promise<BarisDummy[]> {
  const hariIni = hariIniWib();
  const c = await prisma.customers.findMany({
    where: { customer_code: { in: KODE_DUMMY }, is_test: true },
    select: { customer_code: true, name: true, events: { orderBy: { id: "asc" }, take: 1, select: { id: true, first_date: true } } },
  });
  return EVENT_DUMMY.map((d) => {
    const x = c.find((y) => y.customer_code === d.kode);
    const e = x?.events[0];
    return { kode: d.kode, label: d.label, target: hariKe(hariIni, d.geser), customer: x?.name ?? null, idEvent: e ? e.id.toString() : null, tanggal: e?.first_date?.toISOString().slice(0, 10) ?? null };
  });
}

/** Geser tiap order dummy ke tanggal sasarannya. Mengembalikan jumlah order yang digeser. */
export async function geserEventDummy(): Promise<number> {
  const daftar = (await daftarEventDummy()).filter((d) => d.tanggal && d.tanggal !== d.target);
  if (!daftar.length) return 0;
  const id = await prisma.customers.findMany({ where: { customer_code: { in: daftar.map((d) => d.kode) }, is_test: true }, select: { id: true, customer_code: true } });
  await prisma.$transaction(
    async (tx) => {
      for (const d of daftar) {
        const cid = id.find((x) => x.customer_code === d.kode)!.id;
        const selisih = Math.round((Date.parse(d.target) - Date.parse(d.tanggal!)) / 86_400_000);
        for (const sql of SQL_GESER) await tx.$executeRawUnsafe(sql, cid, selisih);
      }
    },
    { timeout: 30_000 },
  );
  return daftar.length;
}
