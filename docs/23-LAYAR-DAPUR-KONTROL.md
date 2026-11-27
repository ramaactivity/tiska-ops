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

1. **Live (ruang kontrol)** — Rama 26 Nov: operator harus leluasa mengatur manual, seperti mesin antrian.
   - Pratinjau tiap layar yang sedang tayang (apa yang dilihat dapur saat ini).
   - Mode per layar: **Otomatis** (ikut jam) atau **Manual** (operator yang menentukan tayangan).
   - Tombol antrian: **Next** (langkah/sesi berikutnya tayang & diumumkan), **Prev**, **Recall** (umumkan ulang yang
     sedang tayang atau panggilan terakhir), **Tayangkan** pesanan/sesi tertentu, **Fokus** (satu pesanan layar
     penuh), **Sembunyikan** pesanan, ubah urutan, Mulai / Selesai / Geser 15 menit per langkah.
   - **Umumkan**: ketik → TV ding-dong + teks besar + dibacakan; template sekali tekan ("Driver sudah datang",
     "Kloter 2 siap angkut?", "Kumpul sebentar"); riwayat panggilan dengan tanda **"Didengar 14.05"** dari layar.
   - **Bicara langsung** (permintaan atasan: "seperti CCTV, dari HP/laptop ngomong, suaranya keluar di speaker
     dapur"): tombol tahan-untuk-bicara di HP/laptop operator → suara mengalir langsung ke browser TV (WebRTC,
     jeda < 1 detik) → speaker dapur. Sinyal sambungan lewat Supabase Realtime; jalur relay TURN Cloudflare (paket
     gratis, akun Cloudflare yang sama dengan R2) untuk HP yang memakai data seluler. Bila sambungan langsung gagal,
     otomatis jatuh ke **pesan suara** (direkam lalu diputar di TV, jeda 2–5 detik). Batas jujur: browser TV wajib
     sudah "Nyalakan suara" sekali setelah dinyalakan (aturan browser); dengan TV box Android + aplikasi kiosk
     (mis. Fully Kiosk Browser) suara bisa langsung aktif sendiri. Dapur menjawab balik butuh mikrofon USB di TV —
     tahap berikutnya.
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
| 2 Kontrol v1 | Halaman Kontrol Dapur + Realtime: tab Layar (pasang kode, tampilan per layar, online, tes suara, muat ulang); Live: mode Otomatis/Manual, Next/Prev/Recall/Tayangkan/Fokus/Sembunyikan, Umumkan (ketik & template) + Didengar, **Bicara langsung** dari HP/laptop (fallback pesan suara) | ⏳ |
| 3 Rencana & antrian | Rencana masak format Mbak Rita, draf otomatis dari invoice, Salin ke WA, SEKARANG/BERIKUTNYA di TV, Mulai/Selesai per langkah | ⏳ |
| 4 Lapangan | Hitung progres nata (+50 box), perubahan pesanan wajib dibaca, Panggil kantor, jawab balik dari dapur (mikrofon) | ⏳ |
| 4b Slide di luar jam masak | Saat dapur tidak sedang memasak, TV memutar slide bergantian: agenda & pesanan beberapa hari ke depan, pengumuman, kampanye/acara, slide tentang Tiska (diatur dari Kontrol Dapur). Mode masak tetap prioritas dan otomatis mengambil alih saat ada pesanan hari ini (Rama 26 Nov) | ⏳ |
| 5 Belajar | Evaluasi rencana vs kenyataan, estimasi otomatis, nyala/mati TV terjadwal | ⏳ |

Perangkat yang disarankan: TV box Android + Chrome (suara Google bahasa Indonesia) dan speaker aktif lewat kabel aux
(Bluetooth sering tertidur/putus). Satu PC dengan dua monitor juga bisa: dua jendela, masing-masing satu tampilan.

## 6. Audit dari dua sudut pandang (26 Nov 2026, setelah mode TV D-232; nilai Rama 5/10)

Prinsip dari masukan Rama: **TV hanya berisi yang dibutuhkan orang dapur; urusan operator ada di dashboard.**
Sudah dibuang dari TV: rentang jam di invoice, alamat lengkap (urusan sopir — sisa nama tempat), tombol suara
(sentuhan pertama di layar menyalakan suara; statusnya nanti dilaporkan ke Kontrol).

### A. Tim dapur (tukang masak & DW packing, banyak 50+, melirik dari 3–4 m, tangan sibuk)
Pertanyaan saat melirik: *sekarang kerjakan apa · berapa · harus SIAP jam berapa · ada yang khusus/berubah ·
habis ini apa · siapa yang pegang.*

Sudah bagus: jumlah besar di ubin kuning; jam target besar ikut sesi yang tayang; sesi tim jadi judul; catatan dapur
blok kuning; tidak pernah digulir; strip antrian satu sel per sesi.

Kurang / perlu diperbaiki:
1. **Jam yang tampil = jam tiba/saji di lokasi**, padahal dapur butuh jam **siap angkut/berangkat** (Mbak Rita:
   "04.00 [KLOTER-1] Siap delivery"). Hitung mundur sekarang memberi kesan waktunya masih longgar → perlu jam siap
   per sesi dari rencana masak (Tahap 3).
2. **Rotasi buta prioritas**: semua halaman 20 detik sama rata. Sesi yang paling mepet harus lebih sering/lebih lama
   tayang; sesi yang sudah lewat jarang.
3. **Tidak ada progres** ("550 dari 1.693 box sudah dinata") — DW bekerja per target batch.
4. **Perubahan tidak menonjol** ("bukibu.. snack box senat jadinya ukuran kue tampah", 06.13 hari H) → kartu
   BERUBAH yang wajib dibaca.
5. **Pembagian penting masih teks miring kecil** (Regular 20 · Vegetarian 10, bahan organik) → jadikan ubin angka.
6. Isi menu masih deretan nama panjang → ukuran naik/foto menu untuk yang kurang lancar membaca.
7. **Siapa yang bertugas** (Kak Nay, Ibu Nanik) belum tampil.
8. Suara hanya 60/30/15 menit sebelum jam acara → per langkah (mulai masak, mulai nata, kloter berangkat).
9. Kolom kiri kosong saat tanpa catatan → isi "Berikutnya: 11.00 Sesi II siang" atau tim bertugas.

### B. Owner / operator (Mbak Rita, admin, owner — di kantor atau dari HP)
Pertanyaan: *apa yang sedang tampil di TV · dapur on-track atau telat · TV nyala, internet & suara aman ·
bagaimana menyampaikan perubahan dan memastikan didengar · besok/lusa butuh apa.*

Sudah: TV membaca invoice sendiri tanpa input tambahan; tanda internet putus (tapi hanya terlihat di dapur).

Kurang:
1. **Belum ada halaman Kontrol** — tidak bisa melihat tayangan, Next/Prev/Pin/Recall, mengumumkan, atau tahu suara mati.
2. **Status TV tidak terlapor** (online, suara aktif, layar penuh, terakhir terlihat).
3. **Running text** ala berita TV yang diatur dari Kontrol (Rama 26 Nov) — informasi penting berjalan di bawah layar.
4. Rencana masak format Mbak Rita belum ada → jam siap/berangkat, target batch, petugas tidak bisa tampil.
5. Progres & keterlambatan tidak terekam → tidak ada evaluasi.
6. Kebutuhan Bahan & PR masih membaca Event saja (kosong).

### Urutan kerja berikutnya (menggantikan urutan §5 untuk tahap 2–4)
| Prioritas | Isi |
|---|---|
| P1 Kontrol Dapur v1 (✅ MVP D-234: status layar, Tahan/Next/Prev, Umumkan+Ulangi, running text; ⏳ bicara langsung, pasang pakai kode, Didengar) | Realtime; layar terdaftar pakai kode + status (online, suara, terakhir terlihat); pratinjau tayangan; Next/Prev/Pin/Recall; Umumkan (ketik + template) dengan tanda Didengar; **running text**; bicara langsung (fallback pesan suara); Tes suara dari dashboard |
| P2 Rencana masak | Format Mbak Rita: jam siap/berangkat per sesi, langkah + target batch, petugas; TV menghitung mundur ke jam siap; Salin ke WA |
| P3 Lapangan | Progres +50 box, perubahan wajib dibaca, rotasi berprioritas, pembagian Regular/Vegetarian sebagai ubin, "Berikutnya" di kolom kiri |
| P4 | Slide di luar jam masak, evaluasi rencana vs kenyataan, Kebutuhan Bahan & PR dari invoice |
