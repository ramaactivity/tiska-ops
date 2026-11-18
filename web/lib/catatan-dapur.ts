import { uraikanRupiah } from "./uang";

/* ==========================================================================
   CATATAN UNTUK DAPUR & TIM (D-212)

   Dulu catatan umum diketik sebagai baris menu karena belum ada tempatnya
   ("NOTED: 65 pax -> dibagi 2 area [55 pax di area umum - 10 pax di area
   VIP]", QUO/TC/2611/006) — tercetak bernomor di dokumen klien dan masuk
   dapur sebagai "menu". Baris seperti itu dikenali dari awalannya lalu
   ditawarkan pindah ke kolom catatan dapur & tim.
   ========================================================================== */

const AWALAN = /^\s*(noted|note|nb|catatan|cat|keterangan|ket|info)(?=[\s:\-–—.]|$)[\s:\-–—.]*/i;

type BarisDasar = { item_name: string; price: string; children: unknown[] };

/** Baris menu tanpa harga & tanpa isi yang diawali NOTED/NOTE/NB/CATATAN/KET/INFO. */
export const tampakCatatan = (b: BarisDasar) =>
  AWALAN.test(b.item_name) && b.children.length === 0 && (uraikanRupiah(b.price)?.isZero() ?? true);

/** Teks catatannya tanpa awalan "NOTED:" (kolomnya sendiri sudah bernama catatan). */
export const teksCatatan = (nama: string) => nama.replace(AWALAN, "").trim();

/** Tambahkan satu catatan di baris baru, tanpa baris kosong ganda. */
export const sambungCatatan = (lama: string, baru: string) => [lama.trim(), baru.trim()].filter(Boolean).join("\n");
