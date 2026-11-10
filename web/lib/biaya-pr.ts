import "server-only";

import type { Prisma } from "@prisma/client";

import { Decimal } from "decimal.js";

import { labelKategori } from "./biaya";
import { hargaBahanSistem } from "./harga-bahan";
import { biayaRabPerEvent } from "./hitung/biaya-pr";
import { hitungUlangMargin } from "./margin";

/**
 * Tulis ulang baris biaya Margin dari satu PR (D-146): estimasi RAB + realisasi nota,
 * per kategori, ke invoice tiap event PR itu (source 'rab', pr_id). Dipanggil setiap
 * status PR atau notanya berubah, di dalam transaksi yang sama.
 *
 * Margin yang sudah difinalisasi tidak disentuh (angka yang dikunci tidak boleh
 * berubah diam-diam); halaman PR menampilkan invoice mana yang terlewati.
 */
export async function sinkronBiayaPr(tx: Prisma.TransactionClient, prId: bigint, oleh: bigint): Promise<void> {
  const pr = await tx.purchase_requests.findUnique({
    where: { id: prId },
    select: {
      pr_number: true,
      status: true,
      event_ids: true,
      purchase_request_items: { select: { cost_category: true, qty_to_buy: true, est_price: true, ingredient_id: true, qty_from_stock: true } },
      purchases: {
        where: { status: "posted" },
        select: { purchase_items: { select: { total: true, purchase_request_items: { select: { cost_category: true } } } } },
      },
    },
  });
  if (!pr) return;

  const [event, lama] = await Promise.all([
    tx.events.findMany({ where: { id: { in: pr.event_ids }, invoice_id: { not: null } }, select: { invoice_id: true } }),
    tx.invoice_costs.findMany({ where: { pr_id: prId }, select: { invoice_id: true }, distinct: ["invoice_id"] }),
  ]);
  const semua = [...new Set([...event.map((e) => e.invoice_id!), ...lama.map((l) => l.invoice_id)].map(String))].map(BigInt);
  const final = new Set(
    (await tx.invoice_margins.findMany({ where: { invoice_id: { in: semua }, status: "final" }, select: { invoice_id: true } })).map((m) => m.invoice_id.toString()),
  );
  const boleh = (id: bigint) => !final.has(id.toString());

  // Bagian kebutuhan yang diambil dari stok (satuan pakai = satuan stok, D-087) × harga beli terakhir per satuan pakai (D-148).
  const dariStok = pr.purchase_request_items.filter((b) => b.ingredient_id && b.qty_from_stock && b.qty_from_stock.gt(0));
  const harga = dariStok.length ? await hargaBahanSistem(dariStok.map((b) => b.ingredient_id!), tx) : new Map();
  const nilaiDariStok = dariStok.reduce((s, b) => s.plus(b.qty_from_stock!.times(harga.get(b.ingredient_id!)?.perSatuan ?? 0)), new Decimal(0));

  const biaya = biayaRabPerEvent({
    nilaiDariStok,
    status: pr.status,
    jumlahEvent: pr.event_ids.length,
    baris: pr.purchase_request_items.map((b) => ({ kategori: b.cost_category, qty: b.qty_to_buy, harga: b.est_price })),
    nota: pr.purchases.flatMap((n) => n.purchase_items.map((i) => ({ kategori: i.purchase_request_items?.cost_category ?? null, total: i.total }))),
  });
  const dibagi = pr.event_ids.length > 1 ? ` (dibagi rata ${pr.event_ids.length} event)` : "";
  const sekarang = new Date();

  await tx.invoice_costs.deleteMany({ where: { pr_id: prId, invoice_id: { notIn: [...final].map(BigInt) } } });
  const data = event
    .map((e) => e.invoice_id!)
    .filter(boleh)
    .flatMap((invoice_id) =>
      biaya.map((b) => ({
        invoice_id,
        pr_id: prId,
        source: "rab",
        category: b.kategori,
        description: `RAB ${pr.pr_number} · ${b.dariStok ? "Bahan dari stok gudang" : labelKategori(b.kategori)}${dibagi}`,
        estimated_amount: b.estimasi,
        actual_amount: b.realisasi,
        status: b.realisasi ? "aktual" : "estimasi",
        created_by: oleh,
        created_at: sekarang,
        updated_at: sekarang,
      })),
    );
  if (data.length) await tx.invoice_costs.createMany({ data });
  for (const id of semua.filter(boleh)) await hitungUlangMargin(id, tx);
}
