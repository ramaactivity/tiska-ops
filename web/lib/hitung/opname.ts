import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   STOCK OPNAME BULANAN (09-PURCHASING §5, D-088). Murni.
   ========================================================================== */

export const BATAS_SELISIH_PERSEN = 5;
export const ALASAN_SELISIH = ["Rusak", "Kedaluwarsa", "Salah catat", "Tumpah / tercecer", "Lainnya"] as const;

/** Selisih hitung fisik − catatan sistem; > 5% (atau sistem 0 tapi ada barang) wajib alasan. */
export function selisihOpname(sistem: NilaiUang, hitung: NilaiUang): { selisih: Decimal; persen: Decimal | null; wajibAlasan: boolean } {
  const s = d(sistem);
  const selisih = d(hitung).minus(s);
  if (selisih.isZero()) return { selisih, persen: new Decimal(0), wajibAlasan: false };
  if (s.lte(0)) return { selisih, persen: null, wajibAlasan: true };
  const persen = selisih.abs().dividedBy(s).times(100);
  return { selisih, persen, wajibAlasan: persen.gt(BATAS_SELISIH_PERSEN) };
}

/** "2026-10-19" → "2026-10-01" (periode opname). */
export function periodeOpname(tanggal: string): string {
  return `${tanggal.slice(0, 7)}-01`;
}

export function labelPeriode(periode: string): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${periode}T00:00:00Z`));
}
