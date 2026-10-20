import "server-only";

import type { Prisma } from "@prisma/client";
import type { Decimal } from "decimal.js";

import type { Sesi } from "./auth";
import { hargaDariNota } from "./hitung/stok";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";

/**
 * Harga bahan yang berlaku (baris ingredient_prices terbaru per bahan).
 *
 * SATU-SATUNYA jalan membaca harga bahan, dan ia menolak sendiri bila
 * pemanggilnya tidak boleh melihat biaya (D-006) — halaman yang lupa
 * memeriksa peran tetap tidak bisa membocorkannya ke dapur atau gudang.
 */
export async function hargaBahanTerkini(
  sesi: Sesi,
  idBahan?: bigint[],
): Promise<Map<bigint, { perSatuan: Decimal; perKemasan: Decimal | null }>> {
  if (!bolehLihatBiaya(sesi.peran)) {
    throw new Error("Peran ini tidak boleh melihat harga bahan.");
  }
  return hargaBahanSistem(idBahan);
}

/**
 * Versi TANPA gerbang peran — hanya untuk perhitungan di server yang
 * hasilnya tidak dikirim ke layar (mis. menilai untung saat quotation
 * disimpan). Halaman WAJIB memakai hargaBahanTerkini(sesi).
 */
export async function hargaBahanSistem(
  idBahan?: bigint[],
): Promise<Map<bigint, { perSatuan: Decimal; perKemasan: Decimal | null }>> {
  const baris = await prisma.ingredient_prices.findMany({
    where: idBahan ? { ingredient_id: { in: idBahan } } : undefined,
    distinct: ["ingredient_id"],
    orderBy: [{ ingredient_id: "asc" }, { effective_at: "desc" }, { id: "desc" }],
    select: { ingredient_id: true, price_per_usage_unit: true, price_per_pack: true },
  });
  return new Map(
    baris.map((b) => [b.ingredient_id, { perSatuan: b.price_per_usage_unit, perKemasan: b.price_per_pack }]),
  );
}

/**
 * Harga bahan dari nota pasar / penerimaan PO (D-094), di dalam transaksi
 * pencatatan notanya: setiap baris bertaut bahan yang satuannya pasti →
 * baris harga baru (source 'pembelian', tanggal nota). HPP menu otomatis ikut
 * karena pembaca harga mengambil baris terbaru. Satuan tidak pasti / harga 0
 * dilewati. Nota dibatalkan → baris harganya dihapus (purchase_item_id).
 */
export async function catatHargaDariNota(tx: Prisma.TransactionClient, purchaseId: bigint, tanggal: Date, oleh: bigint): Promise<void> {
  const baris = await tx.purchase_items.findMany({
    where: { purchase_id: purchaseId, ingredient_id: { not: null } },
    select: { id: true, unit: true, unit_price: true, ingredient_id: true, purchases: { select: { purchase_number: true } }, ingredients: { select: { purchase_unit: true, usage_unit: true, usage_qty_per_pack: true } } },
  });
  const data = baris.flatMap((b) => {
    const h = b.ingredients ? hargaDariNota(b.unit_price, b.unit, b.ingredients) : null;
    return h
      ? [{ ingredient_id: b.ingredient_id!, price_per_usage_unit: h.perSatuan, price_per_pack: h.perKemasan, source: "pembelian", source_note: b.purchases.purchase_number, effective_at: tanggal, purchase_item_id: b.id, created_by: oleh, created_at: new Date() }]
      : [];
  });
  if (data.length) await tx.ingredient_prices.createMany({ data });
}
