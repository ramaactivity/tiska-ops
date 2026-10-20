import "server-only";

import { barangKloter } from "./delivery-order";
import { prisma } from "./prisma";
import { teksJumlahBaris } from "./uang";

/* ==========================================================================
   BAST — BERITA ACARA SERAH TERIMA per kloter (06-DOKUMEN §7, D-103).
   Barangnya = barang Delivery Order kloter itu (satu sumber), tanpa harga.
   ========================================================================== */

export type BarangBast = { nama: string; jumlah: string; isi: string[] };

export async function kloterBast(idKloter: bigint) {
  const k = await prisma.event_kloters.findUnique({
    where: { id: idKloter },
    include: {
      events: { select: { id: true, name: true, first_date: true, customers: { select: { name: true } }, event_items: { orderBy: { sort: "asc" } } } },
      basts: { select: { id: true, bast_number: true } },
    },
  });
  if (!k) return null;
  const iso = (t: Date | null) => t?.toISOString().slice(0, 10);
  const diTanggal = k.events.event_items.filter((i) => (iso(i.session_date) ?? iso(k.events.first_date)) === iso(k.date));
  const barang: BarangBast[] = barangKloter(diTanggal, k.depart_time).map((i) => ({
    nama: i.item_name,
    jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
    isi: i.contents ? i.contents.split("\n") : [],
  }));
  return { k, barang };
}
