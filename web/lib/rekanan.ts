import "server-only";

import type { Prisma } from "@prisma/client";

import { feeInvoice, JENIS_REKANAN, type JenisRekanan, type StatusPartnerFee, statusPartnerFee } from "./hitung/rekanan";
import { bacaPengaturanBisnis } from "./pengaturan";
import { prisma } from "./prisma";

/* Rekanan pembawa klien & Partner Fee (D-132). Rekanan sebuah order = invoice.partner_id, kosong → quotation-nya. */

export type OrderRekanan = {
  idInvoice: string;
  nomor: string;
  tanggal: string;
  acara: string | null;
  customer: { id: string; nama: string };
  rekanan: { id: string; nama: string };
  total: number;
  nilaiMakanan: number;
  fee: { pct: number; jumlah: number };
  status: StatusPartnerFee;
  dibayar: { id: string; tanggal: string; jumlah: number; bukti: boolean; oleh: string | null } | null;
};

/** Invoice (tidak batal) yang punya rekanan efektif, opsional disaring per rekanan / customer. */
export async function orderRekanan(saring: { idRekanan?: bigint; idCustomer?: bigint } = {}): Promise<OrderRekanan[]> {
  const punya: Prisma.invoicesWhereInput = saring.idRekanan
    ? { OR: [{ partner_id: saring.idRekanan }, { partner_id: null, quotations: { partner_id: saring.idRekanan } }] }
    : { OR: [{ partner_id: { not: null } }, { quotations: { partner_id: { not: null } } }] };
  const [inv, atur] = await Promise.all([
    prisma.invoices.findMany({
      where: { status: { not: "cancelled" }, ...(saring.idCustomer ? { customer_id: saring.idCustomer } : {}), ...punya },
      orderBy: [{ invoice_date: "desc" }, { id: "desc" }],
      select: {
        id: true,
        invoice_number: true,
        invoice_date: true,
        event_type: true,
        status: true,
        subtotal: true,
        grand_total: true,
        customers: { select: { id: true, name: true } },
        referral_partners: { select: { id: true, name: true, fee_pct: true } },
        quotations: { select: { referral_partners: { select: { id: true, name: true, fee_pct: true } } } },
        partner_fees: { select: { id: true, paid_at: true, amount: true, pct: true, proof_path: true, users: { select: { name: true } } } },
      },
    }),
    bacaPengaturanBisnis(),
  ]);
  return inv.flatMap((x) => {
    const r = x.referral_partners ?? x.quotations?.referral_partners;
    if (!r) return [];
    const f = x.partner_fees;
    return [
      {
        idInvoice: x.id.toString(),
        nomor: x.invoice_number,
        tanggal: x.invoice_date.toISOString().slice(0, 10),
        acara: x.event_type,
        customer: { id: x.customers.id.toString(), nama: x.customers.name },
        rekanan: { id: r.id.toString(), nama: r.name },
        total: Number(x.grand_total),
        nilaiMakanan: Number(x.subtotal),
        fee: f ? { pct: Number(f.pct), jumlah: Number(f.amount) } : feeInvoice(x.subtotal, r.fee_pct, atur.partner_fee_pct),
        status: statusPartnerFee(x.status, Boolean(f)),
        dibayar: f ? { id: f.id.toString(), tanggal: f.paid_at.toISOString().slice(0, 10), jumlah: Number(f.amount), bukti: Boolean(f.proof_path), oleh: f.users?.name ?? null } : null,
      },
    ];
  });
}

export type StatistikRekanan = { klien: number; order: number; omzet: number; siap: number; jumlahSiap: number; menunggu: number; dibayar: number; terakhir: string | null };

/** Ringkasan per rekanan: klien (customer yang ditandai dibawa + customer di order-nya), order, omzet, Partner Fee. */
export function statistik(idRekanan: string, order: OrderRekanan[], klienDitandai: string[]): StatistikRekanan {
  const o = order.filter((x) => x.rekanan.id === idRekanan);
  const jumlah = (s: StatusPartnerFee) => o.filter((x) => x.status === s).reduce((n, x) => n + x.fee.jumlah, 0);
  return {
    klien: new Set([...klienDitandai, ...o.map((x) => x.customer.id)]).size,
    order: o.length,
    omzet: o.reduce((n, x) => n + x.total, 0),
    siap: jumlah("siap"),
    jumlahSiap: o.filter((x) => x.status === "siap").length,
    menunggu: jumlah("menunggu"),
    dibayar: jumlah("dibayar"),
    terakhir: o[0]?.tanggal ?? null,
  };
}

export async function opsiRekanan() {
  const r = await prisma.referral_partners.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } });
  return r.map((x) => ({ id: x.id.toString(), label: x.name, sub: JENIS_REKANAN[x.kind as JenisRekanan] ?? x.kind }));
}

/** Nama rekanan untuk kotak Rekanan di Quotation/Invoice (termasuk yang nonaktif). */
export async function namaRekanan(id: (bigint | null | undefined)[]): Promise<Map<string, string>> {
  const ada = id.filter((x): x is bigint => Boolean(x));
  if (!ada.length) return new Map();
  const r = await prisma.referral_partners.findMany({ where: { id: { in: ada } }, select: { id: true, name: true } });
  return new Map(r.map((x) => [x.id.toString(), x.name]));
}
