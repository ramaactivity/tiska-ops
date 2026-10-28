// TEMPLAT episode baru: salin folder ini ke episode/<divisi>-<nomor>-<topik>/, isi, lalu: node buat.mjs <nama-folder>
// Satu langkah = satu kalimat narasi + bagian layar yang disorot. Aksi (ketuk) terjadi SETELAH kalimatnya selesai dibacakan.
import { captainDiKloterDemo } from "../../lib/demo.mjs"; // atau panggung lain di lib/demo.mjs
import { teks, tombol, isian, kolom, tautan, css } from "../../lib/pilih.mjs";

export default {
  judul: "Judul singkat episode",
  divisi: "Captain",          // muncul di kepala video: "Panduan Captain"
  bagian: "Bagian 1",
  layar: "hp",                // "hp" = video tegak 9:16 (tim lapangan) · "laptop" = 16:9 (tim kantor)
  mulai: "/beranda",          // halaman pertama setelah masuk
  ...captainDiKloterDemo(),   // akun dummy + siapkan()/bersihkan() + jamPalsu + nama fiktif
  sembunyi: [],               // kartu yang tidak dibahas, mis. ["Biar masuk gampang"]

  langkah: [
    { narasi: "Kalimat pertama, pendek dan jelas.", sorot: teks("Judul di layar") },
    // gulir dulu ke sebuah elemen:   gulirKe: teks("..."), gulirJarak: 200
    // tekan tombol setelah kalimat:  ketuk: tombol(/Simpan/)
    // ketik ke kolom (lihat rekam.mjs bila perlu aksi lain)
  ],

  ringkasan: ["Langkah penting 1", "Langkah penting 2", "Langkah penting 3"],
  berikutnya: "Bagian 2 · …",
};
