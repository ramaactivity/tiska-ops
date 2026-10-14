import "server-only";

import { Decimal } from "decimal.js";

import type { Sesi } from "./auth";
import { hargaBahanTerkini } from "./harga-bahan";
import { hitungHpp } from "./hitung/hpp";
import { bacaPengaturanBisnis } from "./pengaturan";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";

export type BiayaItem = {
  /** HPP per porsi yang dipakai. */
  hpp: Decimal | null;
  /** "resep" = HPP resep × faktor porsi (ikut harga bahan terbaru); "file" = angka file HPP paket. */
  sumber: "resep" | "file";
  hppFile: Decimal | null;
};

/**
 * Biaya paket: HPP tiap item dan biaya kemasan (D-032, D-033).
 *
 * SATU-SATUNYA jalan membaca biaya paket; menolak sendiri bila pemanggil tidak
 * boleh melihat biaya (D-006). Item yang menunya terhubung resep — dan semua
 * bahan resepnya sudah berharga — memakai HPP resep × faktor porsi, jadi ikut
 * berubah bila harga bahan berubah. Selain itu memakai angka file (snapshot).
 */
export async function biayaPaket(
  sesi: Sesi,
  idPaket: bigint[],
): Promise<Map<bigint, { kemasan: Decimal | null; item: Map<bigint, BiayaItem> }>> {
  if (!bolehLihatBiaya(sesi.peran)) throw new Error("Peran ini tidak boleh melihat biaya paket.");

  const paket = await prisma.packages.findMany({
    where: { id: { in: idPaket } },
    select: {
      id: true,
      service_forms: { select: { packaging_cost: true } },
      package_items: {
        select: { id: true, hpp_snapshot: true, menus: { select: { recipe_id: true, portion_factor: true } } },
      },
    },
  });

  const idResep = [...new Set(paket.flatMap((p) => p.package_items.map((i) => i.menus.recipe_id)).filter((x): x is bigint => x !== null))];
  const hppResep = new Map<bigint, Decimal>();
  if (idResep.length) {
    const resep = await prisma.recipes.findMany({
      where: { id: { in: idResep } },
      select: { id: true, portions_per_batch: true, recipe_lines: { select: { qty_per_batch: true, ingredient_id: true } } },
    });
    const harga = await hargaBahanTerkini(sesi, [...new Set(resep.flatMap((r) => r.recipe_lines.map((l) => l.ingredient_id)))]);
    const atur = await bacaPengaturanBisnis();
    for (const r of resep) {
      const h = hitungHpp({
        baris: r.recipe_lines.map((l) => ({ qty: l.qty_per_batch, harga: harga.get(l.ingredient_id)?.perSatuan ?? null })),
        porsi: r.portions_per_batch,
        overheadPct: atur.overhead_pct,
        targetFoodCostPct: atur.target_food_cost_pct,
      });
      // Resep dengan bahan tanpa harga menghasilkan HPP terlalu rendah — jangan dipakai.
      if (h.hppPerPorsi && h.hargaKosong === 0) hppResep.set(r.id, h.hppPerPorsi);
    }
  }

  return new Map(
    paket.map((p) => [
      p.id,
      {
        kemasan: p.service_forms?.packaging_cost ? new Decimal(p.service_forms.packaging_cost.toString()) : null,
        item: new Map(
          p.package_items.map((i): [bigint, BiayaItem] => {
            const dariResep = i.menus.recipe_id ? hppResep.get(i.menus.recipe_id) : undefined;
            const file = i.hpp_snapshot ? new Decimal(i.hpp_snapshot.toString()) : null;
            return dariResep
              ? [i.id, { hpp: dariResep.times(i.menus.portion_factor.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP), sumber: "resep", hppFile: file }]
              : [i.id, { hpp: file, sumber: "file", hppFile: file }];
          }),
        ),
      },
    ]),
  );
}
