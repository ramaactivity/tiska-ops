/* ==========================================================================
   KONTROL DAPUR (docs/23 §6 P1) — dipakai halaman Kontrol & Layar Dapur. Murni.

   TV menanyakan kendali lewat POST /layar-dapur/sinyal setiap INTERVAL_SINYAL_MS
   sambil melaporkan statusnya. Supabase Realtime belum dipakai: aplikasi memakai
   login sendiri (bukan Supabase Auth), jadi kanal realtime yang aman butuh kerja
   tambahan — polling kecil ini cukup untuk MVP (1–2 layar).
   ========================================================================== */

export const INTERVAL_SINYAL_MS = 6_000;
/** Layar dianggap online bila melapor dalam rentang ini. */
export const BATAS_ONLINE_MS = 20_000;
/** Pengumuman yang lebih tua dari ini tidak ditayangkan lagi oleh layar yang baru menyala. */
export const UMUR_PENGUMUMAN_MS = 15 * 60_000;
/** Lama pengumuman tampil di layar penuh TV. */
export const TAMPIL_PENGUMUMAN_MS = 20_000;

export const TEMPLATE_PENGUMUMAN = [
  "Driver sudah datang, siapkan pesanan untuk diangkut.",
  "Kloter berikutnya sudah siap diangkut?",
  "Mohon kumpul sebentar di dapur.",
  "Ada perubahan pesanan, cek catatan dapur di layar.",
  "Tamu datang lebih cepat, percepat persiapan.",
] as const;

export type ModeTayang = "otomatis" | "tahan";
export type Perintah = "next" | "prev" | "ulang";

/** Jawaban sinyal untuk TV. */
export type SinyalLayar = {
  mode: ModeTayang;
  perintah: Perintah | null;
  seq: number;
  running: string | null;
  pengumuman: { id: string; teks: string } | null;
};

/** Laporan status dari TV. */
export type LaporanLayar = {
  layar: string;
  suara: boolean;
  penuh: boolean;
  ukuran: string;
  tayang: string | null;
  dapur: "masak" | "pastry" | null;
  dibacakan: string | null;
};

/** Online bila terakhir melapor < BATAS_ONLINE_MS lalu. */
export const layarOnline = (terakhir: Date | string, kini = new Date()) =>
  kini.getTime() - new Date(terakhir).getTime() < BATAS_ONLINE_MS;

/** Durasi satu putaran running text: kira-kira 9 huruf per detik supaya terbaca orang tua, minimal 12 detik. */
export const durasiRunning = (teks: string) =>
  Math.max(12, Math.round(teks.length / 9)) * 1000;
