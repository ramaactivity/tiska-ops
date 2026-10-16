"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { kodeBerikutnya } from "@/lib/kode-master";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { AWALAN_KODE_RESEP } from "@/lib/resep";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanResep = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skema = z.object({
  /** Kosong = resep baru. */
  id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullish()),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  /** Hanya untuk resep baru; kosong = dibuat otomatis (MC1-xxx). */
  code: z.preprocess(kosongNull, z.string().trim().max(30).regex(/^[A-Za-z0-9-]+$/, "Kode hanya huruf, angka, dan tanda -.").nullish()),
  status: z.enum(["standar", "perkiraan", "belum_ada"], { message: "Pilih status." }),
  notes: z.preprocess(kosongNull, z.string().trim().max(1000).nullish()),
});

/** Resep baru (tanpa id) atau ubah nama/status/porsi/catatan — hanya Kepala Dapur & owner/admin. */
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
  const { id, code, ...isi } = hasil.data;
  const kolom = { ...isi, notes: isi.notes ?? null, portions_per_batch: porsi.toString(), updated_by: BigInt(sesi.id), updated_at: new Date() };

  let idBaru: bigint | null = null;
  try {
    if (id) await prisma.recipes.update({ where: { id: BigInt(id) }, data: kolom });
    else {
      const lama = code ? [] : await prisma.recipes.findMany({ where: { code: { startsWith: AWALAN_KODE_RESEP } }, select: { code: true } });
      const kode = code ?? kodeBerikutnya(AWALAN_KODE_RESEP, lama.map((r) => r.code));
      idBaru = (await prisma.recipes.create({ data: { ...kolom, code: kode, created_at: kolom.updated_at }, select: { id: true } })).id;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return { galat: { code: "Kode ini sudah dipakai resep lain. Ganti atau kosongkan." } };
    return { pesan: "Resep gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/resep");
  if (idBaru) redirect(`/resep/${idBaru}`);
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
