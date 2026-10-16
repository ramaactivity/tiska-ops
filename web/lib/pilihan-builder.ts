import "server-only";

import type { AturanZona, PilihanMenu, PilihanPaket } from "@/components/form-dokumen";

import { aturanLayanan, deliveryFeeBawaan } from "./hitung/quotation";
import { bacaPengaturanBisnis } from "./pengaturan";
import { prisma } from "./prisma";

const BENTUK_BOX = new Set(["box_reguler", "box_sedang", "box_premium", "snack_box"]);
const BENTUK_LAYANAN = new Set(["buffet", "stall", "plated"]);

/**
 * Pilihan "Tambah dari paket" untuk form quotation. Hanya nama, harga jual,
 * dan nama isi menu — TANPA HPP/biaya, karena form ini juga dipakai sales.
 */
export async function pilihanPaket(): Promise<PilihanPaket[]> {
  const daftar = await prisma.packages.findMany({
    where: { status: "aktif" },
    orderBy: [{ line: "asc" }, { id: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      line: true,
      price: true,
      service_forms: { select: { code: true } },
      package_items: { orderBy: { sort: "asc" }, select: { menus: { select: { id: true, name: true } } } },
    },
  });
  return daftar.map((p) => {
    const bentuk = p.service_forms?.code ?? "";
    return {
      id: p.id.toString(),
      kode: p.code,
      nama: p.name,
      lini: p.line,
      harga: p.price?.toString() ?? "0",
      satuan: BENTUK_BOX.has(bentuk) ? "box" : "pax",
      kenaLayanan: BENTUK_LAYANAN.has(bentuk),
      isi: p.package_items.map((i) => ({ id: i.menus.id.toString(), nama: i.menus.name })),
    };
  });
}

/** Menu aktif untuk "Tukar" isi paket — nama & kategori saja, tanpa HPP. */
export async function pilihanMenu(): Promise<PilihanMenu[]> {
  const daftar = await prisma.menus.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true },
  });
  return daftar.map((m) => ({ id: m.id.toString(), nama: m.name, kategori: m.category }));
}

/** Tombol zona di form: persen & minimum layanan + saran Delivery Fee dari Angka Bisnis. */
export async function aturanZona(): Promise<AturanZona[]> {
  const p = await bacaPengaturanBisnis();
  const zona = (kunci: string, label: string, z: "bogor" | "jabodetabek", setMenu: boolean): AturanZona => {
    const l = aturanLayanan(p, z, setMenu)!;
    return { kunci, label, pct: l.pct, min: l.min, delivery: deliveryFeeBawaan(p, z)?.toNumber() ?? null };
  };
  return [
    zona("bogor", "Bogor", "bogor", false),
    zona("jabodetabek", "Jabodetabek", "jabodetabek", false),
    zona("set-bogor", "Set menu Bogor", "bogor", true),
    zona("set-jabodetabek", "Set menu Jabodetabek", "jabodetabek", true),
  ];
}
