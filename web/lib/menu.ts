/* ==========================================================================
   MENU — kategori & dapur. Kategori dipakai Quotation Builder untuk "tukar
   menu dengan kategori yang sama" (01-SPEC C/E). Kode tersimpan di DB, jadi
   jangan diganti setelah dipakai. Murni.
   ========================================================================== */

/** Urutan = urutan sajian di dokumen & pricelist (D-159): starter → soup → nasi → lauk utama → pelengkap → dessert → minuman. */
export const KATEGORI_MENU = {
  appetizer: "Starter / appetizer",
  soup: "Sup",
  rice: "Nasi & karbo",
  beef: "Daging sapi/kambing",
  chicken: "Ayam",
  fish: "Ikan",
  seafood: "Seafood",
  egg_tofu: "Telur, tahu & tempe",
  vegetable: "Sayur",
  side: "Lauk pendamping",
  pasta: "Pasta & mie",
  stall: "Stall",
  condiment: "Sambal & pelengkap",
  snack: "Snack & kerupuk",
  dessert: "Dessert",
  fruit: "Buah",
  beverage: "Minuman",
} as const;
export type KategoriMenu = keyof typeof KATEGORI_MENU;

export const LABEL_DAPUR = { masak: "Dapur Masak", pastry: "Dapur Pastry/Bersih" } as const;
