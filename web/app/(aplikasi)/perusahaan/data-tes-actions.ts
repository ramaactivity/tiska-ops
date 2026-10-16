"use server";

import { revalidatePath } from "next/cache";

import { hapusSemuaDataTes } from "@/lib/data-tes";
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
