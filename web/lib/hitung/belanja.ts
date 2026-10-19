import { Decimal } from "decimal.js";

import { bulatkanRupiah, d, type NilaiUang } from "../uang";
import type { BarisKebutuhan } from "./kebutuhan";

/* ==========================================================================
   DAFTAR BELANJA (Purchase Request) dari Kebutuhan Bahan (09-PURCHASING,
   D-075). Murni.

   Jumlah beli = perkiraan kemasan dari Kebutuhan Bahan bila isi kemasan
   diketahui (satuan beli), selain itu jumlah pakai (satuan resep).
   Harga perkiraan per satuan beli: harga kemasan terakhir, atau harga per
   satuan pakai × isi kemasan. Stok belum dikurangkan (gudang menyusul, 3.8).
   ========================================================================== */

export type HargaBahan = { perSatuan: NilaiUang; perKemasan: NilaiUang | null };

export type BarisBelanja = {
  idBahan: string | null;
  nama: string;
  qtyPerlu: Decimal | null;
  satuanPakai: string | null;
  qtyBeli: Decimal;
  satuanBeli: string | null;
  /** Per satuan beli. null = belum ada harga. 🔒 */
  hargaPerkiraan: Decimal | null;
};

export function barisDariKebutuhan(bahan: BarisKebutuhan[], harga: Map<string, HargaBahan>): BarisBelanja[] {
  return bahan.map((b) => {
    const h = harga.get(b.idBahan);
    const perKemasan = b.kemasan && b.perKemasan;
    const hargaPerkiraan = !h
      ? null
      : perKemasan
        ? h.perKemasan != null
          ? d(h.perKemasan)
          : d(h.perSatuan).times(b.perKemasan!).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : d(h.perSatuan);
    return {
      idBahan: b.idBahan,
      nama: b.nama,
      qtyPerlu: b.qty,
      satuanPakai: b.satuan,
      qtyBeli: perKemasan ? b.kemasan! : b.qty,
      satuanBeli: perKemasan ? (b.satuanBeli ?? "kemasan") : b.satuan,
      hargaPerkiraan,
    };
  });
}

/** Perkiraan rupiah satu baris (dibulatkan) — baris tanpa harga = 0. */
export function nilaiBaris(qtyBeli: NilaiUang, hargaPerkiraan: NilaiUang | null): Decimal {
  return hargaPerkiraan == null ? new Decimal(0) : bulatkanRupiah(d(qtyBeli).times(d(hargaPerkiraan)));
}

/** Total perkiraan + jumlah baris yang belum punya harga (supaya Finance tahu totalnya kurang). */
export function totalBelanja(baris: { qtyBeli: NilaiUang; hargaPerkiraan: NilaiUang | null }[]): { total: Decimal; tanpaHarga: number } {
  let total = new Decimal(0);
  let tanpaHarga = 0;
  for (const b of baris) {
    if (b.hargaPerkiraan == null) tanpaHarga++;
    else total = total.plus(nilaiBaris(b.qtyBeli, b.hargaPerkiraan));
  }
  return { total, tanpaHarga };
}
