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
export type KategoriBahan = (typeof KATEGORI_BAHAN)[number];

/** Awalan kode bahan baru per kategori, mengikuti data impor (Retail ikut Gcs). */
export const AWALAN_KODE_BAHAN: Record<KategoriBahan, string> = {
  Groceries: "Gcs-",
  Packaging: "Pckg-",
  Spices: "Spc-",
  "Vegetable & Fruit": "Vgt-",
  Meat: "Mt-",
  Pastry: "Psty-",
  "Non Halal": "NH-",
  Retail: "Gcs-",
  Lainnya: "LN-",
};

export const LABEL_STATUS_BAHAN: Record<string, string> = {
  ok: "Lengkap",
  lengkapi: "Lengkapi harga/konversi",
  cek_konversi: "Cek konversi",
};
