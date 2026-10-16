import type { Decimal } from "decimal.js";

/* ==========================================================================
   RESEP — aturan tampilan yang dipakai daftar & detail resep. Murni.
   ========================================================================== */

/** Awalan kode resep baru (data impor: MC1-001 … dari sheet "Main Course 1"). */
export const AWALAN_KODE_RESEP = "MC1-";

export const LABEL_STATUS_RESEP: Record<string, string> = {
  standar: "Standar",
  perkiraan: "Perkiraan",
  belum_ada: "Belum ada",
};

type BarisCek = { qty: Decimal; bahanPengganti: boolean };

/**
 * Alasan resep perlu dicek Kepala Dapur — TANPA menyebut harga, karena
 * daftar ini juga dibaca dapur. Masalah harga (bahan belum berharga)
 * dilaporkan terpisah lewat hitungHpp().hargaKosong, hanya untuk yang boleh
 * melihat biaya.
 */
export function alasanPerluDicek(resep: { porsi: Decimal | null; baris: BarisCek[] }): string[] {
  const alasan: string[] = [];
  if (!resep.porsi || resep.porsi.lte(0)) alasan.push("porsi per resep kosong");
  if (resep.baris.length === 0) alasan.push("belum ada bahan");
  const pengganti = resep.baris.filter((b) => b.bahanPengganti).length;
  if (pengganti) alasan.push(`${pengganti} bahan tidak ada di daftar bahan`);
  const qtyNol = resep.baris.filter((b) => b.qty.lte(0)).length;
  if (qtyNol) alasan.push(`${qtyNol} takaran kosong`);
  return alasan;
}
