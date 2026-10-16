/* ==========================================================================
   ISTILAH RESMI DI DOKUMEN (D-012, D-020, CLAUDE.md) — satu tempat untuk
   form, halaman detail, cetak, dan Excel.
   ========================================================================== */

import { rupiah } from "./uang";

export const ISTILAH = {
  layanan: "Layanan Penyediaan Perlengkapan Buffet & Stall",
  pajak: "PBJT",
  delivery: "Delivery Fee",
} as const;

/**
 * 5.00 → "5", 7.50 → "7,5" — aturan yang sama persis dengan cetakan lama
 * (Number().toString(), titik jadi koma), karena persen pajak dibaca orang pajak.
 */
const persen = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "0" : Number(v).toString().replace(".", ","));

/** "Layanan … (15% / min. Rp 1.500.000)". */
export function labelLayanan(pct: string | number | null | undefined, minimum?: string | number | null): string {
  const min = Number(minimum ?? 0) > 0 ? ` / min. ${rupiah(minimum)}` : "";
  return `${ISTILAH.layanan} (${persen(pct)}%${min})`;
}

/** "PBJT (10%)". */
export function labelPajak(pct: string | number | null | undefined): string {
  return `${ISTILAH.pajak} (${persen(pct)}%)`;
}

/** "PPN Sewa Alat (11%)" — hanya baris sewa alat (D-015). */
export function labelPpn(pct: string | number | null | undefined): string {
  return `PPN Sewa Alat (${persen(pct)}%)`;
}
