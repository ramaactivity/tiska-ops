"use server";

import { revalidatePath } from "next/cache";

import { MIN_SANDI } from "@/lib/auth";

import { bacaBerkasImpor, BATAS_BARIS } from "@/lib/impor/baca";
import { DEFINISI_IMPOR, petakanBaris } from "@/lib/impor/definisi";
import { type BarisDiperiksa, type OpsiImpor, periksaBaris, simpanBaris, tolakPeran } from "@/lib/impor/simpan";
import { pastikanIzin } from "@/lib/rbac";

function definisi(jenis: string) {
  const def = DEFINISI_IMPOR[jenis];
  if (!def) throw new Error("Jenis impor tidak dikenal.");
  return def;
}

/** Langkah 1: baca berkas & periksa tiap baris — belum ada yang disimpan. */
export async function periksaImpor(
  jenis: string,
  data: FormData,
): Promise<{ baris?: BarisDiperiksa[]; pesan?: string }> {
  const def = definisi(jenis);
  const sesi = await pastikanIzin(def.izin);
  const ditolak = tolakPeran(def, sesi.peran);
  if (ditolak) return { pesan: ditolak };
  const berkas = data.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) return { pesan: "Pilih berkas Excel atau CSV dulu." };
  try {
    const { baris, kolomHilang } = petakanBaris(def, await bacaBerkasImpor(berkas));
    if (kolomHilang.length) return { pesan: `Kolom wajib tidak ditemukan: ${kolomHilang.join(", ")}. Pakai template dari tombol "Unduh template".` };
    if (!baris.length) return { pesan: "Berkasnya kosong — belum ada baris data di bawah judul kolom." };
    if (baris.length > BATAS_BARIS) return { pesan: `Maksimal ${BATAS_BARIS} baris per berkas.` };
    return { baris: await periksaBaris(def, baris) };
  } catch (e) {
    return { pesan: e instanceof Error ? e.message : "Berkas gagal dibaca." };
  }
}

/** Langkah 2: simpan baris yang lolos (diperiksa ulang di server). */
export async function jalankanImpor(jenis: string, baris: Record<string, string>[], opsi: OpsiImpor = {}): Promise<{ jumlah?: number; pesan?: string }> {
  const def = definisi(jenis);
  const sesi = await pastikanIzin(def.izin);
  const ditolak = tolakPeran(def, sesi.peran);
  if (ditolak) return { pesan: ditolak };
  if (baris.length > BATAS_BARIS) return { pesan: `Maksimal ${BATAS_BARIS} baris per berkas.` };
  if (def.sandiAwal && (opsi.sandiAwal ?? "").length < MIN_SANDI) return { pesan: `Isi sandi awal minimal ${MIN_SANDI} karakter.` };
  try {
    const jumlah = await simpanBaris(def, baris, sesi.id, { sandiAwal: def.sandiAwal ? opsi.sandiAwal : undefined });
    revalidatePath(def.kembali);
    return { jumlah };
  } catch {
    return { pesan: "Impor gagal. Tidak ada data yang tersimpan — coba lagi." };
  }
}
