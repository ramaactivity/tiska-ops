"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tulisPoin } from "@/lib/poin-syarat";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

const skema = z.object({
  id: z.string().regex(/^\d+$/),
  judul: z.string().trim().min(3, "Judul bagian terlalu pendek.").max(255),
  poin: z
    .array(z.object({ jenis: z.enum(["poin", "sub", "catatan"]), teks: z.string().max(5000) }))
    .max(200),
  aktif: z.boolean(),
});

/**
 * Simpan satu bagian S&K (D-043, D-064) — dipanggil otomatis oleh penyunting
 * setiap jeda mengetik. Poin disusun jadi teks bernomor di server (satu
 * aturan, lib/poin-syarat). Quotation lama tidak berubah: teksnya tersalin.
 */
export async function simpanSyarat(isian: z.input<typeof skema>): Promise<{ ok: boolean; pesan?: string }> {
  const sesi = await pastikanIzin("syarat");
  const hasil = skema.safeParse(isian);
  if (!hasil.success) return { ok: false, pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id, judul, poin, aktif } = hasil.data;
  const isi = tulisPoin(poin);
  if (isi.length < 3) return { ok: false, pesan: "Bagian ini belum punya poin." };
  if (isi.length > 20_000) return { ok: false, pesan: "Isi bagian terlalu panjang." };
  await prisma.terms_sections.update({
    where: { id: BigInt(id) },
    data: { title: judul, body: isi, active: aktif, updated_by: BigInt(sesi.id), updated_at: new Date() },
  });
  revalidatePath("/syarat");
  return { ok: true };
}
