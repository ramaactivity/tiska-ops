import "server-only";

import { buatPenentuMenu } from "./hitung/menu-dapur";
import { prisma } from "./prisma";

/**
 * Penentu menu dapur dari nama apa pun (D-122) — satu-satunya jalan semua
 * hitungan (Kebutuhan Bahan, PR, Layar Dapur, Ikut Menu Pesta, impor & paket)
 * mencocokkan nama di dokumen ke menu master. Aturannya di lib/hitung/menu-dapur.ts.
 */
export async function penentuMenu() {
  const [menu, namaLain] = await Promise.all([
    prisma.menus.findMany({ select: { id: true, name: true, active: true, recipe_id: true, merged_into: true } }),
    prisma.menu_aliases.findMany({ select: { menu_id: true, name: true } }),
  ]);
  const cari = buatPenentuMenu(
    menu.map((m) => ({ id: m.id.toString(), name: m.name, active: m.active, adaResep: m.recipe_id !== null, mergedInto: m.merged_into?.toString() ?? null })),
    namaLain.map((a) => ({ menuId: a.menu_id.toString(), name: a.name })),
  );
  const nama = new Map(menu.map((m) => [m.id.toString(), m.name]));
  return { cari, nama };
}
