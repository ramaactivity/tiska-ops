import "server-only";

import { hapusBukti } from "@/lib/bukti-berkas";
import { prisma } from "@/lib/prisma";

/* ==========================================================================
   DATA TES (D-072)

   Customer bertanda `is_test` beserta SELURUH turunannya — quotation,
   invoice, payment, event (kloter, tim, status kirim), lead, catatan
   penagihan — bisa dihapus sekaligus. Data asli tidak tersentuh karena
   semuanya dipilih lewat customer_id customer bertanda.
   ========================================================================== */

export type RingkasanDataTes = {
  customer: { id: string; nama: string; kode: string }[];
  quotation: number;
  invoice: number;
  payment: number;
  event: number;
};

async function idTes(): Promise<bigint[]> {
  const c = await prisma.customers.findMany({ where: { is_test: true }, select: { id: true } });
  return c.map((x) => x.id);
}

export async function ringkasanDataTes(): Promise<RingkasanDataTes> {
  const customer = await prisma.customers.findMany({
    where: { is_test: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, customer_code: true },
  });
  const ids = customer.map((c) => c.id);
  const milik = { customer_id: { in: ids } };
  const [quotation, invoice, payment, event] = await Promise.all([
    prisma.quotations.count({ where: milik }),
    prisma.invoices.count({ where: milik }),
    prisma.payments.count({ where: milik }),
    prisma.events.count({ where: milik }),
  ]);
  return { customer: customer.map((c) => ({ id: c.id.toString(), nama: c.name, kode: c.customer_code })), quotation, invoice, payment, event };
}

/** Menghapus semua data tes dalam satu transaksi; berkas bukti dibersihkan sesudahnya. */
export async function hapusSemuaDataTes(): Promise<RingkasanDataTes> {
  const sebelum = await ringkasanDataTes();
  const ids = await idTes();
  if (!ids.length) return sebelum;
  const milik = { customer_id: { in: ids } };

  const berkas: string[] = [];
  await prisma.$transaction(
    async (tx) => {
      const [bayar, quo, foto] = await Promise.all([
        tx.payments.findMany({ where: milik, select: { transfer_proof: true } }),
        tx.quotations.findMany({ where: milik, select: { client_approval_proof: true } }),
        tx.kloter_tracking.findMany({ where: { event_kloters: { events: milik } }, select: { photo_path: true } }),
      ]);
      for (const x of [...bayar.map((b) => b.transfer_proof), ...quo.map((q) => q.client_approval_proof), ...foto.map((f) => f.photo_path)]) {
        if (x) berkas.push(x);
      }

      // Invoice pesanan Ikut Menu Pesta dari event tes milik pembeli lain — ikut terhapus (D-116).
      const retail = (await tx.retail_orders.findMany({ where: { retail_programs: { events: milik }, invoice_id: { not: null } }, select: { invoice_id: true } })).map((o) => o.invoice_id!);
      const invoice = [...(await tx.invoices.findMany({ where: milik, select: { id: true } })).map((i) => i.id), ...retail];
      // Urutan mengikuti foreign key: anak yang tidak ikut terhapus otomatis dihapus lebih dulu.
      await tx.payment_details.deleteMany({ where: { OR: [{ invoice_id: { in: invoice } }, { payments: milik }] } });
      await tx.payments.deleteMany({ where: milik });
      await tx.events.deleteMany({ where: milik }); // kloter, tim, status kirim, isi, perubahan ikut (cascade)
      await tx.invoices.deleteMany({ where: { OR: [milik, { id: { in: retail } }] } }); // rincian, biaya, tanggal, margin ikut (cascade)
      await tx.leads.deleteMany({ where: milik });
      await tx.quotations.deleteMany({ where: milik });
      await tx.customers.deleteMany({ where: { id: { in: ids } } }); // catatan penagihan ikut (cascade)
      // Kendaraan contoh untuk skenario demo, hanya bila tidak dipakai event lain.
      await tx.vehicles.deleteMany({ where: { name: { startsWith: "DEMO - " }, event_assignments: { none: {} } } });
    },
    { timeout: 30_000 },
  );
  await hapusBukti(berkas).catch(() => {});
  return sebelum;
}
