import type { KategoriMenu } from "@/lib/menu";

/**
 * Isi menu yang diketik bebas di quotation → bagian-bagian data menu (D-165), untuk kartu "Daftarkan ke menu".
 *   "Sate Daging Haas - Indonesian Spiced Beef Satay (not spicy)"
 *     → nama "Sate Daging Haas", Inggris "Indonesian Spiced Beef Satay", keterangan "not spicy"
 *   "Dessert: Fresh Fruits (Semangka, Melon, Nanas)" → awalan "Dessert", nama "Fresh Fruits", keterangan "Semangka, Melon, Nanas"
 * Hanya usulan: semua kolom tetap bisa diubah di kartu sebelum disimpan.
 */
export type PecahanIsi = { nama: string; namaEn: string; keterangan: string; awalan: string; gandaMenu: boolean };

export function pecahNamaIsi(teks: string): PecahanIsi {
  let t = teks.replace(/^\s*(?:\d+\s*[.)]|[-–•*])\s*/, "").trim();
  let awalan = "";
  // Awalan kategori pendek di depan titik dua ("Dessert:", "Snack Asin:"), bukan bagian nama menu.
  const m = t.match(/^([^:]{2,24}):\s*(.+)$/);
  if (m && m[1].trim().split(/\s+/).length <= 3) {
    awalan = m[1].trim();
    t = m[2].trim();
  }
  // "Nasi Daun Jeruk - … / Nasi Putih - …" = dua menu dalam satu baris.
  const gandaMenu = /\s\/\s/.test(t) && (t.match(/\s[-–]\s/g)?.length ?? 0) >= 2;
  let keterangan = "";
  const k = t.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (k && k[1].trim()) {
    t = k[1].trim();
    keterangan = k[2].trim();
  }
  let namaEn = "";
  const d = t.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (d && !gandaMenu) {
    t = d[1].trim();
    namaEn = d[2].trim();
  }
  return { nama: t, namaEn, keterangan, awalan, gandaMenu };
}

const POLA_KATEGORI: [KategoriMenu, RegExp][] = [
  ["beverage", /\b(beverages?|drinks?|minuman|tea|teh|coffee|kopi|juice|jus|water|air mineral|punch|sirup|lemonade)\b/i],
  ["dessert", /\b(desserts?|pudd?ing|puding|cake|kue|pie|pastry|es krim|ice cream|cendol|kolak)\b/i],
  ["fruit", /\b(fruits?|buah)\b/i],
  ["condiment", /\b(condiments?|sambal|chili|chilli|acar|kerupuk sambal)\b/i],
  ["snack", /\b(snacks?|kerupuk|keripik|chips?|crackers?|risoles|pastel|lemper|bugis|kletikan)\b/i],
  ["appetizer", /\b(starters?|appetizers?|asinan|salad|gado)\b/i],
  ["soup", /\b(soup|sup|soto|sop|tekwan)\b/i],
  ["seafood", /\b(udang|shrimp|prawn|cumi|squid|seafood|kerang)\b/i],
  ["fish", /\b(ikan|fish|dori|gurame|gurami|kakap|salmon|tuna|bandeng)\b/i],
  ["chicken", /\b(ayam|chicken|bebek|duck)\b/i],
  ["beef", /\b(sapi|beef|kambing|lamb|mutton|daging|rendang|empal)\b/i],
  ["egg_tofu", /\b(telur|egg|tahu|tofu|tempe)\b/i],
  ["pasta", /\b(pasta|spaghetti|mie|mi|noodles?|bihun|kwetiau|lasagna)\b/i],
  ["rice", /\b(nasi|rice|kentang|potato|lontong|ketupat)\b/i],
  ["vegetable", /\b(sayur|vegetables?|buncis|beans?|tumis|cah|capcay|brokoli|kangkung|urap)\b/i],
];

/** Tebakan kategori: awalan ("Dessert:") menang, lalu nama Indonesia, lalu nama Inggris. */
export function tebakKategoriMenu(p: Pick<PecahanIsi, "awalan" | "nama" | "namaEn">): KategoriMenu | null {
  for (const teks of [p.awalan, p.nama, p.namaEn]) {
    if (!teks) continue;
    for (const [k, pola] of POLA_KATEGORI) if (pola.test(teks)) return k;
  }
  return null;
}
