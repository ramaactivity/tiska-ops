/* ==========================================================================
   URUTAN ISI MENU (D-159) — murni, aman di browser.

   Urutan baku Tiska (pricelist & dokumen): Starter → Soup → Rice → Main course
   (beef, chicken, fish, seafood, telur/tahu, vegetable, lauk, pasta) → Condiment
   → Dessert → Beverages. Kategori yang tidak dipesan cukup dilewati.
   Dipakai saat MENAMBAH isi: isi baru diselipkan di tempat kategorinya, isi yang
   sudah ada tidak diacak (urutan manual tetap dihormati).
   ========================================================================== */

const PERINGKAT_KATEGORI: Record<string, number> = {
  appetizer: 0,
  soup: 1,
  rice: 2,
  beef: 3,
  chicken: 3,
  fish: 3,
  seafood: 3,
  egg_tofu: 3,
  vegetable: 3,
  side: 3,
  pasta: 3,
  stall: 3,
  condiment: 4,
  snack: 4,
  dessert: 5,
  fruit: 5,
  beverage: 6,
};

/** Tebakan dari nama bila menu belum berkategori ("Sup Tekwan", "Condiments: …", "Mineral Water"). Urutan cek penting. */
const POLA: [number, RegExp][] = [
  [6, /\b(beverages?|drinks?|minuman|mineral water|infused water|water|tea|teh|kopi|coffee|juice|jus|punch|sirup|wedang|es teh|lemon tea)\b/i],
  // Starter sebelum dessert: "Asinan Buah" adalah starter, bukan buah potong.
  [0, /\b(starters?|appeti[sz]ers?|salad|selada|asinan|rujak|lumpia|bruschetta|spring roll|quesadilla|gado)\b/i],
  [5, /\b(desserts?|pudd?ing|puding|buah|fruits?|cake|kue|es buah|es campur|cocktail|klepon|lapis)\b/i],
  [4, /\b(condiments?|sambal|kerupuk|krupuk|emping|acar|keripik|chips|crackers?|rempeyek)\b/i],
  [1, /\b(soups?|sup|sop|soto|tom yum|bisque|chowder)\b/i],
  [2, /\b(nasi|rice|bihun|lontong|ketupat)\b/i],
];

export function peringkatIsi(nama: string, kategori?: string | null): number {
  if (kategori && kategori in PERINGKAT_KATEGORI) return PERINGKAT_KATEGORI[kategori];
  // "Condiments: Indonesian home-made Chili" → yang menentukan kata sebelum titik dua.
  const depan = nama.includes(":") ? nama.split(":")[0] : nama;
  for (const [p, pola] of POLA) if (pola.test(depan)) return p;
  for (const [p, pola] of POLA) if (pola.test(nama)) return p;
  return 3; // main course
}

/** Indeks tempat isi baru diselipkan: sesudah isi terakhir yang peringkatnya ≤ peringkat isi baru. */
export function posisiSisipIsi(peringkatAda: number[], peringkatBaru: number): number {
  let i = -1;
  peringkatAda.forEach((p, k) => {
    if (p <= peringkatBaru) i = k;
  });
  return i + 1;
}

/**
 * Nama isi dengan nomor urut (D-162): "1. Nasi Putih", "2. Tea" — dipakai dokumen cetak, pratinjau, Excel, lembar dapur,
 * dan halaman detail. Nomor/strip yang sudah ikut diketik di nama ("1. Coffee…", "- Tea") dibuang dulu supaya tidak dobel.
 */
export function namaIsiBernomor(nama: string, i: number): string {
  return `${i + 1}. ${nama.replace(/^\s*(?:\d+\s*[.)]|[-–•*])\s*/, "").trim()}`;
}

