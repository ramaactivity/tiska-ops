/* ==========================================================================
   KIT BRAND TISKA (D-226) — logo resmi, warna, huruf, aturan pakai.

   Sumber: panduan brand Tiska di Studio Konten (`brands/tiska/brand.md`,
   `tokens.json`; logo ® resmi dari Rama 10 Nov 2026). File logo ada di
   public/brand/unduh/ (+ ZIP berisi semuanya). Logo lama tanpa ® tidak
   disediakan: panduan brand melarangnya untuk konten baru. Logo sponsorship &
   foto profil dibuat dari logo resmi oleh scripts/buat-logo-turunan.py (D-227).
   ========================================================================== */

export const FOLDER_UNDUH = "/brand/unduh";
export const ZIP_LOGO = { file: "logo-tiska-semua.zip", ukuran: "2,8 MB" };

export type LogoBrand = {
  file: string;
  warna: "emas" | "hitam" | "putih";
  bentuk: "mendatar" | "tegak";
  lebar: number;
  tinggi: number;
  /** Latar tempat logo ini dipakai — juga latar pratinjaunya. */
  latar: "gelap" | "terang";
  kapan: string;
};

export const LOGO: LogoBrand[] = [
  { file: "logo-tiska-emas-mendatar.png", warna: "emas", bentuk: "mendatar", lebar: 1741, tinggi: 809, latar: "gelap", kapan: "Latar gelap — logo utama" },
  { file: "logo-tiska-emas-tegak.png", warna: "emas", bentuk: "tegak", lebar: 1218, tinggi: 1600, latar: "gelap", kapan: "Latar gelap — logo utama" },
  { file: "logo-tiska-hitam-mendatar.png", warna: "hitam", bentuk: "mendatar", lebar: 1745, tinggi: 813, latar: "terang", kapan: "Latar terang, dokumen, cetak hitam putih" },
  { file: "logo-tiska-hitam-tegak.png", warna: "hitam", bentuk: "tegak", lebar: 1216, tinggi: 1593, latar: "terang", kapan: "Latar terang, dokumen, cetak hitam putih" },
  { file: "logo-tiska-putih-mendatar.png", warna: "putih", bentuk: "mendatar", lebar: 1747, tinggi: 868, latar: "gelap", kapan: "Di atas foto yang ramai" },
  { file: "logo-tiska-putih-tegak.png", warna: "putih", bentuk: "tegak", lebar: 1217, tinggi: 1594, latar: "gelap", kapan: "Di atas foto yang ramai" },
];

export type WarnaBrand = { nama: string; hex: string; peran: string };

export const WARNA: WarnaBrand[] = [
  { nama: "Emas", hex: "#C4A05A", peran: "Warna utama" },
  { nama: "Emas di latar gelap", hex: "#D8B876", peran: "Teks & garis emas di atas hitam" },
  { nama: "Emas di latar terang", hex: "#A07C34", peran: "Teks emas di atas putih/krem" },
  { nama: "Emas muda", hex: "#ECD5A0", peran: "Aksen lembut" },
  { nama: "Mint", hex: "#8FC9BF", peran: "Dari logo, aksen" },
  { nama: "Mint tua", hex: "#5A9A8F", peran: "Mint untuk teks" },
  { nama: "Hitam tinta", hex: "#0E0D0A", peran: "Latar gelap" },
  { nama: "Krem kertas", hex: "#F6F1E7", peran: "Latar terang" },
];

export type HurufBrand = { nama: string; peran: string; catatan: string; tautan?: string };

export const HURUF: HurufBrand[] = [
  { nama: "Resort Sans", peran: "Judul", catatan: "Tipis, huruf kapital, judul pendek saja. Versi demo — angka & tanda baca pakai Tenor Sans. File minta ke Rama." },
  { nama: "Heatwood", peran: "Aksen", catatan: "Satu kata bergaya tulisan tangan di judul. File minta ke Rama." },
  { nama: "Tenor Sans", peran: "Isi, angka, harga", catatan: "Gratis.", tautan: "https://fonts.google.com/specimen/Tenor+Sans" },
];

export const ATURAN_LOGO = [
  "Latar gelap → logo emas. Latar terang → logo hitam. Di atas foto ramai → logo putih.",
  "Pakai file utuh. Jangan dirakit ulang atau diganti warnanya.",
  "Logo lama tanpa ® tidak dipakai lagi untuk materi baru.",
  "Kirim lewat WhatsApp: logo berlatar transparan sebaiknya dilampirkan sebagai Dokumen — kalau dikirim sebagai foto, WhatsApp mengisi latarnya.",
];

export const IDENTITAS = {
  tagline: "Celebrate love with the finest flavours",
  situs: "www.tiskacatering.com",
};

export type GambarBrand = { file: string; judul: string; kapan: string; lebar: number; tinggi: number; latar: "gelap" | "terang" };

/** Foto profil WhatsApp/Instagram: persegi, logo muat di dalam lingkaran (WA & IG memotongnya bulat). */
export const FOTO_PROFIL: GambarBrand[] = [
  { file: "dp-tiska-emas.png", judul: "Emas · latar hitam", kapan: "Grup WA, akun WA Business, Instagram", lebar: 1080, tinggi: 1080, latar: "gelap" },
  { file: "dp-tiska-hitam.png", judul: "Hitam · latar krem", kapan: "Versi terang", lebar: 1080, tinggi: 1080, latar: "terang" },
  { file: "dp-tiska-simbol.png", judul: "Simbol saja", kapan: "Paling jelas di ukuran kecil (daftar chat)", lebar: 1080, tinggi: 1080, latar: "gelap" },
];

/** Kartu logo untuk deretan logo sponsor (spanduk, backdrop, flyer acara) — ® ditambahkan dari logo resmi. */
export const LOGO_SPONSOR: GambarBrand[] = [
  { file: "logo-tiska-sponsor-1.png", judul: "Putih · kartu hitam", kapan: "Deretan logo berlatar terang", lebar: 1650, tinggi: 1000, latar: "terang" },
  { file: "logo-tiska-sponsor-2.png", judul: "Putih · transparan", kapan: "Di atas latar gelap / foto", lebar: 1650, tinggi: 1000, latar: "gelap" },
  { file: "logo-tiska-sponsor-3.png", judul: "Hitam · kartu putih", kapan: "Deretan logo berlatar gelap", lebar: 1650, tinggi: 1000, latar: "gelap" },
  { file: "logo-tiska-sponsor-4.png", judul: "Hitam · transparan", kapan: "Di atas latar terang", lebar: 1650, tinggi: 1000, latar: "terang" },
  { file: "logo-tiska-sponsor-5.png", judul: "Emas · kartu putih", kapan: "Deretan logo berwarna", lebar: 1650, tinggi: 1000, latar: "gelap" },
  { file: "logo-tiska-sponsor-6.png", judul: "Emas · transparan", kapan: "Di atas latar gelap", lebar: 1650, tinggi: 1000, latar: "gelap" },
];
