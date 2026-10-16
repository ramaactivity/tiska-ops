import "server-only";

import { Decimal } from "decimal.js";

import type { Sesi } from "./auth";
import { hargaBahanSistem } from "./harga-bahan";
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
  menuId: bigint;
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
  return biayaPaketSistem(idPaket);
}

/**
 * Versi TANPA gerbang peran — hanya untuk perhitungan server yang hasilnya
 * tidak dikirim ke layar (menilai untung quotation saat disimpan). Halaman
 * WAJIB memakai biayaPaket(sesi, …).
 */
export async function biayaPaketSistem(
  idPaket: bigint[],
): Promise<Map<bigint, { kemasan: Decimal | null; item: Map<bigint, BiayaItem> }>> {
  const paket = await prisma.packages.findMany({
    where: { id: { in: idPaket } },
    select: {
      id: true,
      service_forms: { select: { packaging_cost: true } },
      package_items: {
        select: { id: true, menu_id: true, hpp_snapshot: true, menus: { select: { recipe_id: true, portion_factor: true } } },
      },
    },
  });

  const hppResep = await hppResepLengkap(paket.flatMap((p) => p.package_items.map((i) => i.menus.recipe_id)));

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
              ? [i.id, { hpp: dariResep.times(i.menus.portion_factor.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP), sumber: "resep", hppFile: file, menuId: i.menu_id }]
              : [i.id, { hpp: file, sumber: "file", hppFile: file, menuId: i.menu_id }];
          }),
        ),
      },
    ]),
  );
}

/** HPP per porsi resep yang SEMUA bahannya berharga (resep tak lengkap dilewati). */
async function hppResepLengkap(idResep: (bigint | null)[]): Promise<Map<bigint, Decimal>> {
  const id = [...new Set(idResep.filter((x): x is bigint => x !== null))];
  const hasil = new Map<bigint, Decimal>();
  if (!id.length) return hasil;
  const resep = await prisma.recipes.findMany({
    where: { id: { in: id } },
    select: { id: true, portions_per_batch: true, recipe_lines: { select: { qty_per_batch: true, ingredient_id: true } } },
  });
  const harga = await hargaBahanSistem([...new Set(resep.flatMap((r) => r.recipe_lines.map((l) => l.ingredient_id)))]);
  const atur = await bacaPengaturanBisnis();
  for (const r of resep) {
    const h = hitungHpp({
      baris: r.recipe_lines.map((l) => ({ qty: l.qty_per_batch, harga: harga.get(l.ingredient_id)?.perSatuan ?? null })),
      porsi: r.portions_per_batch,
      overheadPct: atur.overhead_pct,
      targetFoodCostPct: atur.target_food_cost_pct,
    });
    // Resep dengan bahan tanpa harga menghasilkan HPP terlalu rendah — jangan dipakai.
    if (h.hppPerPorsi && h.hargaKosong === 0) hasil.set(r.id, h.hppPerPorsi);
  }
  return hasil;
}

/**
 * HPP per porsi box sebuah MENU di luar konteks paket — untuk menu pengganti
 * saat isi paket ditukar (D-040). Aturan sama dengan item paket (D-033):
 * resep lengkap × faktor porsi; selain itu HPP file menu itu di paket mana
 * pun (snapshot pertama yang ada); tidak ada → null (tidak dinilai).
 * Tanpa gerbang peran — hanya untuk perhitungan server.
 */
export async function hppMenuSistem(idMenu: bigint[]): Promise<Map<bigint, Decimal | null>> {
  const menu = await prisma.menus.findMany({
    where: { id: { in: idMenu } },
    select: {
      id: true,
      recipe_id: true,
      portion_factor: true,
      package_items: { where: { hpp_snapshot: { not: null } }, orderBy: { id: "asc" }, take: 1, select: { hpp_snapshot: true } },
    },
  });
  const hppResep = await hppResepLengkap(menu.map((m) => m.recipe_id));
  return new Map(
    menu.map((m) => {
      const dariResep = m.recipe_id ? hppResep.get(m.recipe_id) : undefined;
      if (dariResep) return [m.id, dariResep.times(m.portion_factor.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)];
      const file = m.package_items[0]?.hpp_snapshot;
      return [m.id, file ? new Decimal(file.toString()) : null];
    }),
  );
}
