import type { KunciMenu } from "@/lib/navigasi";

/* ==========================================================================
   IMPOR EXCEL / CSV (D-073) — definisi kolom per jenis data. Murni: dipakai
   template unduhan, halaman impor, dan pemeriksa baris di server.
   ========================================================================== */

export type KolomImpor = { kunci: string; judul: string; wajib?: boolean; contoh: string; ket?: string };

export type DefinisiImpor = {
  jenis: string;
  judul: string;
  izin: KunciMenu;
  kembali: string;
  kolom: KolomImpor[];
  /** Kalimat aturan duplikat, ditampilkan di halaman & petunjuk template. */
  duplikat: string;
  /** Impor user (D-105): satu sandi awal untuk semua akun, diketik di halaman impor — tidak ditulis di berkas. */
  sandiAwal?: boolean;
};

export const DEFINISI_IMPOR: Record<string, DefinisiImpor> = {
  customer: {
    jenis: "customer",
    judul: "Customer",
    izin: "pelanggan",
    kembali: "/pelanggan",
    duplikat: "Nama yang sudah ada di daftar customer dilewati (tidak dobel).",
    kolom: [
      { kunci: "name", judul: "Nama", wajib: true, contoh: "PT Sinar Jaya", ket: "Nama customer / perusahaan, minimal 3 huruf" },
      { kunci: "pic_name", judul: "PIC", contoh: "Ibu Rina", ket: "Nama orang yang dihubungi" },
      { kunci: "phone", judul: "Telepon", contoh: "081234567890", ket: "Nomor HP / WA, maks 20 karakter" },
      { kunci: "email", judul: "Email", contoh: "rina@sinarjaya.co.id" },
      { kunci: "npwp", judul: "NPWP", contoh: "0012345678404000" },
      { kunci: "address", judul: "Alamat", contoh: "Jl. Pajajaran No. 10, Bogor", ket: "Alamat untuk dicetak di quotation & invoice" },
    ],
  },
  product: {
    jenis: "product",
    judul: "Product",
    izin: "produk",
    kembali: "/produk",
    duplikat: "Nama product yang sudah ada dilewati (tidak dobel).",
    kolom: [
      { kunci: "name", judul: "Nama", wajib: true, contoh: "Sewa Tenda Sarnafil 5x5" },
      { kunci: "type", judul: "Jenis", contoh: "jasa", ket: "barang atau jasa (kosong = barang)" },
      { kunci: "unit", judul: "Satuan", contoh: "unit", ket: "kosong = pcs" },
      { kunci: "default_price", judul: "Harga", contoh: "750000", ket: "Harga standar dalam rupiah, tanpa titik juga boleh" },
      { kunci: "description", judul: "Keterangan", contoh: "Termasuk pasang & bongkar" },
    ],
  },
  menu: {
    jenis: "menu",
    judul: "Menu",
    izin: "menu",
    kembali: "/menu",
    duplikat: "Nama menu yang sudah ada dilewati (tidak dobel). Resep dihubungkan sesudahnya di halaman menu.",
    kolom: [
      { kunci: "name", judul: "Nama", wajib: true, contoh: "Ayam Bakar Taliwang" },
      { kunci: "category", judul: "Kategori", contoh: "Ayam", ket: "Nama kategori seperti di aplikasi (Ayam, Sup, Minuman, …); kosong boleh" },
      { kunci: "kitchen", judul: "Dapur", contoh: "masak", ket: "masak atau pastry; kosong boleh" },
      { kunci: "portion_factor", judul: "Faktor porsi", contoh: "1", ket: "1 = porsi penuh, 0,5 = setengah; kosong = 1" },
      { kunci: "notes", judul: "Catatan", contoh: "Pedas sedang" },
    ],
  },
  bahan: {
    jenis: "bahan",
    judul: "Bahan",
    izin: "bahan",
    kembali: "/bahan",
    duplikat: "Bahan dengan nama + merk yang sama dilewati. Kode dibuat otomatis per kategori. Harga diisi sesudahnya di halaman bahan.",
    kolom: [
      { kunci: "name", judul: "Nama", wajib: true, contoh: "Minyak Goreng" },
      { kunci: "category", judul: "Kategori", wajib: true, contoh: "Groceries", ket: "Groceries, Packaging, Spices, Vegetable & Fruit, Meat, Pastry, Non Halal, Retail, Lainnya" },
      { kunci: "brand", judul: "Merk", contoh: "Bimoli" },
      { kunci: "variant", judul: "Varian", contoh: "Pouch" },
      { kunci: "purchase_qty", judul: "Isi kemasan", contoh: "2", ket: "Angka isi satu kemasan beli" },
      { kunci: "purchase_unit", judul: "Satuan beli", contoh: "Liter" },
      { kunci: "usage_unit", judul: "Satuan resep", contoh: "ml" },
      { kunci: "usage_qty_per_pack", judul: "Isi dalam satuan resep", contoh: "2000", ket: "Satu kemasan = berapa satuan resep" },
      { kunci: "notes", judul: "Catatan", contoh: "" },
    ],
  },
  paket: {
    jenis: "paket",
    judul: "Paket",
    izin: "paket",
    kembali: "/paket",
    duplikat: "Kode atau nama paket (di lini yang sama) yang sudah ada dilewati. Isi menu harus sama dengan nama di daftar Menu.",
    kolom: [
      { kunci: "name", judul: "Nama", wajib: true, contoh: "Ayam Bakar Taliwang" },
      { kunci: "price", judul: "Harga per porsi", wajib: true, contoh: "45000" },
      { kunci: "line", judul: "Lini", contoh: "Basic Style Lunch Box", ket: "Kelompok paket; menentukan awalan kode otomatis" },
      { kunci: "code", judul: "Kode", contoh: "", ket: "Kosong = otomatis (BS-25, PR-21, …)" },
      { kunci: "isi", judul: "Isi menu", wajib: true, contoh: "Nasi Putih; Ayam Bakar Taliwang; Sayur Asem; Kerupuk; Air Mineral", ket: "Pisahkan dengan titik koma (;)" },
      { kunci: "notes", judul: "Catatan", contoh: "" },
    ],
  },
};

// Impor user (D-105): Admin & Owner sengaja tidak bisa dibuat massal — akun akses penuh dibuat satu per satu.
export const PERAN_IMPOR_USER = ["finance", "sales", "bizdev", "cost", "kepala_dapur", "dapur", "gudang", "captain", "driver", "field", "direksi"] as const;
const LABEL_PERAN_IMPOR = "Finance & Accounting, Sales, Business Development, Cost, Kepala Dapur, Dapur, Gudang & Purchasing, Captain, Driver, Tim Lapangan, Direksi";

DEFINISI_IMPOR.user = {
  jenis: "user",
  judul: "User",
  izin: "pengguna",
  kembali: "/pengguna",
  sandiAwal: true,
  duplikat: "Nama user yang sudah dipakai dilewati (tidak dobel). Sandi awal diisi di aplikasi saat impor, sama untuk semua akun, dan wajib diganti pemiliknya saat pertama masuk.",
  kolom: [
    { kunci: "name", judul: "Nama", wajib: true, contoh: "Pak Yoga", ket: "Nama yang tampil di aplikasi, minimal 3 huruf" },
    { kunci: "username", judul: "Nama user", wajib: true, contoh: "yoga", ket: "Dipakai untuk masuk: huruf kecil, angka, titik, garis bawah, strip; minimal 3" },
    { kunci: "gender", judul: "Jenis kelamin", contoh: "L", ket: "L / P (laki-laki / perempuan) — avatar mengikuti; boleh kosong" },
    { kunci: "role", judul: "Peran", wajib: true, contoh: "Captain", ket: `Salah satu: ${LABEL_PERAN_IMPOR}. Admin & Owner dibuat satu per satu di menu User` },
    { kunci: "email", judul: "Email", contoh: "", ket: "Boleh kosong" },
    { kunci: "employment_type", judul: "Status kerja", contoh: "tetap", ket: "tetap atau freelance (kosong = tetap); dipakai tarif honor" },
  ],
};

const rapi = (s: string) => s.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();

/** Baris mentah (baris 1 = judul kolom) → objek per kunci. Judul dicocokkan longgar (huruf besar/kecil, tanda *). */
export function petakanBaris(def: DefinisiImpor, mentah: string[][]): { baris: Record<string, string>[]; kolomHilang: string[] } {
  const [judul = [], ...isi] = mentah;
  const posisi = new Map<string, number>();
  judul.forEach((j, i) => {
    const k = def.kolom.find((c) => rapi(c.judul) === rapi(j) || rapi(c.kunci) === rapi(j));
    if (k && !posisi.has(k.kunci)) posisi.set(k.kunci, i);
  });
  const kolomHilang = def.kolom.filter((c) => c.wajib && !posisi.has(c.kunci)).map((c) => c.judul);
  const baris = isi.map((b) => Object.fromEntries(def.kolom.map((c) => [c.kunci, (b[posisi.get(c.kunci) ?? -1] ?? "").trim()])));
  return { baris, kolomHilang };
}
