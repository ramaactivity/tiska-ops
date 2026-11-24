"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { rapikanTautan } from "@/lib/hitung/aset";
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

const skemaBaru = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(255),
  segment: z.string().trim().min(2, "Isi segmen, mis. Wedding atau Corporate.").max(50),
  region: z.enum(["bogor", "jakarta", "semua"], { error: "Pilih wilayah." }),
  price_basis: z.preprocess((v) => (v === "" ? null : v), z.enum(["nett", "plus_plus"]).nullable()),
  venue: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(100).nullable()),
  seasonal: z.boolean(),
});

/** "Menu Wedding Bogor 2027" → "menu-wedding-bogor-2027". */
function buatSlug(nama: string): string {
  return (
    nama
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "pricelist"
  );
}

/**
 * Pricelist baru: kode urut berikutnya (01, 02, …) dan link /pl/<slug> dari
 * namanya. Berkas PDF diunggah sesudahnya lewat mintaUnggah/simpanVersi.
 */
export async function buatPricelist(isi: z.input<typeof skemaBaru>): Promise<{ id?: string; galat?: Record<string, string | undefined> }> {
  await pastikanKelola();
  const hasil = skemaBaru.safeParse(isi);
  if (!hasil.success) {
    return { galat: Object.fromEntries(Object.entries(z.flattenError(hasil.error).fieldErrors).map(([k, v]) => [k, v?.[0]])) };
  }
  const ada = await prisma.pricelists.findMany({ select: { code: true, slug: true } });
  const kode = String(Math.max(0, ...ada.map((p) => Number(p.code) || 0)) + 1).padStart(2, "0");
  const dasar = buatSlug(hasil.data.name);
  const slugAda = new Set(ada.map((p) => p.slug));
  let slug = dasar;
  for (let n = 2; slugAda.has(slug); n++) slug = `${dasar}-${n}`;

  const p = await prisma.pricelists.create({
    data: { ...hasil.data, code: kode, slug, status: "aktif", created_at: new Date(), updated_at: new Date() },
    select: { id: true },
  });
  revalidatePath("/pricelist");
  return { id: p.id.toString() };
}

const skemaUbah = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(255),
  status: z.enum(["aktif", "arsip"]),
  notes: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(1000).nullable()),
  // Link desain Canva (D-229): kosong = tidak ada; selain itu harus alamat web yang sah.
  canva_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? (rapikanTautan(v) ?? "") : v),
    z.string().min(1, "Link belum benar — salin dari Canva: Bagikan → Salin tautan.").max(500).nullable(),
  ),
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
