import "server-only";

import type { Prisma } from "@prisma/client";

import { pengakuanDokumen, ringkasPengakuan } from "@/lib/pengakuan";
import type { InvoiceRincian } from "@/lib/rincian-penjualan";
import { tanggalAcaraDokumen } from "@/lib/tanggal";
import { prisma } from "@/lib/prisma";
import type { SaringMilik } from "@/lib/rbac";
import { d, labelStatusInvoice } from "@/lib/uang";

/* ==========================================================================
   KUERI LAPORAN PENJUALAN

   Dipakai bersama oleh halaman, ekspor Excel, dan versi cetak. Kalau
   ketiganya punya kueri sendiri-sendiri, cepat atau lambat angkanya akan
   berbeda dan tidak ada yang tahu mana yang benar.
   ========================================================================== */

export type SaringLaporan = {
  dari: string;
  sampai: string;
  pelanggan: string;
};

export function bacaSaring(params: Record<string, string | string[] | undefined>): SaringLaporan {
  const ambil = (kunci: string) => {
    const nilai = params[kunci];
    return typeof nilai === "string" ? nilai.trim() : "";
  };
  return { dari: ambil("dari"), sampai: ambil("sampai"), pelanggan: ambil("customer") };
}

function kondisiTanggal(saring: SaringLaporan) {
  const rentang: { gte?: Date; lte?: Date } = {};
  if (saring.dari) rentang.gte = new Date(saring.dari);
  if (saring.sampai) rentang.lte = new Date(saring.sampai);
  return Object.keys(rentang).length > 0 ? rentang : undefined;
}

export async function ambilLaporan(saring: SaringLaporan, milik: SaringMilik) {
  const tanggal = kondisiTanggal(saring);
  const pelangganId = saring.pelanggan ? BigInt(saring.pelanggan) : undefined;

  const [tagihan, penawaran, daftarPelanggan] = await Promise.all([
    prisma.invoices.findMany({
      where: {
        ...milik,
        ...(tanggal ? { invoice_date: tanggal } : {}),
        ...(pelangganId ? { customer_id: pelangganId } : {}),
      },
      orderBy: { invoice_date: "desc" },
      select: {
        id: true,
        invoice_number: true,
        invoice_date: true,
        due_date: true,
        grand_total: true,
        paid_amount: true,
        status: true,
        event_type: true,
        customers: { select: { name: true } },

        // Rincian untuk penjurnalan. Kelimanya berjumlah tepat grand_total,
        // jadi barisnya bisa dicocokkan sendiri tanpa menebak sisanya.
        subtotal: true,
        service_charge_amount: true,
        pb1_amount: true,
        ppn_amount: true,
        delivery_amount: true,
        invoice_charges: { select: { amount: true } },

        // Tanggal bayar dan PPh 23 yang ditanggung invoice ini.
        payment_details: {
          select: {
            amount_applied: true,
            payments: {
              select: { payment_date: true, total_amount: true, pph23_amount: true },
            },
          },
        },
        // Kolom lamanya ikut diambil — lihat catatan di tanggalAcaraDokumen().
        event_date: true,
        event_days: true,
        invoice_event_dates: { select: { event_date: true } },
      },
    }),
    prisma.quotations.findMany({
      where: {
        ...milik,
        ...(tanggal ? { quotation_date: tanggal } : {}),
        ...(pelangganId ? { customer_id: pelangganId } : {}),
      },
      select: { status: true, grand_total: true },
    }),
    prisma.customers.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, customer_code: true, pic_name: true },
    }),
  ]);

  const aktif = tagihan.filter((t) => t.status !== "cancelled");

  // Penjualan diakui ketika ACARANYA sudah terjadi, bukan ketika invoicenya
  // terbit. Lihat catatan panjang di lib/pengakuan.ts.
  const pengakuan = ringkasPengakuan(
    aktif.map((t) => ({
      grand_total: t.grand_total,
      paid_amount: t.paid_amount,
      tanggalAcara: tanggalAcaraDokumen(t.invoice_event_dates, t.event_date, t.event_days),
    })),
  );

  const baris = tagihan.map((t) => {
    const tanggalAcara = tanggalAcaraDokumen(
      t.invoice_event_dates,
      t.event_date,
      t.event_days,
    );

    const biayaTambahan = t.invoice_charges.reduce((j, c) => j.plus(d(c.amount)), d(0));

    // PPh 23 yang ditanggung invoice ini. Satu setoran bisa menutup beberapa
    // invoice, jadi potongannya dibagi SEBANDING dengan alokasinya — bukan
    // dibebankan seluruhnya ke invoice pertama yang kebetulan ditemukan.
    const pph23 = t.payment_details.reduce((jumlah, r) => {
      const menutup = d(r.payments.total_amount).plus(d(r.payments.pph23_amount));
      if (menutup.lte(0)) return jumlah;
      return jumlah.plus(
        d(r.payments.pph23_amount).times(d(r.amount_applied)).dividedBy(menutup),
      );
    }, d(0));

    const tanggalBayar = t.payment_details.reduce<Date | null>(
      (akhir, r) =>
        akhir === null || r.payments.payment_date > akhir ? r.payments.payment_date : akhir,
      null,
    );

    return {
    id: t.id.toString(),
    nomor: t.invoice_number,
    tanggal: t.invoice_date,
    jatuhTempo: t.due_date,
    tanggalAcara,
    tanggalBayar,
    pelanggan: t.customers.name,
    acara: t.event_type ?? "",
    penjualan: t.subtotal.toString(),
    serviceCharge: t.service_charge_amount.toString(),
    pb1: t.pb1_amount.toString(),
    ppn: t.ppn_amount.toString(),
    delivery: t.delivery_amount.toString(),
    biayaTambahan: biayaTambahan.toString(),
    pph23: pph23.toFixed(2),
    total: t.grand_total.toString(),
    dibayar: t.paid_amount.toString(),
    sisa: d(t.grand_total).minus(d(t.paid_amount)).toString(),
    status: t.status,
    statusLabel: labelStatusInvoice(t.status, t.paid_amount.toString()),
    pengakuan: pengakuanDokumen({
      grand_total: t.grand_total,
      paid_amount: t.paid_amount,
      tanggalAcara,
    }).keadaan,
    };
  });

  return {
    baris,
    // Kode dan PIC ikut: di penyaring ini namanya berdiri sendiri, dan dua
    // customer bernama sama tidak bisa dibedakan sama sekali tanpa keduanya.
    pelanggan: daftarPelanggan.map((p) => ({
      id: p.id.toString(),
      nama: p.name,
      kode: p.customer_code,
      pic: p.pic_name,
    })),
    ringkasan: {
      jumlahPenawaran: penawaran.length,
      nilaiPenawaran: penawaran.reduce((j, q) => j.plus(d(q.grand_total)), d(0)),
      penawaranDisetujui: penawaran.filter((q) => q.status === "approved").length,

      jumlahTagihan: aktif.length,
      nilaiTagihan: aktif.reduce((j, t) => j.plus(d(t.grand_total)), d(0)),
      totalTerbayar: aktif.reduce((j, t) => j.plus(d(t.paid_amount)), d(0)),

      // Ketiganya selalu berjumlah sama dengan nilaiTagihan.
      penjualanDiakui: pengakuan.diakui,
      uangMuka: pengakuan.uangMuka,
      diterimaDiMuka: pengakuan.diterimaDiMuka,
      proyeksiPenjualan: pengakuan.proyeksi,

      totalPiutang: pengakuan.piutang,
      jumlahJatuhTempo: aktif.filter((t) => t.status === "overdue").length,
    },
  };
}

/**
 * Invoice lengkap dengan baris menunya, untuk lembar Rincian penjualan
 * (lib/rincian-penjualan.ts). Penyaring & hak aksesnya sama persis dengan
 * ambilLaporan(); invoice batal tidak ikut karena bukan penjualan.
 */
export async function ambilRincian(saring: SaringLaporan, milik: SaringMilik): Promise<InvoiceRincian[]> {
  const tanggal = kondisiTanggal(saring);
  const pelangganId = saring.pelanggan ? BigInt(saring.pelanggan) : undefined;

  const kolomItem = {
    item_name: true,
    qty: true,
    pax: true,
    day: true,
    price: true,
    is_compliment: true,
    charge_pb1: true,
    charge_ppn: true,
    kind: true,
    session_date: true,
  } as const;

  const tagihan = await prisma.invoices.findMany({
    where: {
      ...milik,
      status: { not: "cancelled" },
      ...(tanggal ? { invoice_date: tanggal } : {}),
      ...(pelangganId ? { customer_id: pelangganId } : {}),
    },
    orderBy: [{ invoice_date: "asc" }, { invoice_number: "asc" }],
    select: {
      invoice_number: true,
      invoice_date: true,
      notes: true,
      pb1_enabled: true,
      pb1_amount: true,
      ppn_amount: true,
      service_charge_amount: true,
      service_charge_label: true,
      delivery_amount: true,
      grand_total: true,
      customers: { select: { name: true } },
      event_date: true,
      event_days: true,
      invoice_event_dates: { select: { event_date: true } },
      invoice_charges: { orderBy: { id: "asc" }, select: { label: true, amount: true } },
      invoice_items: {
        where: { parent_id: null },
        orderBy: { id: "asc" },
        select: { ...kolomItem, other_invoice_items: { orderBy: { id: "asc" }, select: kolomItem } },
      },
    },
  });

  const item = (i: {
    item_name: string;
    qty: Prisma.Decimal;
    pax: number | null;
    day: Prisma.Decimal;
    price: Prisma.Decimal;
    is_compliment: boolean;
    charge_pb1: boolean;
    charge_ppn: boolean;
    kind: string | null;
    session_date: Date | null;
  }) => ({
    nama: i.item_name,
    qty: i.qty.toString(),
    pax: i.pax,
    day: i.day.toString(),
    price: i.price.toString(),
    isCompliment: i.is_compliment,
    chargePb1: i.charge_pb1,
    chargePpn: i.charge_ppn,
    kind: i.kind,
    sessionDate: i.session_date,
  });

  return tagihan.map((t) => ({
    nomor: t.invoice_number,
    tanggal: t.invoice_date,
    tanggalAcara: tanggalAcaraDokumen(t.invoice_event_dates, t.event_date, t.event_days),
    pelanggan: t.customers.name,
    catatan: t.notes,
    pb1Enabled: t.pb1_enabled,
    pb1: t.pb1_amount.toString(),
    ppn: t.ppn_amount.toString(),
    serviceCharge: t.service_charge_amount.toString(),
    serviceLabel: t.service_charge_label,
    delivery: t.delivery_amount.toString(),
    total: t.grand_total.toString(),
    biaya: t.invoice_charges.map((c) => ({ label: c.label, amount: c.amount.toString() })),
    items: t.invoice_items.map((i) => ({ ...item(i), anak: i.other_invoice_items.map(item) })),
  }));
}

/** Judul rentang untuk dicetak: "1 Sep 2026 – 30 Sep 2026" atau "Semua periode". */
export function judulPeriode(saring: SaringLaporan): string {
  if (!saring.dari && !saring.sampai) return "Semua periode";
  if (saring.dari && !saring.sampai) return `Sejak ${saring.dari}`;
  if (!saring.dari && saring.sampai) return `Sampai ${saring.sampai}`;
  return `${saring.dari} sampai ${saring.sampai}`;
}
