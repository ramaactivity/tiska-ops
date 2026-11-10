import { afterAll, describe, expect, it } from "vitest";

import { sinkronBiayaPr } from "../lib/biaya-pr";
import { prisma } from "../lib/prisma";

/* ==========================================================================
   RAB (PR) → BIAYA MARGIN, DI DATABASE SUNGGUHAN (D-146)

   Semua dikerjakan di dalam satu transaksi yang dibatalkan di akhir: event,
   PR, dan nota sementara dibuat di invoice nyata, sinkronisasi dijalankan,
   lalu baris biaya & ringkasan margin dibaca ulang. Tidak ada yang tersisa.
   ========================================================================== */

afterAll(async () => {
  await prisma.$disconnect();
});

class Batal extends Error {}

describe("sinkronBiayaPr", () => {
  it("estimasi masuk saat diajukan, realisasi ikut nota, hilang saat PR batal; PR stok tidak masuk margin", async () => {
    const inv = await prisma.invoices.findFirst({
      where: { quotation_id: { not: null }, OR: [{ invoice_margins: null }, { invoice_margins: { status: { not: "final" } } }] },
      orderBy: { id: "desc" },
      select: { id: true, quotation_id: true, customer_id: true, grand_total: true },
    });
    const user = await prisma.users.findFirst({ select: { id: true } });
    if (!inv || !user) throw new Error("Butuh minimal satu invoice ber-quotation dan satu user di database.");
    const quotationBebas = !(await prisma.events.findUnique({ where: { quotation_id: inv.quotation_id! } }));
    expect(quotationBebas, "quotation invoice uji sudah punya event — pilih invoice lain").toBe(true);

    const hasil: Record<string, unknown> = {};
    await prisma
      .$transaction(async (tx) => {
        const biayaLain = await tx.invoice_costs.count({ where: { invoice_id: inv.id } });
        const e = await tx.events.create({ data: { quotation_id: inv.quotation_id!, invoice_id: inv.id, customer_id: inv.customer_id, name: "UJI RAB" } });
        const pr = await tx.purchase_requests.create({
          data: {
            pr_number: `UJI-RAB-${Date.now()}`,
            need_date: new Date(),
            event_ids: [e.id],
            status: "diajukan",
            purchase_request_items: {
              create: [
                { item_name: "Ayam", qty_to_buy: 2, est_price: 50_000, cost_category: "hpp_bahan_baku" },
                { item_name: "BBM", qty_to_buy: 1, est_price: 100_000, cost_category: "bbm" },
              ],
            },
          },
          include: { purchase_request_items: true },
        });
        await sinkronBiayaPr(tx, pr.id, user.id);
        const est = await tx.invoice_costs.findMany({ where: { pr_id: pr.id }, orderBy: { category: "asc" } });
        hasil.estimasi = est.map((b) => [b.category, Number(b.estimated_amount), b.actual_amount, b.source, b.status]);

        const bbm = pr.purchase_request_items.find((b) => b.cost_category === "bbm")!;
        await tx.purchases.create({
          data: {
            purchase_number: `UJI-BLJ-${Date.now()}`,
            holder_user_id: user.id,
            pr_id: pr.id,
            purchased_at: new Date(),
            total: 120_000,
            no_receipt_reason: "uji otomatis",
            purchase_items: { create: [{ item_name: "BBM", pr_item_id: bbm.id, qty: 1, unit_price: 120_000, total: 120_000 }] },
          },
        });
        await sinkronBiayaPr(tx, pr.id, user.id);
        const real = await tx.invoice_costs.findMany({ where: { pr_id: pr.id }, orderBy: { category: "asc" } });
        hasil.realisasi = real.map((b) => [b.category, Number(b.estimated_amount), b.actual_amount == null ? null : Number(b.actual_amount), b.status]);
        const semua = await tx.invoice_costs.findMany({ where: { invoice_id: inv.id } });
        const nilai = semua.reduce((s, b) => s + (Number(b.actual_amount ?? 0) > 0 ? Number(b.actual_amount) : Number(b.estimated_amount ?? 0)), 0);
        hasil.marginCocok = Number((await tx.invoice_margins.findUnique({ where: { invoice_id: inv.id } }))!.total_cost) === nilai;

        // PR stok (tanpa event) tidak menulis apa pun.
        const stok = await tx.purchase_requests.create({
          data: { pr_number: `UJI-STOK-${Date.now()}`, need_date: new Date(), status: "disetujui", purchase_request_items: { create: [{ item_name: "Minyak", qty_to_buy: 1, est_price: 30_000 }] } },
        });
        await sinkronBiayaPr(tx, stok.id, user.id);
        hasil.stok = await tx.invoice_costs.count({ where: { pr_id: stok.id } });

        await tx.purchase_requests.update({ where: { id: pr.id }, data: { status: "batal" } });
        await sinkronBiayaPr(tx, pr.id, user.id);
        hasil.sesudahBatal = await tx.invoice_costs.count({ where: { pr_id: pr.id } });
        hasil.biayaLainUtuh = (await tx.invoice_costs.count({ where: { invoice_id: inv.id } })) === biayaLain;
        throw new Batal();
      })
      .catch((e) => {
        if (!(e instanceof Batal)) throw e;
      });

    expect(hasil.estimasi).toEqual([
      ["bbm", 100_000, null, "rab", "estimasi"],
      ["hpp_bahan_baku", 100_000, null, "rab", "estimasi"],
    ]);
    expect(hasil.realisasi).toEqual([
      ["bbm", 100_000, 120_000, "aktual"],
      ["hpp_bahan_baku", 100_000, null, "estimasi"],
    ]);
    expect(hasil.marginCocok).toBe(true);
    expect(hasil.stok).toBe(0);
    expect(hasil.sesudahBatal).toBe(0);
    expect(hasil.biayaLainUtuh).toBe(true);
  });
});
