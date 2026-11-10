import { afterAll, describe, expect, it } from "vitest";

import { sinkronBiayaPr } from "../lib/biaya-pr";
import { sinkronBiayaSewa } from "../lib/biaya-sewa";
import { sinkronStokKeluar } from "../lib/biaya-stok";
import { hargaBahanSistem } from "../lib/harga-bahan";
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
  it("Biaya Sewa langsung jadi biaya nyata di Margin; dibatalkan → barisnya hilang (D-147)", async () => {
    const inv = await prisma.invoices.findFirst({
      where: { quotation_id: { not: null }, OR: [{ invoice_margins: null }, { invoice_margins: { status: { not: "final" } } }] },
      orderBy: { id: "desc" },
      select: { id: true, quotation_id: true, customer_id: true },
    });
    const user = await prisma.users.findFirst({ select: { id: true } });
    if (!inv || !user) throw new Error("Butuh minimal satu invoice ber-quotation dan satu user di database.");

    const hasil: Record<string, unknown> = {};
    await prisma
      .$transaction(async (tx) => {
        const e = await tx.events.create({ data: { quotation_id: inv.quotation_id!, invoice_id: inv.id, customer_id: inv.customer_id, name: "UJI SEWA" } });
        const s = await tx.rental_costs.create({ data: { event_id: e.id, kind: "kendaraan", vendor: "Rental Uji", paid_at: new Date(), amount: 750_000, created_by: user.id } });
        await sinkronBiayaSewa(tx, s.id, user.id);
        hasil.baris = (await tx.invoice_costs.findMany({ where: { rental_cost_id: s.id } })).map((b) => [b.category, b.description, Number(b.actual_amount), b.status, b.source]);
        const semua = await tx.invoice_costs.findMany({ where: { invoice_id: inv.id } });
        const nilai = semua.reduce((t, b) => t + (Number(b.actual_amount ?? 0) > 0 ? Number(b.actual_amount) : Number(b.estimated_amount ?? 0)), 0);
        hasil.marginCocok = Number((await tx.invoice_margins.findUnique({ where: { invoice_id: inv.id } }))!.total_cost) === nilai;
        await tx.rental_costs.update({ where: { id: s.id }, data: { status: "batal" } });
        await sinkronBiayaSewa(tx, s.id, user.id);
        hasil.sesudahBatal = await tx.invoice_costs.count({ where: { rental_cost_id: s.id } });
        throw new Batal();
      })
      .catch((e) => {
        if (!(e instanceof Batal)) throw e;
      });

    expect(hasil.baris).toEqual([["transportasi", "Sewa kendaraan · Rental Uji", 750_000, "aktual", "sewa"]]);
    expect(hasil.marginCocok).toBe(true);
    expect(hasil.sesudahBatal).toBe(0);
  });
  it("barang keluar gudang & bahan PR yang diambil dari stok jadi biaya Margin event (D-148)", async () => {
    const inv = await prisma.invoices.findFirst({
      where: { quotation_id: { not: null }, OR: [{ invoice_margins: null }, { invoice_margins: { status: { not: "final" } } }] },
      orderBy: { id: "desc" },
      select: { id: true, quotation_id: true, customer_id: true },
    });
    const user = await prisma.users.findFirst({ select: { id: true } });
    const berharga = await prisma.ingredient_prices.findFirst({ where: { price_per_usage_unit: { gt: 0 } }, select: { ingredient_id: true } });
    if (!inv || !user || !berharga) throw new Error("Butuh invoice ber-quotation, user, dan satu bahan berharga di database.");
    const harga = (await hargaBahanSistem([berharga.ingredient_id])).get(berharga.ingredient_id)!.perSatuan.toNumber();

    const hasil: Record<string, unknown> = {};
    await prisma
      .$transaction(async (tx) => {
        const e = await tx.events.create({ data: { quotation_id: inv.quotation_id!, invoice_id: inv.id, customer_id: inv.customer_id, name: "UJI STOK" } });
        await tx.stock_movements.create({ data: { ingredient_id: berharga.ingredient_id, kind: "keluar", qty: -2.5, moved_at: new Date(), event_id: e.id, unit_cost: 1000 } });
        await tx.stock_movements.create({ data: { ingredient_id: berharga.ingredient_id, kind: "keluar", qty: -1, moved_at: new Date(), event_id: e.id, unit_cost: null } });
        await sinkronStokKeluar(tx, e.id, user.id);
        hasil.keluar = (await tx.invoice_costs.findMany({ where: { event_id: e.id, source: "stok_keluar" } })).map((b) => [Number(b.actual_amount), b.notes]);

        const pr = await tx.purchase_requests.create({
          data: {
            pr_number: `UJI-STOK-PR-${Date.now()}`,
            need_date: new Date(),
            event_ids: [e.id],
            status: "disetujui",
            purchase_request_items: { create: [{ ingredient_id: berharga.ingredient_id, item_name: "Dari stok", qty_to_buy: 0, qty_from_stock: 10, est_price: 0 }] },
          },
        });
        await sinkronBiayaPr(tx, pr.id, user.id);
        hasil.dariStok = (await tx.invoice_costs.findMany({ where: { pr_id: pr.id } })).map((b) => [b.description.endsWith("Bahan dari stok gudang"), Number(b.estimated_amount), Number(b.actual_amount)]);
        throw new Batal();
      })
      .catch((e) => {
        if (!(e instanceof Batal)) throw e;
      });

    expect(hasil.keluar).toEqual([[2500, "1 barang belum punya harga beli — belum terhitung."]]);
    const nilai = Math.round(10 * harga);
    expect(hasil.dariStok).toEqual([[true, nilai, nilai]]);
  });
});
