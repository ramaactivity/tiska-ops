// Video panduan Owner · 1 — Dashboard dari HP (hanya membaca, tidak mengubah data).
import { akunPeran } from "../../lib/demo.mjs";
import { baris, css, kartu, teks } from "../../lib/pilih.mjs";

const panggung = akunPeran("owner", "Owner Tiska", "ujitmp_vid_owner", { gender: "P", avatar: "w.p05" });

export default {
  judul: "Dashboard: kondisi bisnis dari HP",
  divisi: "Owner",
  bagian: "Bagian 1",
  layar: "hp",
  mulai: "/dasbor",
  ...panggung,
  // data tes milik tim ikut tampil di daftar terbaru — di video diganti nama fiktif
  ganti: [...panggung.ganti, ["PT Indesso (tes Rahma)", "PT Sinar Lestari"], ["Ibu Santi - PT Seelindo Sejahteratama (Tes Reza)", "Ibu Santi - PT Cahaya Boga"]],

  langkah: [
    { poin: "Dashboard", sub: "Kondisi bisnis, cukup dari HP", narasi: "Ini halaman Dashboard. Dari sini, Bapak dan Ibu bisa melihat kondisi uang dan pekerjaan Tiska, kapan saja, cukup dari HP.",
      sorot: [css("main h1"), teks("Ringkasan uang, tagihan")] },
    { poin: "Pengingat kuning", sub: "Pekerjaan yang perlu ditindak", narasi: "Kalau ada pekerjaan yang perlu ditindak, muncul pengingat berwarna kuning di paling atas. Contohnya, stock opname bulan ini belum dilakukan.",
      sorot: kartu("belum dilakukan") },
    { poin: "Ulang tahun karyawan", sub: "Minggu ini", narasi: "Di bawahnya ada pengingat ulang tahun karyawan minggu ini, supaya tidak ada yang terlewat.",
      sorot: kartu("Ulang tahun minggu ini") },
    { poin: "Penjualan bulan ini", sub: "Acara yang sudah terjadi", narasi: "Angka besar ini adalah penjualan bulan ini. Yang dihitung hanya acara yang sudah terjadi.",
      sorot: kartu("Penjualan diakui") },
    { poin: "Proyeksi ke depan", sub: "Acara & quotation yang akan datang", narasi: "Baris Proyeksi ke depan menunjukkan nilai acara yang belum terjadi, dan quotation yang masih menunggu jawaban pelanggan.",
      sorot: teks("Proyeksi ke depan") },
    { poin: "Piutang berjalan", sub: "Acara selesai, belum lunas", narasi: "Piutang berjalan adalah tagihan yang acaranya sudah selesai, tapi belum lunas dibayar.",
      sorot: kartu("Piutang berjalan") },
    { poin: "Jatuh tempo", sub: "Perlu segera ditagih", narasi: "Kotak kuning Jatuh tempo menunjukkan berapa invoice yang sudah lewat waktu bayarnya, dan perlu segera ditagih.",
      sorot: kartu("Jatuh tempo") },
    { poin: "Uang muka & diterima di muka", sub: "DP masuk · lunas sebelum acara", narasi: "Uang muka adalah DP yang sudah masuk. Diterima di muka adalah invoice yang sudah lunas, tapi acaranya belum berjalan.",
      sorot: [kartu(/^Uang muka$/), kartu("Diterima di muka")] },
    { poin: "Prioritas tagih", sub: "Paling atas = paling lama terlambat", narasi: "Bagian Prioritas tagih mengurutkan pelanggan yang paling lama terlambat membayar. Yang paling atas, paling perlu ditagih.",
      sorot: [teks("Prioritas tagih"), kartu("10 hr")] },
    { poin: "Quotation & invoice terbaru", sub: "Ketuk untuk melihat rincian", narasi: "Paling bawah ada quotation dan invoice terbaru. Ketuk salah satunya untuk melihat rincian lengkap.",
      sorot: [teks("Quotation terbaru"), baris("QUO/TC/2610/012")] },
  ],

  ringkasan: ["Lihat penjualan bulan ini & proyeksi", "Kotak kuning = perlu ditindak", "Cek Prioritas tagih untuk ditagih"],
  berikutnya: "Bagian 2 · Operasional Hari Ini",
};
