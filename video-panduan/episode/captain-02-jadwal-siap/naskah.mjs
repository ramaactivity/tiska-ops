// Video panduan Captain · 2 — Jadwal saya & tombol Siap.
// Mengubah video = ubah kalimat/langkah di sini, lalu: node buat.mjs captain-02-jadwal-siap
import { captainDiKloterDemo } from "../../lib/demo.mjs";
import { teks, tombol } from "../../lib/pilih.mjs";

export default {
  judul: "Jadwal saya & tombol Siap",
  divisi: "Captain",
  bagian: "Bagian 2",
  layar: "hp",
  mulai: "/beranda",
  ...captainDiKloterDemo(), // akun, siapkan/bersihkan, jamPalsu, ganti
  sembunyi: ["Biar masuk gampang"], // kartu PIN dibahas di video Bagian 1

  langkah: [
    { narasi: "Setelah masuk, Bapak langsung melihat halaman Jadwal saya. Di sini ada semua tugas Bapak, untuk hari ini dan beberapa hari ke depan.",
      sorot: teks("Jadwal saya") },
    { narasi: "Lihat angka besar ini. Ini jam berangkat dari Julang. Hari ini, Bapak berangkat jam satu siang lewat tiga puluh menit.",
      sorot: [teks("13.30"), teks("berangkat dari Julang")] },
    { narasi: "Di bawahnya tertulis tugas Bapak. Bapak sebagai captain, artinya Bapak yang memimpin tim di lokasi.",
      sorot: teks("pimpin tim") },
    { narasi: "Lalu ada mobil yang dipakai, barang yang harus dibawa, dan alamat lokasi acara.",
      sorot: [teks("Grandmax"), teks("Bawa 100 box"), teks("Jl. Juanda")] },
    { narasi: "Ini daftar menu yang dibawa. Seratus box Bistik Ayam, dan coffee break untuk seratus orang.",
      sorot: [teks("100 BOX"), teks("Kopi & Teh")] },
    { narasi: "Di bagian Tim, ada nama semua anggota tim Bapak. Tanda centang hijau artinya orang itu sudah siap. Gambar jam pasir artinya belum.",
      sorot: [teks(/^👥\s*Tim$/), teks("Mbak Sri")] },
    { narasi: "Tombol Dengarkan untuk mendengar jadwal ini dibacakan. Tombol Telepon PIC untuk langsung menelepon penanggung jawab dari pihak pelanggan.",
      sorot: [tombol(/Dengarkan/), tombol(/Telepon/)] },
    { narasi: "Kalau Bapak sudah membaca semuanya dan siap berangkat, tekan tombol biru, Siap.",
      sorot: tombol(/Siap/), ketuk: tombol(/Siap/) },
    { narasi: "Selesai. Nama Bapak sekarang bertanda centang hijau, dan kantor langsung tahu Bapak sudah siap. Tidak perlu lapor lagi lewat grup.",
      sorot: teks(/✅\s*Dadang/) },
    { narasi: "Di bawahnya muncul langkah pengiriman: dimasak, packing, lalu berangkat. Tombol-tombol ini dipakai di hari pengiriman. Caranya ada di video berikutnya.",
      tanpaToast: true, sorot: [teks("Dimasak"), tombol(/Berangkat/)] },
  ],

  ringkasan: ["Buka halaman Jadwal saya", "Baca jam berangkat, tugas, barang & alamat", "Tekan tombol Siap kalau sudah siap"],
  berikutnya: "Bagian 3 · Berangkat, sampai & foto bukti",
};
