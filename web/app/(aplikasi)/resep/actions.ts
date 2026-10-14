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

const skemaBaris = z.array(z.object({ bahanId: z.string(), qty: z.string() })).max(200);

/**
 * Isi resep diganti utuh dalam SATU transaksi (hapus semua baris, tulis ulang
 * sesuai urutan di layar). Tidak ada yang merujuk recipe_lines, jadi aman.
 */
export async function simpanBahanResep(_s: KeadaanResep, data: FormData): Promise<KeadaanResep> {
  const sesi = await pastikanIzin("resep");
  if (!bolehUbahResep(sesi.peran)) return { pesan: "Hanya Kepala Dapur atau owner yang bisa mengubah resep." };

  const id = String(data.get("id") ?? "");
  if (!/^\d+$/.test(id)) return { pesan: "Resep tidak dikenal." };
  let mentah: unknown;
  try {
    mentah = JSON.parse(String(data.get("baris") ?? "[]"));
  } catch {
    return { pesan: "Isi resep tidak terbaca. Muat ulang halaman lalu coba lagi." };
  }
  const hasil = skemaBaris.safeParse(mentah);
  if (!hasil.success) return { pesan: "Isi resep tidak terbaca. Muat ulang halaman lalu coba lagi." };
  if (hasil.data.length === 0) return { pesan: "Resep minimal punya satu bahan." };

  const baris = [];
  for (const [i, b] of hasil.data.entries()) {
    if (!/^\d+$/.test(b.bahanId)) return { pesan: `Baris ${i + 1}: bahan belum dipilih.` };
    const qty = uraikanRupiah(b.qty);
    if (!qty || qty.lte(0)) return { pesan: `Baris ${i + 1}: isi takaran lebih dari 0, contoh: 250 atau 0,5.` };
    baris.push({ bahanId: BigInt(b.bahanId), qty });
  }

  const bahan = await prisma.ingredients.findMany({
    where: { id: { in: baris.map((b) => b.bahanId) } },
    select: { id: true, usage_unit: true },
  });
  const satuan = new Map(bahan.map((b) => [b.id, b.usage_unit]));
  if (satuan.size !== new Set(baris.map((b) => b.bahanId)).size) return { pesan: "Ada bahan yang tidak ditemukan. Muat ulang halaman." };

  try {
    const sekarang = new Date();
    await prisma.$transaction([
      prisma.recipe_lines.deleteMany({ where: { recipe_id: BigInt(id) } }),
      prisma.recipe_lines.createMany({
        data: baris.map((b, i) => ({
          recipe_id: BigInt(id),
          ingredient_id: b.bahanId,
          qty_per_batch: b.qty.toString(),
          usage_unit: satuan.get(b.bahanId) ?? null,
          sort: i + 1,
          created_at: sekarang,
          updated_at: sekarang,
        })),
      }),
      prisma.recipes.update({ where: { id: BigInt(id) }, data: { updated_by: BigInt(sesi.id), updated_at: sekarang } }),
    ]);
  } catch {
    return { pesan: "Isi resep gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/resep");
  revalidatePath(`/resep/${id}`);
  revalidatePath("/bahan", "layout");
  return { sukses: true, pesan: `Isi resep disimpan (${baris.length} bahan).` };
}
