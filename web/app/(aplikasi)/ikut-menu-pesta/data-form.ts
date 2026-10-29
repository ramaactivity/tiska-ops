import "server-only";

import { menuAcara } from "@/lib/ikut-menu-pesta";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";
import { prisma } from "@/lib/prisma";

/** Pilihan menu untuk form program: menu acara induk + seluruh master menu aktif (tanpa harga). */
export async function dataForm(idEvent: bigint) {
  const [acara, semua] = await Promise.all([
    menuAcara(idEvent),
    prisma.menus.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, category: true } }),
  ]);
  return {
    menuAcara: acara,
    menuLain: semua.map((m) => ({ id: m.id.toString(), nama: m.name, kategori: m.category, label: KATEGORI_MENU[m.category as KategoriMenu] ?? null })),
  };
}
