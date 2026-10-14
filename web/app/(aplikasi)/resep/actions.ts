"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanResep = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

const skema = z.object({
  id: z.string().regex(/^\d+$/),
  status: z.enum(["standar", "perkiraan", "belum_ada"], { message: "Pilih status." }),
  notes: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(1000).nullable()),
});

/** Status, porsi per resep, dan catatan — hanya Kepala Dapur & owner/admin. */
export async function ubahResep(_s: KeadaanResep, data: FormData): Promise<KeadaanResep> {
  const sesi = await pastikanIzin("resep");
  if (!bolehUbahResep(sesi.peran)) return { pesan: "Hanya Kepala Dapur atau owner yang bisa mengubah resep." };

  const hasil = skema.safeParse(Object.fromEntries(data));
  const porsi = uraikanRupiah(data.get("portions_per_batch"));
  if (!hasil.success || !porsi || porsi.lte(0)) {
    const bidang = hasil.success ? {} : z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        ...Object.fromEntries(Object.entries(bidang).map(([k, v]) => [k, v?.[0]])),
        ...(!porsi || porsi.lte(0) ? { portions_per_batch: "Isi jumlah porsi lebih dari 0, contoh: 100" } : {}),
      },
    };
  }
  const { id, ...isi } = hasil.data;

  try {
    await prisma.recipes.update({
      where: { id: BigInt(id) },
      data: { ...isi, portions_per_batch: porsi.toString(), updated_by: BigInt(sesi.id), updated_at: new Date() },
    });
  } catch {
    return { pesan: "Resep gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/resep");
  revalidatePath(`/resep/${id}`);
  return { sukses: true, pesan: "Resep disimpan." };
}
