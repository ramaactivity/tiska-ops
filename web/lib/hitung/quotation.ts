import { Decimal } from "decimal.js";

import type { PengaturanBisnis } from "../pengaturan-bisnis";
import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   ATURAN QUOTATION TISKA (Fase 2.1) — angka dari Angka Bisnis, bukan
   tertanam. Totalnya tetap dihitung SATU mesin: hitungTotalDokumen() di
   lib/uang.ts; fungsi di sini hanya menyiapkan masukannya. Murni.
   ========================================================================== */

export type Zona = "bogor" | "jabodetabek" | "luar";

/**
 * Persen & minimum Layanan Penyediaan Perlengkapan Buffet & Stall per zona
 * (02-ATURAN-BISNIS §2). Luar Jabodetabek = manual (null).
 */
export function aturanLayanan(p: PengaturanBisnis, zona: Zona, setMenu = false): { pct: number; min: number } | null {
  if (zona === "luar") return null;
  const t = p.layanan_perlengkapan;
  if (setMenu) return zona === "bogor" ? t.set_menu_bogor : t.set_menu_jabodetabek;
  return zona === "bogor" ? t.bogor : t.jabodetabek;
}

/**
 * Delivery Fee bawaan (02-ATURAN-BISNIS §3): per kloter untuk pesanan box;
 * tidak dikenakan bila ada layanan buffet/stall (default #10 — saklar per
 * order tetap bisa menyalakannya). Luar Jabodetabek = manual (null).
 */
export function deliveryFeeBawaan(
  p: PengaturanBisnis,
  zona: Zona,
  { kloter = 1, adaLayanan = false }: { kloter?: number; adaLayanan?: boolean } = {},
): Decimal | null {
  if (zona === "luar") return null;
  if (adaLayanan) return new Decimal(0);
  return new Decimal(zona === "bogor" ? p.delivery_fee.bogor : p.delivery_fee.jabodetabek).times(Math.max(1, kloter));
}

/** Partner Fee WO/vendor rekanan = persen × nilai makanan & minuman (D-020). Bukan baris dokumen klien. */
export function partnerFee(nilaiMakanan: NilaiUang, pct: number): Decimal {
  return d(nilaiMakanan).times(pct).dividedBy(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

/**
 * Usulan pembulatan nett ke bawah ke kelipatan tertentu (PDGI: 14.890.625 →
 * 14.800.000 = kelipatan 100.000). Aturan pasti belum ditetapkan (#6) — ini
 * hanya usulan; sales tetap boleh mengisi angka sendiri.
 */
export function usulanPembulatan(total: NilaiUang, kelipatan = 100_000): Decimal {
  const t = d(total);
  return t.dividedBy(kelipatan).floor().times(kelipatan).minus(t);
}
