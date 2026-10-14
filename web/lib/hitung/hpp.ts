import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   HPP PER PORSI — satu-satunya rumus (halaman resep, quotation, laporan,
   Hermes memakai fungsi ini).

   HPP per porsi = (Σ qty × harga per satuan resep) ÷ porsi × (1 + overhead%)
   Saran harga  = HPP ÷ target food cost%

   Presisi penuh sampai akhir, dibulatkan 2 desimal di hasil (D-028), sama
   seperti Excel "HPP Makanan - BOM.xlsx": Ayam Kodok 375.570,449… ÷ 100 ×
   1,3 = 4.882,42 — bukan 3.755,70 × 1,3 = 4.882,41.

   Murni, tanpa database.
   ========================================================================== */

export type BarisHpp = {
  qty: NilaiUang;
  /** Harga per satuan resep; null = bahan belum punya harga. */
  harga: NilaiUang | null;
};

export type HasilHpp = {
  totalBahan: Decimal;
  /** null bila porsi kosong/0 — HPP tidak bisa dihitung. */
  bahanPerPorsi: Decimal | null;
  overheadPerPorsi: Decimal | null;
  hppPerPorsi: Decimal | null;
  saranHarga: Decimal | null;
  /** Ada bahan tanpa harga: HPP terlalu rendah, jangan dipercaya. */
  hargaKosong: number;
};

const dua = (x: Decimal) => x.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function hitungHpp({
  baris,
  porsi,
  overheadPct,
  targetFoodCostPct,
}: {
  baris: BarisHpp[];
  porsi: NilaiUang;
  overheadPct: number;
  targetFoodCostPct: number;
}): HasilHpp {
  let totalBahan = new Decimal(0);
  let hargaKosong = 0;
  for (const b of baris) {
    if (b.harga === null || b.harga === undefined || b.harga === "") {
      hargaKosong++;
      continue;
    }
    totalBahan = totalBahan.plus(d(b.qty).times(d(b.harga)));
  }

  const p = d(porsi);
  if (p.lte(0)) {
    return { totalBahan: dua(totalBahan), bahanPerPorsi: null, overheadPerPorsi: null, hppPerPorsi: null, saranHarga: null, hargaKosong };
  }

  const perPorsi = totalBahan.div(p);
  const hpp = perPorsi.times(new Decimal(1).plus(new Decimal(overheadPct).div(100)));
  return {
    totalBahan: dua(totalBahan),
    bahanPerPorsi: dua(perPorsi),
    overheadPerPorsi: dua(hpp.minus(perPorsi)),
    hppPerPorsi: dua(hpp),
    saranHarga: targetFoodCostPct > 0 ? dua(hpp.div(new Decimal(targetFoodCostPct).div(100))) : null,
    hargaKosong,
  };
}
