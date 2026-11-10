import { Decimal } from "decimal.js";

import { bulatkanRupiah, d, type NilaiUang } from "../uang";

/* ==========================================================================
   RAB (PR) → BIAYA MARGIN EVENT (D-146). Murni.

   Estimasi = Σ jumlah beli × harga perkiraan baris PR, per kategori.
   Realisasi = Σ baris nota/penerimaan yang tertaut PR, per kategori (kategori
   ikut baris PR-nya; barang tambahan di nota tanpa baris PR = bahan baku).
   PR untuk beberapa event dibagi rata — sama dengan alokasi rekap event.
   PR tanpa event (untuk stok gudang) tidak menghasilkan biaya margin: bahan
   itu baru menjadi biaya saat keluar gudang untuk event.
   ========================================================================== */

export const STATUS_PR_MASUK_MARGIN = ["diajukan", "disetujui", "selesai"] as const;

export type BarisRab = { kategori: string; qty: NilaiUang; harga: NilaiUang };
export type BarisNotaRab = { kategori: string | null; total: NilaiUang };
export type BiayaRab = { kategori: string; estimasi: Decimal; realisasi: Decimal | null };

/** Biaya satu event dari satu PR, per kategori. Realisasi null = belum ada nota di kategori itu. */
export function biayaRabPerEvent(x: { status: string; jumlahEvent: number; baris: BarisRab[]; nota: BarisNotaRab[] }): BiayaRab[] {
  if (!x.jumlahEvent || !(STATUS_PR_MASUK_MARGIN as readonly string[]).includes(x.status)) return [];
  const est = new Map<string, Decimal>();
  const real = new Map<string, Decimal>();
  for (const b of x.baris) est.set(b.kategori, (est.get(b.kategori) ?? new Decimal(0)).plus(d(b.qty).times(d(b.harga))));
  for (const n of x.nota) {
    const k = n.kategori ?? "hpp_bahan_baku";
    real.set(k, (real.get(k) ?? new Decimal(0)).plus(d(n.total)));
  }
  const bagi = (v: Decimal) => bulatkanRupiah(v.dividedBy(x.jumlahEvent));
  return [...new Set([...est.keys(), ...real.keys()])]
    .map((k) => ({ kategori: k, estimasi: bagi(est.get(k) ?? new Decimal(0)), realisasi: real.has(k) ? bagi(real.get(k)!) : null }))
    .filter((b) => b.estimasi.gt(0) || (b.realisasi && b.realisasi.gt(0)));
}
