import type { Prisma } from "@prisma/client";

import type { DataProgres } from "./hitung/progres-event";

/**
 * Data yang dibutuhkan progres pesanan (D-171) — satu bentuk kueri untuk
 * daftar dan detail event, supaya keduanya membaca fakta yang sama.
 */
export const PILIH_PROGRES = {
  status: true,
  service_mode: true,
  first_date: true,
  lock_at: true,
  recap_status: true,
  quotations: { select: { invoices: { where: { status: { not: "cancelled" } }, select: { status: true, paid_amount: true } } } },
  // Kloter antar Ikut Menu Pesta bukan bagian acara klien ini (D-117).
  event_kloters: {
    where: { program_id: null },
    select: { _count: { select: { event_assignments: true } }, kloter_tracking: { where: { status: "selesai" }, select: { id: true }, take: 1 } },
  },
  _count: { select: { basts: true } },
} satisfies Prisma.eventsSelect;

export function dataProgres(e: Prisma.eventsGetPayload<{ select: typeof PILIH_PROGRES }>, sekarang = new Date()): DataProgres {
  return {
    status: e.status,
    caraLayanan: e.service_mode,
    tanggal: e.first_date ? e.first_date.toISOString().slice(0, 10) : null,
    invoice: e.quotations.invoices.map((i) => ({ status: i.status, dibayar: Number(i.paid_amount) })),
    terkunci: Boolean(e.lock_at && e.lock_at < sekarang),
    kloter: e.event_kloters.map((k) => ({ anggota: k._count.event_assignments, selesai: k.kloter_tracking.length > 0 })),
    jumlahBast: e._count.basts,
    rekap: e.recap_status,
  };
}

/** Tanggal hari ini menurut WIB, YYYY-MM-DD. */
export const hariIniWib = (sekarang = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(sekarang);
