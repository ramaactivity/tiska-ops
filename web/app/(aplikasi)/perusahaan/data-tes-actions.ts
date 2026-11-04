"use server";

import { revalidatePath } from "next/cache";

import { hapusSemuaDataTes } from "@/lib/data-tes";
import { resetEventDummy, simpanTitikAwal } from "@/lib/event-dummy";
import { pastikanPeran } from "@/lib/rbac";

/** Tombol "Hapus semua data tes" (D-072) — hanya owner/admin. */
export async function hapusDataTes(): Promise<{ pesan: string }> {
  await pastikanPeran();
  const r = await hapusSemuaDataTes();
  revalidatePath("/", "layout");
  return {
    pesan: `${r.customer.length} customer tes dihapus beserta ${r.quotation} quotation, ${r.invoice} invoice, ${r.payment} payment, ${r.event} event.`,
  };
}

/** Tombol "Reset event dummy" (D-140) — kembali ke titik awal + pindah ke kemarin / hari ini / besok / lusa. */
export async function resetDummy(): Promise<{ pesan: string }> {
  await pastikanPeran();
  const r = await resetEventDummy();
  revalidatePath("/", "layout");
  return { pesan: `Event dummy kembali ke awal (${r.dihapus} baris jejak tes dibuang, ${r.dipulihkan} baris dipulihkan) dan pindah ke kemarin, hari ini, besok, lusa.` };
}

/** Simpan keadaan dummy sekarang sebagai titik awal reset (hanya bila belum ada). */
export async function simpanAwalDummy(): Promise<{ pesan: string }> {
  await pastikanPeran();
  const n = await simpanTitikAwal();
  revalidatePath("/perusahaan");
  return { pesan: `Titik awal disimpan (${n} baris).` };
}
