"use server";

import { revalidatePath } from "next/cache";

import { hapusSemuaDataTes } from "@/lib/data-tes";
import { geserEventDummy } from "@/lib/event-dummy";
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

/** Tombol "Geser event dummy" (D-138) — order TES-00…03 pindah ke kemarin / hari ini / besok / lusa. */
export async function geserDummy(): Promise<{ pesan: string }> {
  await pastikanPeran();
  const n = await geserEventDummy();
  revalidatePath("/", "layout");
  return { pesan: n ? `${n} event dummy dipindah ke kemarin, hari ini, besok, dan lusa.` : "Tanggal event dummy sudah sesuai hari ini." };
}
