/* ==========================================================================
   BAHAN — konstanta & aturan murni, dipakai halaman dan server action.
   ========================================================================== */

/** Kategori dari "HPP Makanan - BOM.xlsx" + "Lainnya" untuk bahan pengganti. */
export const KATEGORI_BAHAN = [
  "Groceries",
  "Packaging",
  "Spices",
  "Vegetable & Fruit",
  "Meat",
  "Pastry",
  "Non Halal",
  "Retail",
  "Lainnya",
] as const;

export const LABEL_STATUS_BAHAN: Record<string, string> = {
  ok: "Lengkap",
  lengkapi: "Lengkapi harga/konversi",
  cek_konversi: "Cek konversi",
};
