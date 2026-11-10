import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   STOK BAHAN & PACKAGING (09-PURCHASING §4, D-087). Murni.

   Satuan stok = satuan pakai bahan (yang dipakai resep), atau satuan beli
   bila satuan pakai kosong. Jumlah dari nota/resep dikonversi ke satuan
   stok HANYA bila pasti: satuan sama, satuan beli × isi kemasan, atau
   kg↔gram / liter↔ml. Selain itu null — pemanggil wajib menampilkannya
   sebagai "belum masuk stok", tidak boleh ditebak.
   ========================================================================== */

export type BahanSatuan = { purchase_unit: string | null; usage_unit: string | null; usage_qty_per_pack: NilaiUang | null };

const SINONIM: Record<string, string> = {
  kilogram: "kg", kilo: "kg", kg: "kg",
  gram: "g", gr: "g", grm: "g", g: "g",
  liter: "l", ltr: "l", l: "l",
  mililiter: "ml", ml: "ml", cc: "ml",
  piece: "pcs", pieces: "pcs", pcs: "pcs", pc: "pcs", buah: "pcs", biji: "pcs",
};
/** "Kilogram" / "kg" / " KG " → "kg"; satuan lain dibandingkan apa adanya (huruf kecil). */
export function normSatuan(u: string | null | undefined): string {
  const t = (u ?? "").trim().toLowerCase();
  return SINONIM[t] ?? t;
}

const FISIK: Record<string, [string, number]> = { kg: ["g", 1000], l: ["ml", 1000] };

export function satuanStok(b: Pick<BahanSatuan, "usage_unit" | "purchase_unit">): string | null {
  return b.usage_unit ?? b.purchase_unit;
}

/** Jumlah dalam satuan `unit` → satuan stok; null bila konversinya tidak pasti. */
export function keSatuanStok(qty: NilaiUang, unit: string | null, b: BahanSatuan): Decimal | null {
  const tujuan = normSatuan(satuanStok(b));
  const asal = normSatuan(unit);
  if (!tujuan || !asal) return null;
  if (asal === tujuan) return d(qty);
  if (b.usage_unit && asal === normSatuan(b.purchase_unit) && b.usage_qty_per_pack && d(b.usage_qty_per_pack).gt(0)) {
    return d(qty).times(d(b.usage_qty_per_pack));
  }
  const [kecil, kali] = FISIK[asal] ?? [];
  if (kecil === tujuan) return d(qty).times(kali!);
  const [kecil2, kali2] = FISIK[tujuan] ?? [];
  if (kecil2 === asal) return d(qty).dividedBy(kali2!);
  return null;
}

/** Label jenis mutasi stok — kartu stok & laporan mutasi (D-087, D-148). */
export const JENIS_MUTASI: Record<string, string> = { masuk: "Masuk", pakai: "Pemakaian event", keluar: "Barang keluar", waste: "Waste", koreksi: "Koreksi", opname: "Opname" };

export type KeadaanStok = "minus" | "habis" | "hampir" | "aman";
export const LABEL_KEADAAN: Record<KeadaanStok, string> = { minus: "Minus — perlu opname", habis: "Habis", hampir: "Hampir habis", aman: "Aman" };

/** minus = catatan tidak cocok kenyataan (perlu opname); hampir = di bawah/sama dengan minimum. */
export function keadaanStok(saldo: NilaiUang, minimum: NilaiUang | null): KeadaanStok {
  const s = d(saldo);
  if (s.lt(0)) return "minus";
  if (s.isZero()) return "habis";
  return minimum != null && d(minimum).gt(0) && s.lte(d(minimum)) ? "hampir" : "aman";
}

/**
 * Rencana beli untuk PR: kebutuhan − stok yang ada + isi ulang sampai minimum.
 * Stok minus dianggap nol (tidak menambah kebutuhan diam-diam — itu urusan opname).
 */
export function rencanaBeli(perlu: NilaiUang, saldo: NilaiUang, minimum: NilaiUang | null): { dariStok: Decimal; beli: Decimal } {
  const ada = Decimal.max(0, d(saldo));
  const dariStok = Decimal.min(d(perlu), ada);
  const sisaSesudah = ada.minus(dariStok);
  const isiUlang = Decimal.max(0, d(minimum ?? 0).minus(sisaSesudah));
  return { dariStok, beli: d(perlu).minus(dariStok).plus(isiUlang) };
}

/* ---------- Harga bahan dari nota (D-094) ---------- */

/** Ambang perubahan harga yang ditandai untuk ditinjau owner/Finance (bukan rem otomatis). */
export const BATAS_PERUBAHAN_HARGA_PERSEN = 20;

/**
 * Harga satu baris nota → harga per satuan pakai (+ per kemasan bila isi kemasan
 * diketahui). Konversi satuan sama persis dengan stok; tidak pasti / harga 0 = null.
 */
export function hargaDariNota(hargaSatuanNota: NilaiUang, unit: string | null, b: BahanSatuan): { perSatuan: Decimal; perKemasan: Decimal | null } | null {
  const harga = d(hargaSatuanNota);
  const isi = keSatuanStok(1, unit, b);
  if (!isi || isi.lte(0) || harga.lte(0)) return null;
  const perSatuan = harga.dividedBy(isi).toDecimalPlaces(10, Decimal.ROUND_HALF_UP);
  const perKemasan = b.usage_unit && b.usage_qty_per_pack && d(b.usage_qty_per_pack).gt(0) ? perSatuan.times(d(b.usage_qty_per_pack)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : null;
  return { perSatuan, perKemasan };
}

/** Perubahan harga lama → baru dalam persen (null bila belum ada harga lama). */
export function perubahanHarga(lama: NilaiUang | null, baru: NilaiUang): Decimal | null {
  if (lama == null || d(lama).lte(0)) return null;
  return d(baru).minus(d(lama)).dividedBy(d(lama)).times(100);
}
