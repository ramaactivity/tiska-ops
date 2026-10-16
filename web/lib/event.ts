import "server-only";

import type { ItemEvent } from "./hitung/event";
import { prisma } from "./prisma";

const tgl = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);

type BarisSumber = {
  item_name: string;
  qty: { toString(): string };
  unit: string | null;
  pax: number | null;
  day: { toString(): string };
  price: { toString(): string };
  charge_service: boolean;
  session_date: Date | null;
  session_label: string | null;
  session_time: string | null;
  anak: { item_name: string; qty: { toString(): string }; unit: string | null; pax: number | null; day: { toString(): string }; price: { toString(): string } }[];
};

/** Baris induk → item event; isi paket (sub-item tanpa harga) jadi daftar menu, sub-item berharga jadi item sendiri. */
function susun(baris: BarisSumber[]): { items: ItemEvent[]; adaBuffet: boolean } {
  const items: ItemEvent[] = [];
  for (const b of baris) {
    const sesi = { session_date: tgl(b.session_date), session_label: b.session_label, session_time: b.session_time };
    items.push({
      ...sesi,
      item_name: b.item_name,
      qty: b.qty.toString(),
      unit: b.unit,
      pax: b.pax,
      day: b.day.toString(),
      contents: b.anak.filter((a) => Number(a.price) <= 0).map((a) => a.item_name),
    });
    for (const a of b.anak.filter((x) => Number(x.price) > 0)) {
      items.push({ ...sesi, item_name: a.item_name, qty: a.qty.toString(), unit: a.unit, pax: a.pax, day: a.day.toString(), contents: [] });
    }
  }
  return { items, adaBuffet: baris.some((b) => b.charge_service && Number(b.price) > 0) };
}

const PILIH_BARIS = {
  item_name: true,
  qty: true,
  unit: true,
  pax: true,
  day: true,
  price: true,
  charge_service: true,
  session_date: true,
  session_label: true,
  session_time: true,
} as const;
const PILIH_ANAK = { item_name: true, qty: true, unit: true, pax: true, day: true, price: true } as const;

/**
 * Isi pesanan terbaru untuk event: dari INVOICE bila sudah ada (invoice masih
 * boleh direvisi sesudah quotation disetujui), selain itu dari quotation.
 */
export async function isiPesananEvent(idQuotation: bigint) {
  const q = await prisma.quotations.findUniqueOrThrow({
    where: { id: idQuotation },
    select: {
      customer_id: true,
      event_type: true,
      venue: true,
      guest_count: true,
      contact_person: true,
      contact_phone: true,
      fnb_planner: true,
      quotation_event_dates: { orderBy: { event_date: "asc" }, select: { event_date: true } },
      quotation_items: {
        where: { parent_id: null },
        orderBy: { id: "asc" },
        select: { ...PILIH_BARIS, other_quotation_items: { orderBy: { id: "asc" }, select: PILIH_ANAK } },
      },
      invoices: {
        orderBy: { id: "desc" },
        take: 1,
        select: {
          id: true,
          invoice_event_dates: { orderBy: { event_date: "asc" }, select: { event_date: true } },
          invoice_items: {
            where: { parent_id: null },
            orderBy: { id: "asc" },
            select: { ...PILIH_BARIS, other_invoice_items: { orderBy: { id: "asc" }, select: PILIH_ANAK } },
          },
        },
      },
    },
  });
  const inv = q.invoices[0];
  const { items, adaBuffet } = inv
    ? susun(inv.invoice_items.map((b) => ({ ...b, anak: b.other_invoice_items })))
    : susun(q.quotation_items.map((b) => ({ ...b, anak: b.other_quotation_items })));
  const tanggal = (inv?.invoice_event_dates.length ? inv.invoice_event_dates : q.quotation_event_dates).map((t) => tgl(t.event_date)!);
  const tanggalSesi = items.map((i) => i.session_date).filter((x): x is string => Boolean(x));
  const pertama = [...tanggal, ...tanggalSesi].sort()[0] ?? null;
  return { q, invoiceId: inv?.id ?? null, items, adaBuffet, pertama };
}

/** Baris event_items siap tulis. */
export function barisEvent(idEvent: bigint, items: ItemEvent[]) {
  return items.map((i, n) => ({
    event_id: idEvent,
    session_date: i.session_date ? new Date(`${i.session_date}T00:00:00Z`) : null,
    session_label: i.session_label,
    session_time: i.session_time,
    item_name: i.item_name,
    qty: i.qty,
    unit: i.unit,
    pax: i.pax,
    day: i.day,
    contents: i.contents.join("\n") || null,
    sort: n,
  }));
}

/** event_items di DB → ItemEvent (untuk membandingkan saat diperbarui). */
export function itemDariDb(
  rows: { session_date: Date | null; session_label: string | null; session_time: string | null; item_name: string; qty: { toString(): string }; unit: string | null; pax: number | null; day: { toString(): string }; contents: string | null }[],
): ItemEvent[] {
  return rows.map((r) => ({
    session_date: tgl(r.session_date),
    session_label: r.session_label,
    session_time: r.session_time,
    item_name: r.item_name,
    qty: r.qty.toString(),
    unit: r.unit,
    pax: r.pax,
    day: r.day.toString(),
    contents: r.contents ? r.contents.split("\n") : [],
  }));
}
