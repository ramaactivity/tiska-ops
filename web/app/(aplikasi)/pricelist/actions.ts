"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bolehKelolaPricelist } from "@/lib/peran";
import { jalurBerkas } from "@/lib/pricelist";
import { tautanUnggah, ukuranTersimpan } from "@/lib/pricelist-berkas";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/** Catat siapa membuka / menyalin / mengirim pricelist (riwayat kirim, D-035). */
export async function catatPricelist(id: string, jenis: "wa" | "salin" | "buka"): Promise<void> {
  const sesi = await pastikanIzin("pricelist");
  if (!/^\d+$/.test(id) || !["wa", "salin", "buka"].includes(jenis)) return;
  const aktif = await prisma.pricelist_files.findFirst({
    where: { pricelist_id: BigInt(id), is_active: true },
    select: { id: true },
  });
  await prisma.pricelist_sends.create({
    data: { pricelist_id: BigInt(id), file_id: aktif?.id ?? null, user_id: BigInt(sesi.id), kind: jenis, created_at: new Date() },
  });
}

async function pastikanKelola() {
  const sesi = await pastikanIzin("pricelist");
  if (!bolehKelolaPricelist(sesi.peran)) throw new Error("Anda tidak punya akses untuk mengubah pricelist.");
  return sesi;
}

/** Langkah 1 unggah versi baru: tautan unggah sekali pakai ke bucket tertutup. */
export async function mintaUnggah(id: string): Promise<{ url: string; versi: number; jalur: string }> {
  await pastikanKelola();
  const p = await prisma.pricelists.findUnique({
    where: { id: BigInt(id) },
    select: { code: true, pricelist_files: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } },
  });
  if (!p) throw new Error("Pricelist tidak ditemukan.");
  const versi = (p.pricelist_files[0]?.version ?? 0) + 1;
  const jalur = jalurBerkas(p.code, versi, "asli");
  return { url: await tautanUnggah(jalur), versi, jalur };
}

/**
 * Langkah 2: setelah browser selesai mengunggah, versi baru dicatat & dijadikan
 * aktif (versi lama tetap tersimpan). Berkasnya diperiksa benar-benar ada.
 */
export async function simpanVersi(id: string, versi: number, catatan: string): Promise<{ sukses: boolean; pesan: string }> {
  const sesi = await pastikanKelola();
  const p = await prisma.pricelists.findUnique({ where: { id: BigInt(id) }, select: { code: true } });
  if (!p || !Number.isInteger(versi) || versi < 1) return { sukses: false, pesan: "Data unggahan tidak sah." };
  const jalur = jalurBerkas(p.code, versi, "asli");
  const ukuran = await ukuranTersimpan(jalur);
  if (!ukuran) return { sukses: false, pesan: "Berkas belum sampai di penyimpanan. Coba unggah lagi." };

  try {
    await prisma.$transaction([
      prisma.pricelist_files.updateMany({ where: { pricelist_id: BigInt(id), is_active: true }, data: { is_active: false } }),
      prisma.pricelist_files.create({
        data: {
          pricelist_id: BigInt(id),
          version: versi,
          file_path: jalur,
          file_size: BigInt(ukuran),
          change_note: catatan.trim().slice(0, 500) || null,
          is_active: true,
          uploaded_by: BigInt(sesi.id),
          created_at: new Date(),
        },
      }),
      prisma.pricelists.update({ where: { id: BigInt(id) }, data: { updated_at: new Date() } }),
    ]);
  } catch {
    return { sukses: false, pesan: "Versi baru gagal dicatat. Coba lagi sebentar." };
  }
  revalidatePath("/pricelist");
  revalidatePath(`/pricelist/${id}`);
  return { sukses: true, pesan: `Versi ${versi} aktif. Link /pl tetap sama dan sekarang membuka versi ini.` };
}

const skemaUbah = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(255),
  status: z.enum(["aktif", "arsip"]),
  notes: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(1000).nullable()),
});

export type KeadaanPricelist = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

export async function ubahPricelist(_s: KeadaanPricelist, data: FormData): Promise<KeadaanPricelist> {
  await pastikanKelola();
  const hasil = skemaUbah.safeParse(Object.fromEntries(data));
  if (!hasil.success) {
    return { galat: Object.fromEntries(Object.entries(z.flattenError(hasil.error).fieldErrors).map(([k, v]) => [k, v?.[0]])) };
  }
  const { id, ...isi } = hasil.data;
  await prisma.pricelists.update({ where: { id: BigInt(id) }, data: { ...isi, updated_at: new Date() } });
  revalidatePath("/pricelist");
  revalidatePath(`/pricelist/${id}`);
  return { sukses: true, pesan: isi.status === "arsip" ? "Disimpan. Link /pl pricelist ini sekarang tidak bisa dibuka klien." : "Disimpan." };
}
