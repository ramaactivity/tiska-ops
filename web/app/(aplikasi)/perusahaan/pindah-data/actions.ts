"use server";

import { revalidatePath } from "next/cache";

import { type HasilPindah, jalankanPindah } from "@/lib/pindah-data-lama";
import type { Keputusan } from "@/lib/pindah-data-rencana";
import { pastikanPeran } from "@/lib/rbac";

/**
 * Langkah terakhir wizard Pindah data lama (D-107) — hanya owner/admin.
 * `cobaSaja`: seluruh proses dijalankan sampai pembuktian angka, lalu dibatalkan.
 */
export async function pindahkanDataLama(k: Keputusan, cobaSaja: boolean): Promise<{ ok: true; hasil: HasilPindah } | { ok: false; pesan: string }> {
  await pastikanPeran();
  try {
    const hasil = await jalankanPindah(k, cobaSaja);
    if (!cobaSaja) revalidatePath("/", "layout");
    return { ok: true, hasil };
  } catch (e) {
    return {
      ok: false,
      pesan: e instanceof Error ? e.message : "Gagal. Tidak ada data yang berubah.",
    };
  }
}
