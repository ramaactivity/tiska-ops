# 23 — Layar Dapur v2: halaman Kontrol + antrian kerja dapur

Status: rancangan (26 Nov 2026). Tahap 1 (pondasi) sudah dibangun — lihat D-230. Sisanya menunggu persetujuan Rama.

## 1. Kenapa v2

Audit 24 Nov 2026 (data produksi):

- Layar lama hanya membaca **Event**; hanya 8 dari 101 invoice yang pernah dibuatkan Event, kloter/mobil/penugasan
  driver belum pernah diisi. Layar kosong hampir setiap hari. → Tahap 1: layar membaca **invoice** langsung.
- Jam pesanan teks bebas ("09.30 WIB brkt dr Julang", "10.00 - Diambil di Outentika", "08.00 WIB dan 11.00 WIB -
  tiba dilokasi"): berangkat/tiba/siap saji bercampur, mesin tidak bisa menghitung mundur dengan benar.
- Jadwal kerja dapur yang sebenarnya hidup di grup WA **"NEW Tim Kitchen TISKA"**, diketik Mbak Rita.
- Rama (26 Nov): layar TV dibuka lewat link/PWA layar penuh; di dashboard perlu **halaman kontrol operator** untuk
  menavigasi, menyiapkan, dan mengendalikan layar — seperti sistem antrian yang matang. Sekarang menu "Layar Dapur"
  langsung membuka tampilan TV, tanpa halaman kontrol.

## 2. Cara kerja Mbak Rita di grup kitchen (yang harus ditiru, bukan diganti)

Tiga jenis pesan berulang:

**a. 🛎️ KONFIRMASI NEW ORDER** (Admin / Mbak Rita): nama pemesan & instansi, HP, acara, tanggal (berhari-hari:
"Arrival Dinner: Minggu, 29 Nov 2026 · DAY-1: Senin, 30 Nov 2026 …"), waktu acara (Lunch Break + Dinner), jumlah
dengan **pembagian** (30 pax = 20 Regular + 10 Vegetarian), alamat **per sesi** (Lunch → Cafetaria, Dinner → DG
Residence), **ORDER KHUSUS** (bahan sayur, ayam, daging & bumbu organik), "menu menyusul / diskusi menyusul", plus
gambar invoice. → Semua sudah ada di invoice; aplikasi bisa menyusun pesan ini sendiri.

**b. 📌 JADWAL PERSIAPAN MASAK + PACKING** (contoh WISUDA UNPAK, Rabu 25 Nov 2026, 00.00–10.00):
- Dibagi **Sesi Masak** (Sesi-1: Snack Box, Snack Senat + Breakfast; Sesi-2: Snack + Lunch Box & Buffet Siang) dan
  **Batch** tim DW packing dengan totalnya (1.693 Snack Box + 30 Snack Box Senat).
- Langkah berjam **mulai–selesai yang saling tumpang tindih** (tim DW menata sementara tim masak memasak):
  "01.00–02.30 Target nata isi Snack Box = 550 box pertama 👉🏻 langsung masuk mobil", "01.30–03.30 Sesi masak menu
  Breakfast", "03.30–04.00 Menu Breakfast siap nata masuk kontainer".
- **Target jumlah per langkah** (550 · 550 · 593 box) — pecahan dari total pesanan.
- **KLOTER-n** dengan jam, tujuan, dan isi muatan ("04.00 [KLOTER-1] Siap delivery estafet ke Puri Begawan: 1.100
  Snack Box, 80 pax Breakfast").
- **Lokasi kerja**: Outentika (gelar snack box), Julang (dapur, titik berangkat), venue tujuan.
- **‼️ Catatan**: pembagian tim DW pada jam bersamaan; "jika bisa dikerjakan lebih cepat, lebih baik".

**c. JADWAL PERSIAPAN ORDER BESOK** (pesanan kecil): daftar pesanan, nama juru masak per sesi ("Sesi Masak [Kak Nay,
Ibu Nanik]"), langkah singkat, dan cara serah: "siap Delivery brkt dr Julang" vs "ready to PICK-UP".

Kebiasaan lain: daftar **tim yang bertugas** per hari ("Tim TC: Bu Tinne, Afifah (Imajinar), Pak Asep, Pak Nung");
**perubahan mendadak lewat chat** ("‼️ bukibu.. untuk snack box senat jadinya ukuran kue tampah ya, jangan yang mini",
06.13 di hari H); jadwal **diedit larut malam** (Edited 23:55) — orang yang sudah membaca versi lama tidak tahu ada
perubahan.

Yang dipertahankan: istilahnya (Sesi Masak, Batch, nata, Kloter, estafet, ready to pick-up), urutan & ikon ⏰ 👉🏻 ‼️,
dan WA tetap jalan. Yang diarahkan ke aplikasi: jadwal diketik **sekali** di aplikasi → TV, HP tim, dan pesan WA
keluar dari sumber yang sama (memori "kebutuhan tim, alur baru": jalan tengah).

## 3. Dua permukaan

### A. Kontrol Dapur (dashboard, untuk operator: Mbak Rita / kepala dapur / admin / owner)

Menu **Operasional → Kontrol Dapur**. Tab:

1. **Live** — pratinjau tiap layar yang sedang tayang; **antrian langkah hari ini** (sedang berjalan · berikutnya ·
   telat) dengan tombol Mulai / Selesai / Geser 15 menit; status kloter; kotak **Panggil dapur**: ketik pesan,
   template sekali tekan ("Driver sudah datang", "Kloter 2 siap angkut?", "Kumpul sebentar"), nanti pesan suara;
   riwayat panggilan dengan tanda **"Didengar 14.05"** dari layar.
2. **Rencana masak** — per tanggal & pesanan: Sesi masak, Batch, langkah (jam mulai–selesai, pekerjaan, target
   jumlah, siapa, lokasi), kloter (jam, tujuan, muatan), catatan. **Draf otomatis dari invoice** (total box dipecah
   per batch, dihitung mundur dari jam tiba/siap saji), lalu operator menggeser. Tombol **Salin ke WA** menghasilkan
   format Mbak Rita persis. Perubahan setelah tayang → kartu "BERUBAH" di TV yang harus ditekan "Dibaca".
3. **Layar** — daftar TV/monitor: nama, lokasi, tampilan (Dapur Masak · Pastry/Bersih · Area muat/Kloter · Semua),
   status online (terakhir terlihat), suara nyala/mati, jam tayang. **Pasang layar baru**: TV membuka link →
   muncul kode 4 angka → operator memasukkan kode di sini (TV tidak memakai akun orang). Tombol: Tes suara, Muat
   ulang, Ganti tampilan — dari HP, tanpa menyentuh TV.
4. **Pengumuman otomatis** — kapan layar bicara (ambang 60/30/15 menit, tiap langkah mulai, kloter berangkat), jam
   tenang, kalimat baku (nanti bisa diganti rekaman suara orang Tiska).
5. **Evaluasi** — rencana vs kenyataan per langkah, kloter tepat waktu, kecepatan nata (box/jam) → dipakai untuk
   draf otomatis berikutnya.

### B. Layar TV (link layar penuh / PWA, tanpa navigasi)

- Jam besar, **SEKARANG** (langkah berjalan, sisa waktu, target 550 box), **BERIKUTNYA**, papan kloter.
- Catatan dapur & ORDER KHUSUS (organik, vegetarian 10 pax) sebagai kotak besar.
- Panggilan dari kantor: ding-dong + teks besar + suara, tombol **Didengar 👍**; tombol **Panggil kantor** (notifikasi
  ke HP admin).
- Tanda koneksi putus, layar tetap menyala, tampilan besok saat kosong (sudah di Tahap 1).

## 4. Data & teknik (aditif)

- `kitchen_screens` (nama, lokasi, tampilan, token perangkat, terakhir terlihat, setelan suara/jam tayang).
- `kitchen_steps` (tanggal, invoice, sesi, batch, jam mulai/selesai, pekerjaan, target & satuan, tim, lokasi, jenis
  masak/nata/packing/kloter/lainnya, status, mulai/selesai sebenarnya, jumlah tercapai, diubah oleh/kapan).
- `kitchen_calls` (teks / berkas suara di R2, pengirim, layar tujuan, dibuat, didengar oleh layar & jam).
- Sinyal langsung ke TV lewat **Supabase Realtime** (gratis, sudah terpasang `@supabase/supabase-js`), polling 60 detik
  tetap jadi cadangan. Polling cepat ke Vercel tidak dipakai: 3 layar × tiap 5 detik ≈ 1 juta panggilan/bulan, batas
  paket gratis.
- Tanpa harga di semua permukaan dapur (aturan bisnis).

## 5. Urutan kerja

| Tahap | Isi | Status |
|---|---|---|
| 1 Pondasi | Layar baca invoice, catatan dapur & catatan menu, tanda koneksi putus, layar tetap menyala, besok saat kosong, ding-dong + Tes suara, pengumuman jam pesanan | ✅ D-230 |
| 2 Kontrol v1 | Halaman Kontrol Dapur: tab Layar (pasang kode, tampilan per layar, online, tes suara, muat ulang) + Panggil dapur (ketik & template) + Didengar; Realtime | ⏳ |
| 3 Rencana & antrian | Rencana masak format Mbak Rita, draf otomatis dari invoice, Salin ke WA, SEKARANG/BERIKUTNYA di TV, Mulai/Selesai | ⏳ |
| 4 Lapangan | Hitung progres nata (+50 box), perubahan pesanan wajib dibaca, pesan suara, Panggil kantor | ⏳ |
| 5 Belajar | Evaluasi rencana vs kenyataan, estimasi otomatis, nyala/mati TV terjadwal | ⏳ |

Perangkat yang disarankan: TV box Android + Chrome (suara Google bahasa Indonesia) dan speaker aktif lewat kabel aux
(Bluetooth sering tertidur/putus). Satu PC dengan dua monitor juga bisa: dua jendela, masing-masing satu tampilan.
