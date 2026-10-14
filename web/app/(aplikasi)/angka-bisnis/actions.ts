"use server";

import { revalidatePath } from "next/cache";

import { KELOMPOK_PENGATURAN, susunJalur } from "@/lib/label-pengaturan";
import { SKEMA_PENGATURAN } from "@/lib/pengaturan-bisnis";
import { bolehUbahAngkaBisnis } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanAngka = { sukses?: boolean; pesan?: string; galat?: Record<string, string> };

async function pastikanBoleh() {
  const sesi = await pastikanIzin("angka-bisnis");
  if (!bolehUbahAngkaBisnis(sesi.peran)) throw new Error("Hanya owner atau finance yang bisa mengubah angka bisnis.");
  return sesi;
}

/** Satu kelompok disimpan utuh sebagai satu baris business_settings (D-026). */
export async function simpanAngkaBisnis(_s: KeadaanAngka, data: FormData): Promise<KeadaanAngka> {
  const sesi = await pastikanBoleh();
  const kelompok = KELOMPOK_PENGATURAN.find((k) => k.kunci === data.get("kunci"));
  if (!kelompok) return { pesan: "Kelompok angka tidak dikenal." };

  const galat: Record<string, string> = {};
  const pasangan: [string, number][] = [];
  for (const [jalur, , satuan] of kelompok.isian) {
    const nilai = uraikanRupiah(data.get(`n:${jalur}`));
    if (!nilai || nilai.isNegative()) galat[jalur] = "Isi angka 0 atau lebih.";
    else if (satuan === "%" && nilai.gt(100)) galat[jalur] = "Persen maksimal 100.";
    else if (satuan !== "%" && !nilai.isInteger()) galat[jalur] = "Isi bilangan bulat.";
    else pasangan.push([jalur, nilai.toNumber()]);
  }
  if (Object.keys(galat).length) return { galat };

  const hasil = SKEMA_PENGATURAN.shape[kelompok.kunci].safeParse(susunJalur(pasangan));
  if (!hasil.success) return { pesan: "Angka tidak sah. Periksa lagi isiannya." };

  const sekarang = new Date();
  try {
    await prisma.business_settings.upsert({
      where: { key: kelompok.kunci },
      create: { key: kelompok.kunci, value: hasil.data, updated_by: BigInt(sesi.id), created_at: sekarang, updated_at: sekarang },
      update: { value: hasil.data, updated_by: BigInt(sesi.id), updated_at: sekarang },
    });
  } catch {
    return { pesan: "Gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/", "layout");
  return { sukses: true, pesan: `${kelompok.judul} disimpan.` };
}

/** Hapus angka yang diubah → kembali memakai bawaan di kode. */
export async function kembalikanBawaan(_s: KeadaanAngka, data: FormData): Promise<KeadaanAngka> {
  await pastikanBoleh();
  const kelompok = KELOMPOK_PENGATURAN.find((k) => k.kunci === data.get("kunci"));
  if (!kelompok) return { pesan: "Kelompok angka tidak dikenal." };
  await prisma.business_settings.deleteMany({ where: { key: kelompok.kunci } });
  revalidatePath("/", "layout");
  return { sukses: true, pesan: `${kelompok.judul} kembali ke angka bawaan.` };
}
