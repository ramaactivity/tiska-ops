import "server-only";

import type { Decimal } from "decimal.js";

import type { Sesi } from "./auth";
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
