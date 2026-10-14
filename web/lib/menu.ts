/* ==========================================================================
   MENU — kategori & dapur. Kategori dipakai Quotation Builder untuk "tukar
   menu dengan kategori yang sama" (01-SPEC C/E). Kode tersimpan di DB, jadi
   jangan diganti setelah dipakai. Murni.
   ========================================================================== */

export const KATEGORI_MENU = {
  rice: "Nasi & karbo",
  soup: "Sup",
  beef: "Daging sapi/kambing",
  chicken: "Ayam",
  fish: "Ikan",
  seafood: "Seafood",
  egg_tofu: "Telur, tahu & tempe",
  vegetable: "Sayur",
  side: "Lauk pendamping",
  appetizer: "Appetizer",
  condiment: "Sambal & pelengkap",
  snack: "Snack & kerupuk",
  dessert: "Dessert",
  fruit: "Buah",
  beverage: "Minuman",
  pasta: "Pasta & mie",
  stall: "Stall",
} as const;
export type KategoriMenu = keyof typeof KATEGORI_MENU;

export const LABEL_DAPUR = { masak: "Dapur Masak", pastry: "Dapur Pastry/Bersih" } as const;
