"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { KATEGORI_MENU } from "@/lib/menu";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanMenu = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skema = z.object({
  /** Kosong = menu baru. */
  id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullish()),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  category: z.preprocess(kosongNull, z.enum(Object.keys(KATEGORI_MENU) as [string, ...string[]]).nullable()),
  kitchen: z.preprocess(kosongNull, z.enum(["masak", "pastry"]).nullable()),
  recipe_id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullable()),
  active: z.enum(["ya", "tidak"]),
});

/** Menu baru (tanpa id) atau ubah; dihubungkan ke resep oleh Kepala Dapur / owner (D-033). */
export async function simpanMenu(_s: KeadaanMenu, data: FormData): Promise<KeadaanMenu> {
  const sesi = await pastikanIzin("menu");
  if (!bolehUbahResep(sesi.peran)) return { pesan: "Hanya Kepala Dapur atau owner yang bisa mengubah menu." };

  const hasil = skema.safeParse(Object.fromEntries(data));
  const faktor = uraikanRupiah(data.get("portion_factor"));
  if (!hasil.success || !faktor || faktor.lte(0)) {
    const bidang = hasil.success ? {} : z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        ...Object.fromEntries(Object.entries(bidang).map(([k, v]) => [k, v?.[0]])),
        ...(!faktor || faktor.lte(0) ? { portion_factor: "Isi angka lebih dari 0, contoh: 1 atau 0,5" } : {}),
      },
    };
  }
  const { id, recipe_id, active, ...isi } = hasil.data;

  const kolom = {
    ...isi,
    recipe_id: recipe_id ? BigInt(recipe_id) : null,
    portion_factor: faktor.toString(),
    active: active === "ya",
    updated_at: new Date(),
  };
  let idBaru: bigint | null = null;
  try {
    if (id) await prisma.menus.update({ where: { id: BigInt(id) }, data: kolom });
    else idBaru = (await prisma.menus.create({ data: { ...kolom, created_at: kolom.updated_at }, select: { id: true } })).id;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return { galat: { name: "Nama menu ini sudah dipakai menu lain." } };
    return { pesan: "Menu gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/menu");
  revalidatePath("/paket", "layout");
  if (idBaru) redirect(`/menu/${idBaru}`);
  revalidatePath(`/menu/${id}`);
  return { sukses: true, pesan: "Menu disimpan." };
}
