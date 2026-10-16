import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";
import { type Pita, nilaiUntung } from "./paket";

/* ==========================================================================
   UNTUNG MAKANAN SEBUAH QUOTATION (D-013, D-038). Murni.

   Untung = (nilai jual baris makanan − HPP baris itu) ÷ nilai jual, HANYA
   dari baris yang HPP-nya diketahui (baris dari "Tambah dari paket" dengan
   HPP paket lengkap). Bukan margin lama di halaman Margin, yang membagi
   dengan grand total termasuk pajak, layanan, dan delivery.

   Baris lain yang bernilai (stall manual, sewa alat, paket yang HPP-nya
   belum lengkap) tidak ikut dinilai dan dilaporkan sebagai `tanpaHpp`.
   ========================================================================== */

export type BarisUntung = {
  /** Nilai jual baris (0 untuk compliment — biayanya tetap dihitung). */
  nilai: NilaiUang;
  /** Pengali porsi: hari × qty × pax. */
  porsi: NilaiUang;
  /** HPP per porsi; null = HPP belum lengkap; undefined = bukan baris paket. */
  hppPorsi?: NilaiUang | null;
};

export type HasilUntungDokumen = {
  nilaiDinilai: Decimal;
  hpp: Decimal;
  untung: Decimal | null;
  pct: Decimal | null;
  pita: Pita | null;
  dinilai: number;
  tanpaHpp: number;
};

export function untungDokumen(baris: BarisUntung[], batas: { untungAmanPct: number; untungMinPct: number }): HasilUntungDokumen {
  let nilaiDinilai = new Decimal(0);
  let hpp = new Decimal(0);
  let dinilai = 0;
  let tanpaHpp = 0;
  for (const b of baris) {
    if (b.hppPorsi === null || b.hppPorsi === undefined || b.hppPorsi === "") {
      if (d(b.nilai).gt(0)) tanpaHpp++;
      continue;
    }
    nilaiDinilai = nilaiDinilai.plus(d(b.nilai));
    hpp = hpp.plus(d(b.hppPorsi).times(d(b.porsi)));
    dinilai++;
  }
  const u = dinilai ? nilaiUntung({ harga: nilaiDinilai, hpp, ...batas }) : null;
  return {
    nilaiDinilai,
    hpp: hpp.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    untung: u?.untung ?? null,
    pct: u?.pct ?? null,
    pita: u?.pita ?? null,
    dinilai,
    tanpaHpp,
  };
}

/**
 * Status persetujuan owner setelah quotation disimpan.
 * - Untung < minimum → 'perlu', kecuali sudah disetujui owner pada untung
 *   yang sama atau lebih rendah (harga tidak diturunkan lagi).
 * - Untung ≥ minimum atau tidak bisa dinilai → null (tidak perlu persetujuan).
 */
export function keputusanPersetujuan(
  hasil: Pick<HasilUntungDokumen, "pita" | "pct">,
  sebelumnya: { status: string | null; pctDisetujui: NilaiUang | null },
): "perlu" | "disetujui" | null {
  if (hasil.pita !== "rendah" || !hasil.pct) return null;
  if (sebelumnya.status === "disetujui" && sebelumnya.pctDisetujui !== null && hasil.pct.gte(d(sebelumnya.pctDisetujui))) {
    return "disetujui";
  }
  return "perlu";
}
