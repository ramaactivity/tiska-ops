/* ==========================================================================
   DAFTAR PERAN

   Dipisah dari lib/auth.ts yang memasang penjaga "server-only": daftar ini
   juga dibutuhkan layar pemilih peran, dan layar itu berjalan di browser.
   Mengimpornya dari auth.ts akan lolos pemeriksaan tipe lalu menggagalkan
   build — tanpa petunjuk bahwa penyebabnya cuma letak berkas.

   Tidak ada apa pun di sini yang menyentuh database, cookie, atau sandi.

   Peran Tiska Ops (D-025) ditambahkan di belakang empat peran warisan;
   kodenya tersimpan di users.role, jadi TIDAK BOLEH diganti setelah dipakai.
   Daftar yang sama ditulis ulang di scripts/tambah-peran-tiska.mjs untuk
   CHECK constraint — lib/peran.test.ts menjaga keduanya tetap sama.
   ========================================================================== */

export const PERAN = [
  "admin",
  "owner",
  "direksi",
  "finance",
  "sales",
  "bizdev",
  "cost",
  "kepala_dapur",
  "dapur",
  "captain",
  "driver",
  "gudang",
  "field",
] as const;
export type Peran = (typeof PERAN)[number];

/** Nama peran sebagaimana ditulis di layar. */
export const LABEL_PERAN: Record<Peran, string> = {
  admin: "Admin",
  owner: "Owner",
  direksi: "Direksi",
  finance: "Finance & Accounting",
  sales: "Sales",
  bizdev: "Business Development",
  cost: "Cost",
  kepala_dapur: "Kepala Dapur",
  dapur: "Dapur",
  captain: "Captain",
  driver: "Driver",
  gudang: "Gudang & Purchasing",
  field: "Tim Lapangan",
};

/* ==========================================================================
   ATURAN AKSES YANG TIDAK DIATUR LEWAT CENTANG

   Satu tempat untuk tiap aturan, supaya halaman, unduhan Excel, dan server
   action tidak masing-masing menulis daftar perannya sendiri — daftar
   tersalin yang lupa diperbarui adalah cara rahasia bocor diam-diam.
   ========================================================================== */

/** Lolos ke semua halaman, apa pun isi tabel izin. Owner setara admin. */
export function aksesPenuh(peran: Peran): boolean {
  return peran === "admin" || peran === "owner";
}

/**
 * Boleh melihat HPP, biaya, dan margin (D-006). Satu-satunya gerbang untuk
 * angka rahasia — data untuk peran lain harus disaring DI SERVER memakai
 * fungsi ini, bukan sekadar disembunyikan di layar. Cost tetap termasuk:
 * pekerjaannya memang mengisi biaya acara (warisan aplikasi lama).
 */
export function bolehLihatBiaya(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "finance" || peran === "cost";
}

/** Boleh mencatat pembayaran dan mengubah status uang invoice. */
export function bolehKelolaUang(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "finance";
}

/**
 * Boleh mencatat nota belanja atas nama pemegang uang muka lain (D-146):
 * Pak Sur merekap nota, Tiya (Cost) yang menginput.
 */
export function bolehCatatBelanjaOrangLain(peran: Peran): boolean {
  return bolehKelolaUang(peran) || peran === "cost";
}

/** Boleh menandai status resep (standar/perkiraan) & mengubah porsinya. */
export function bolehUbahResep(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "kepala_dapur";
}

/**
 * Boleh mengubah angka bisnis (pajak, overhead, batas untung, ...). Dikunci
 * di sini, bukan hanya lewat centang menu: angka ini mengubah harga & HPP.
 */
export function bolehUbahAngkaBisnis(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "finance";
}

/** Boleh mengubah paket: isi, harga jual standar, status (keputusan harga). */
export function bolehUbahPaket(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "finance";
}

/** Boleh mengunggah versi pricelist & mengubah statusnya (marketing/sales). */
/** Peran kantor yang boleh menjadi penanggung jawab pesanan (D-175). Tim lapangan & dapur tidak. */
export const PERAN_PENANGGUNG_JAWAB: readonly Peran[] = ["admin", "owner", "direksi", "finance", "sales", "bizdev"];

/** Membuat & mengubah event (D-049); kepala dapur & captain hanya membaca. */
export function bolehUbahEvent(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "sales" || peran === "finance" || peran === "bizdev";
}

export function bolehKelolaPricelist(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "sales" || peran === "bizdev";
}

/** Menyetujui / mengembalikan / menolak program Ikut Pesan Menu Pesta sesudah cek HPP (D-115): Mas Reza & owner. */
export function bolehSetujuiProgram(peran: Peran): boolean {
  return aksesPenuh(peran) || peran === "finance";
}
