/* ==========================================================================
   WARNA DOKUMEN CETAK (dibawa dari aplikasi lama 6a37bc2, D-106)

   Dipakai tiga lembar: quotation, invoice, dan PO To Kitchen.

     NAMA MENU   navy blue, tebal
     ISI PAKET   hitam, baik yang ada keterangan jumlahnya maupun tidak

   Warnanya menandai DI MANA SATU MENU MULAI, supaya mata bisa melompat
   dari menu ke menu; isi paket di bawahnya hitam, sebab itu yang dibaca
   baris demi baris. Ditulis SEKALI di sini supaya ketiga lembar dari satu
   pesanan tidak menyimpang warnanya.
   ========================================================================== */

/**
 * Navy untuk nama menu di ketiga lembar cetak. Sejak desain dokumen premium (D-186, 16 Nov 2026) memakai navy
 * merek Tiska Ops (#1f2a5c) — tetap navy tua yang terbaca tebal saat dicetak hitam putih, kini senada dengan kop.
 */
export const NAVY = "#1f2a5c";

/* Palet dokumen premium (D-186): invoice, quotation, kwitansi memakai token yang sama. */
/** Tinta teks utama. */
export const TINTA = "#1c1f2e";
/** Teks keterangan/label. Kontras ≥ 4,5:1 di atas putih & krem. */
export const REDUP = "#585b6c";
/** Emas logo Tiska — garis kop & aksen kecil, bukan untuk teks kecil. */
export const EMAS = "#b08a3a";
/** Latar krem lembut — panel acara, judul sesi. Hampir putih saat dicetak hitam putih. */
export const KREM = "#f7f3ea";
/** Garis pemisah tipis & hangat (panel, kolom kop). */
export const GARIS = "#e4ddcc";
/** Garis horizontal tabel rincian — cukup terlihat, juga saat dicetak hitam putih (Rama: "tetap ada garis"). */
export const GARIS_BARIS = "#c9bfa8";
/** Garis vertikal tabel rincian — setengah tebal & lebih muda, memisah kolom tanpa terlihat seperti lembar Excel. */
export const GARIS_KOLOM = "#d9d0bd";
