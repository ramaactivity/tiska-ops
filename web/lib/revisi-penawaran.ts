import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import type { SalinanPenawaran } from "./revisi";
import { labelSesi } from "./sesi";

type Klien = Prisma.TransactionClient | typeof prisma;

/** Salinan utuh satu quotation untuk riwayat revisi (tanpa HPP, D-042). */
export async function salinanPenawaran(klien: Klien, id: bigint): Promise<SalinanPenawaran> {
  const p = await klien.quotations.findUniqueOrThrow({
    where: { id },
    include: {
      quotation_event_dates: { orderBy: { event_date: "asc" }, select: { event_date: true } },
      quotation_charges: { orderBy: { id: "asc" }, select: { label: true, amount: true } },
      quotation_items: {
        where: { parent_id: null },
        orderBy: { id: "asc" },
        include: { other_quotation_items: { orderBy: { id: "asc" }, select: { item_name: true } } },
      },
    },
  });
  const tgl = (t: Date) => t.toISOString().slice(0, 10);
  return {
    nomor: p.quotation_number,
    tanggal: tgl(p.quotation_date),
    berlaku: tgl(p.valid_until),
    tanggalAcara: p.quotation_event_dates.map((t) => tgl(t.event_date)),
    tamu: p.guest_count,
    subtotal: p.subtotal.toString(),
    layanan: p.service_charge_amount.toString(),
    pajak: p.pb1_amount.toString(),
    ppn: p.ppn_amount.toString(),
    delivery: p.delivery_amount.toString(),
    total: p.grand_total.toString(),
    baris: p.quotation_items.map((b) => ({
      nama: b.item_name,
      hari: b.day.toString(),
      qty: b.qty.toString(),
      pax: b.pax,
      harga: b.price.toString(),
      nilai: b.subtotal.toString(),
      sesi: labelSesi({ tanggal: b.session_date, jenis: b.session_label, jam: b.session_time }),
      isi: b.other_quotation_items.map((a) => a.item_name),
    })),
    biaya: p.quotation_charges.map((c) => ({ label: c.label, nilai: c.amount.toString() })),
  };
}
