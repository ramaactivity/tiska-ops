import { Decimal } from "decimal.js";

import { bulatkanRupiah, d, type NilaiUang } from "../uang";
import type { BarisKebutuhan } from "./kebutuhan";
import { normSatuan, rencanaBeli } from "./stok";

/* ==========================================================================
   DAFTAR BELANJA (Purchase Request) dari Kebutuhan Bahan (09-PURCHASING,
   D-075). Murni.

   Jumlah beli = perkiraan kemasan dari Kebutuhan Bahan bila isi kemasan
   diketahui (satuan beli), selain itu jumlah pakai (satuan resep).
   Harga perkiraan per satuan beli: harga kemasan terakhir, atau harga per
   satuan pakai × isi kemasan. Stok gudang dikurangkan & minimum diisi ulang
   (D-087) — hanya bila satuan stok sama dengan satuan resep; selain itu stok
   diabaikan (lebih aman membeli daripada salah hitung).
   ========================================================================== */

export type HargaBahan = { perSatuan: NilaiUang; perKemasan: NilaiUang | null };

export type BarisBelanja = {
  idBahan: string | null;
  nama: string;
  qtyPerlu: Decimal | null;
  /** Bagian kebutuhan yang diambil dari stok (satuan pakai). */
  dariStok: Decimal | null;
  satuanPakai: string | null;
  qtyBeli: Decimal;
  satuanBeli: string | null;
  /** Per satuan beli. null = belum ada harga. 🔒 */
  hargaPerkiraan: Decimal | null;
};

export type StokBahan = { saldo: NilaiUang; minimum: NilaiUang | null; satuan: string | null };

export function barisDariKebutuhan(
  bahan: BarisKebutuhan[],
  harga: Map<string, HargaBahan>,
  stok: Map<string, StokBahan> = new Map(),
): { baris: BarisBelanja[]; cukupDariStok: { nama: string; qty: Decimal; satuan: string | null }[] } {
  const cukupDariStok: { nama: string; qty: Decimal; satuan: string | null }[] = [];
  const baris = bahan.flatMap((b) => {
    const h = harga.get(b.idBahan);
    const s = stok.get(b.idBahan);
    const pakaiStok = s && normSatuan(s.satuan) !== "" && normSatuan(s.satuan) === normSatuan(b.satuan);
    const { dariStok, beli } = pakaiStok ? rencanaBeli(b.qty, s.saldo, s.minimum) : { dariStok: new Decimal(0), beli: b.qty };
    if (beli.lte(0)) {
      cukupDariStok.push({ nama: b.nama, qty: b.qty, satuan: b.satuan });
      return [];
    }
    const perKemasan = b.perKemasan;
    const kemasan = perKemasan ? beli.dividedBy(perKemasan).toDecimalPlaces(2, Decimal.ROUND_UP) : null;
    const hargaPerkiraan = !h
      ? null
      : perKemasan
        ? h.perKemasan != null
          ? d(h.perKemasan)
          : d(h.perSatuan).times(b.perKemasan!).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : d(h.perSatuan);
    return [
      {
        idBahan: b.idBahan,
        nama: b.nama,
        qtyPerlu: b.qty,
        dariStok: dariStok.gt(0) ? dariStok : null,
        satuanPakai: b.satuan,
        qtyBeli: kemasan ?? beli,
        satuanBeli: kemasan ? (b.satuanBeli ?? "kemasan") : b.satuan,
        hargaPerkiraan,
      },
    ];
  });
  return { baris, cukupDariStok };
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
