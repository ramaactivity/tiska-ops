import "server-only";

import type { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";

import { keSatuanStok } from "./hitung/stok";
import { prisma } from "./prisma";

/* ==========================================================================
   BUKU STOK (D-087) — satu-satunya penulis mutasi "masuk" dari nota dan
   pembaca saldo. Halaman stok, Kebutuhan Bahan, dan PR memakai saldo yang sama.
   ========================================================================== */

/**
 * Baris nota/penerimaan yang tertaut bahan → mutasi "masuk" (di dalam transaksi
 * pencatatan notanya). Baris yang satuannya tidak bisa dikonversi dengan pasti
 * dilewati dan muncul di "Belum masuk stok" — tidak ditebak.
 */
export async function stokMasukDariNota(tx: Prisma.TransactionClient, purchaseId: bigint, tanggal: Date, oleh: bigint): Promise<void> {
  const baris = await tx.purchase_items.findMany({
    where: { purchase_id: purchaseId, ingredient_id: { not: null } },
    select: { id: true, qty: true, unit: true, ingredient_id: true, ingredients: { select: { purchase_unit: true, usage_unit: true, usage_qty_per_pack: true } } },
  });
  const data = baris.flatMap((b) => {
    const qty = b.ingredients ? keSatuanStok(b.qty, b.unit, b.ingredients) : null;
    return qty && !qty.isZero()
      ? [{ ingredient_id: b.ingredient_id!, kind: "masuk", qty: qty.toDecimalPlaces(3), moved_at: tanggal, purchase_item_id: b.id, created_by: oleh }]
      : [];
  });
  if (data.length) await tx.stock_movements.createMany({ data });
}

/** Saldo stok per bahan (satuan stok). Tanpa id = semua bahan yang pernah bermutasi. */
export async function saldoStok(idBahan?: bigint[]): Promise<Map<string, Decimal>> {
  const r = await prisma.stock_movements.groupBy({
    by: ["ingredient_id"],
    where: idBahan ? { ingredient_id: { in: idBahan } } : undefined,
    _sum: { qty: true },
  });
  return new Map(r.map((x) => [x.ingredient_id.toString(), new Decimal((x._sum.qty ?? 0).toString())]));
}

/**
 * Pengingat opname (D-088): sejak tanggal 1, opname bulan ini belum final →
 * banner di Stok & Dashboard owner/Finance. null = sudah final.
 */
export async function pengingatOpname(): Promise<{ periode: string; status: string | null; id: string | null } | null> {
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const periode = `${hariIni.slice(0, 7)}-01`;
  const o = await prisma.stock_counts.findUnique({ where: { period: new Date(`${periode}T00:00:00Z`) }, select: { id: true, status: true } });
  if (o?.status === "final") return null;
  return { periode, status: o?.status ?? null, id: o?.id.toString() ?? null };
}
