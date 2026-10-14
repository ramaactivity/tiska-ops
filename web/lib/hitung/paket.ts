import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   HPP PAKET & PENANDA UNTUNG — satu rumus untuk halaman paket, quotation,
   laporan. Murni.

   HPP paket per porsi = Σ HPP item + biaya kemasan bentuk penyajian
   (box & alat makan). Buffet tidak memakai biaya box.

   Untung (D-013) = (harga jual − HPP) ÷ harga jual.
     ≥ untung aman            → "aman"   (hijau)
     ≥ untung minimum         → "mepet"  (kuning, info ke owner & finance)
     <  untung minimum        → "rendah" (merah, wajib persetujuan owner)
   ========================================================================== */

export type Pita = "aman" | "mepet" | "rendah";

export function hitungHppPaket(items: NilaiUang[], biayaKemasan: NilaiUang): Decimal {
  return items.reduce<Decimal>((s, x) => s.plus(d(x)), new Decimal(0)).plus(d(biayaKemasan)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function nilaiUntung({
  harga,
  hpp,
  untungAmanPct,
  untungMinPct,
}: {
  harga: NilaiUang;
  hpp: NilaiUang;
  untungAmanPct: number;
  untungMinPct: number;
}): { untung: Decimal; pct: Decimal; pita: Pita } | null {
  const h = d(harga);
  if (h.lte(0)) return null;
  const untung = h.minus(d(hpp));
  const pct = untung.div(h).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
  const pita: Pita = pct.gte(untungAmanPct) ? "aman" : pct.gte(untungMinPct) ? "mepet" : "rendah";
  return { untung, pct, pita };
}

export const LABEL_PITA: Record<Pita, string> = {
  aman: "Aman",
  mepet: "Mepet",
  rendah: "Perlu persetujuan owner",
};
