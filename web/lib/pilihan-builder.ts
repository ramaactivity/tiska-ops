import "server-only";

import type { AturanZona, PilihanAlat, PilihanMenu, PilihanPaket } from "@/components/form-dokumen";

import { aturanLayanan, deliveryFeeBawaan } from "./hitung/quotation";
import { bacaPengaturanBisnis } from "./pengaturan";
import { rapikanTeks } from "./cari-mirip";
import { prisma } from "./prisma";
import type { BagianSyarat } from "./syarat";

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
      unit: true,
      price_basis: true,
      service_forms: { select: { code: true } },
      package_items: { orderBy: { sort: "asc" }, select: { menus: { select: { id: true, name: true } } } },
      package_slots: {
        orderBy: { sort: "asc" },
        select: { label: true, pick: true, extra: true, note: true, package_slot_options: { orderBy: { sort: "asc" }, select: { name: true, extra_price: true } } },
      },
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
      satuan: p.unit || (BENTUK_BOX.has(bentuk) ? "box" : "pax"),
      kenaLayanan: BENTUK_LAYANAN.has(bentuk),
      nett: p.price_basis === "nett",
      isi: p.package_items.map((i) => ({ id: i.menus.id.toString(), nama: i.menus.name })),
      slot: p.package_slots.map((sl) => ({
        label: sl.label,
        pilih: sl.pick,
        tambahan: sl.extra,
        catatan: sl.note,
        opsi: sl.package_slot_options.map((o) => ({ nama: o.name, hargaTambahan: o.extra_price === null ? null : Number(o.extra_price) })),
      })),
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

/**
 * Alat yang disewakan ke klien untuk section Sewa alat (D-209): nama, kategori, satuan, harga sewa ke klien.
 * TANPA harga/sumber vendor — form ini juga dipakai sales; klien tidak perlu tahu alatnya milik siapa.
 */
export async function pilihanAlat(): Promise<PilihanAlat[]> {
  const daftar = await prisma.equipment.findMany({
    where: { active: true, for_rent: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, unit: true, rental_price: true },
  });
  return daftar.map((a) => ({ id: a.id.toString(), nama: a.name, kategori: a.category, satuan: a.unit, harga: a.rental_price?.toString() ?? null }));
}

/** Bagian S&K aktif untuk tombol "Isi S&K standar" (D-043). */
export async function pilihanSyarat(): Promise<BagianSyarat[]> {
  const daftar = await prisma.terms_sections.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  return daftar.map((b) => ({ kode: b.code, judul: b.title, isi: b.body, berlaku: b.applies_to, urut: b.sort }));
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

/** Harga jual yang pernah dipakai / di katalog, untuk saran nama baris (D-141). */
export type SaranRiwayat = { nama: string; harga: string; satuan: string | null; menuId: string | null; katalog: boolean };

/**
 * Saran harga baris menu satuan (D-141). Menu dapur belum punya harga jual, jadi harganya diambil dari:
 * katalog product (harga resmi) → invoice terbaru → quotation terbaru (baris bukan paket, harga > 0).
 * Satu nama satu harga — yang paling dipercaya/terbaru menang.
 */
export async function riwayatHargaBaris(): Promise<SaranRiwayat[]> {
  // Tanpa baris Sewa alat (D-209): nama alat bukan saran menu.
  const baris = { parent_id: null, package_id: null, kind: null, price: { gt: 0 } };
  const pilih = { item_name: true, unit: true, price: true, menu_id: true } as const;
  const [produk, inv, quo] = await Promise.all([
    prisma.products.findMany({ where: { status: "active" }, select: { name: true, unit: true, default_price: true } }),
    prisma.invoice_items.findMany({ where: baris, orderBy: { id: "desc" }, take: 500, select: pilih }),
    prisma.quotation_items.findMany({ where: baris, orderBy: { id: "desc" }, take: 500, select: pilih }),
  ]);
  const hasil = new Map<string, SaranRiwayat>();
  const masuk = (s: SaranRiwayat) => {
    const k = rapikanTeks(s.nama);
    if (k && !hasil.has(k)) hasil.set(k, s);
  };
  for (const p of produk) masuk({ nama: p.name, harga: p.default_price.toString(), satuan: p.unit, menuId: null, katalog: true });
  for (const b of [...inv, ...quo]) masuk({ nama: b.item_name, harga: b.price.toString(), satuan: b.unit, menuId: b.menu_id?.toString() ?? null, katalog: false });
  return [...hasil.values()];
}
