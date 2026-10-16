"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

export type KeadaanSyarat = { sukses?: boolean; pesan?: string };

const skema = z.object({
  id: z.string().regex(/^\d+$/),
  judul: z.string().trim().min(3, "Judul terlalu pendek.").max(255),
  isi: z.string().trim().min(3, "Isi bagian masih kosong.").max(20_000),
  aktif: z.boolean(),
});

/** Owner/admin menyunting satu bagian S&K (D-043). Quotation lama tidak berubah — teksnya tersalin per dokumen. */
export async function simpanBagianSyarat(_s: KeadaanSyarat, data: FormData): Promise<KeadaanSyarat> {
  const sesi = await pastikanIzin("syarat");
  const hasil = skema.safeParse({
    id: data.get("id"),
    judul: data.get("judul"),
    isi: data.get("isi"),
    aktif: data.get("aktif") === "on",
  });
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id, judul, isi, aktif } = hasil.data;
  await prisma.terms_sections.update({
    where: { id: BigInt(id) },
    data: { title: judul, body: isi, active: aktif, updated_by: BigInt(sesi.id), updated_at: new Date() },
  });
  revalidatePath("/syarat");
  return { sukses: true, pesan: `Bagian "${judul}" tersimpan.` };
}
