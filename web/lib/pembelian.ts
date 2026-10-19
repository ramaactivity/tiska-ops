import "server-only";

import { prisma } from "./prisma";

/**
 * Barang PR yang sudah ditangani: sudah ada di nota/penerimaan yang tercatat,
 * atau sudah dipesan lewat PO yang tidak batal (D-081, D-083). Dipakai form
 * belanja pasar DAN PO baru — barang yang sama tidak dibeli dua kali.
 */
export async function barangPrSudahDitangani(): Promise<Set<string>> {
  const [dibeli, dipesan] = await Promise.all([
    prisma.purchase_items.findMany({
      where: { pr_item_id: { not: null }, purchases: { status: "posted", pr_id: { not: null } } },
      select: { pr_item_id: true },
    }),
    prisma.purchase_order_items.findMany({
      where: { pr_item_id: { not: null }, purchase_orders: { status: { not: "batal" } } },
      select: { pr_item_id: true },
    }),
  ]);
  return new Set([...dibeli, ...dipesan].map((b) => b.pr_item_id!.toString()));
}
