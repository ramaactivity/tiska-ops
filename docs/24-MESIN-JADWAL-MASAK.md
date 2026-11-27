# 24 — Mesin Jadwal Masak (jadwal produksi per pesanan)

Status: disetujui Rama 27 Nov 2026 ('gas lanjutkan sesuai rekomendasi'). **M1 ✅ D-239**, sorotan TV D-240, **jadwal gabungan pesanan kecil ✅ D-242** (aturan: masak bersama 06.00, nata bergiliran 30 mnt/±50 porsi, 'tiba' = berangkat −60 mnt). M2 menunggu angka standar §7. Menggantikan tab "Rencana masak" (D-237).

## 1. Kenapa

Rama (27 Nov): *"Untuk jadwal masak itu enaknya terkoneksikan juga dengan event / orderannya … perlu mesin dan fitur
sendiri yang lebih canggih dari sekarang."*

D-237 menyimpan rencana **per tanggal** sebagai teks bebas: tidak tahu langkah mana milik pesanan mana, tidak ikut
berubah saat pesanan diubah, dan semua jam diketik tangan. Jadwal Mbak Rita (WISUDA UNPAK, 25 Nov) sebenarnya hasil
**hitungan**: 1.693 box dibagi 3 batch nata, tiap batch masuk mobil, kloter estafet ke Puri Begawan, masak dimulai
mundur dari jam kloter. Hitungan itu yang dikerjakan mesin.

## 2. Data yang sudah ada (cek produksi 27 Nov)

| Data | Kondisi | Dipakai untuk |
|---|---|---|
| Invoice 60 hari terakhir | 94 pesanan, 89 berjam (teks bebas), rata-rata 1,2 hari | sumber pesanan, jumlah, sesi, jam, tempat |
| Resep | 610, 609 punya porsi per batch | jumlah batch masak per menu |
| Menu | 305 aktif, 129 tersambung ke resep; kolom dapur kosong semua | menu → resep, dapur masak/pastry (masih dari kategori) |
| Tim dapur | 8 akun dapur + 1 kepala dapur | petugas per pekerjaan |
| Kloter / kendaraan / penugasan | 0 / 0 / 0 | belum dipakai tim — mesin membuat kloter sendiri |

## 3. Konsep: Jadwal Produksi menempel ke pesanan

```
Pesanan (invoice)  ──►  Sesi layanan (tanggal · jam siap saji · tempat · antar/pick-up)
                           └─► Pekerjaan: MASAK per menu · NATA/PACKING per batch · KLOTER berangkat · lain-lain
Hari (semua pesanan)  ──►  Papan Jadwal Masak + TV + teks WA Mbak Rita
```

Tiap **pekerjaan**: jenis, menu/isi, target jumlah + satuan, mulai–selesai, lokasi kerja (Julang, Outentika, venue),
petugas, status (belum · jalan · selesai), jumlah tercapai, catatan. Kloter: jam berangkat, tujuan, muatan.

### Mesin hitung mundur (draf otomatis)

Dari **jam siap saji di lokasi** (judul sesi invoice) dihitung mundur:

1. **Kloter berangkat** = siap saji − waktu tempuh ke tempat (bawaan 60 mnt, diingat per tempat).
2. **Pecah kloter** menurut kapasitas mobil (bawaan, mis. 600 box/mobil) → KLOTER-1, -2, … seperti UNPAK.
3. **Batch nata** per kloter: durasi = jumlah ÷ (kecepatan nata per orang per jam × jumlah orang DW), selesai 15 mnt
   sebelum kloter berangkat (muat).
4. **Masak** per menu: jumlah batch = porsi ÷ porsi per batch resep; durasi dari waktu masak standar kategori (nasi,
   lauk, sayur, gorengan, snack, minuman — diisi kepala dapur), selesai sebelum batch nata pertama yang memakainya.
5. **Gabung harian**: semua pesanan di satu tanggal → beban per jam (orang dibutuhkan vs tersedia) dan peringatan
   bentrok ("06.00–07.30 butuh 9 orang DW, tersedia 6").

Angka standar (kecepatan nata, waktu masak, tempuh, kapasitas mobil, jumlah DW) ada di satu halaman **Pengaturan
jadwal masak**; awalnya diisi dari pengalaman Mbak Rita / kepala dapur, lalu disarankan ulang dari kenyataan (§5).
Semua hasil mesin = **draf**: operator tetap menggeser, dan geseran manual tidak ditimpa saat dihitung ulang.

### Pesanan berubah

Saat invoice diubah setelah jadwalnya dibuat (jumlah, jam, menu), jadwal pesanan itu ditandai **"Pesanan berubah"**
dengan selisihnya (mis. "Snack Box 1.693 → 1.750"), tombol **Hitung ulang** atau **Abaikan**, dan TV menampilkan kartu
BERUBAH sampai dapur menekan Dibaca.

## 4. Permukaan

| Di mana | Isi |
|---|---|
| Detail pesanan (invoice / event) | Kartu **Jadwal produksi**: buat dari mesin, ubah, status, tanda "Pesanan berubah" |
| Operasional → **Jadwal Masak** (halaman baru) | Papan harian/mingguan: garis waktu semua pesanan per jam (masak · nata · kloter), beban tim, bentrok; klik pekerjaan → ubah; Salin ke WA (format Mbak Rita, sudah ada) |
| TV dapur | Sekarang / Berikutnya (D-237) + progres jumlah + kartu BERUBAH |
| HP kepala dapur / tablet dapur | Tugas sekarang: **Mulai · +50 box · Selesai** (tombol besar, tanpa mengetik) |
| Kontrol Dapur | Tab Rencana masak diganti tautan ke Jadwal Masak |

## 5. Tahapan (1–2 per sesi)

| Tahap | Isi | Hasil yang bisa dicoba Rama |
|---|---|---|
| **M1 Nempel ke pesanan** | Tabel jadwal produksi per pesanan; halaman Jadwal Masak (garis waktu harian); kartu di detail invoice/event; TV & WA membaca dari sini; tanda "Pesanan berubah" | Buka pesanan → buat jadwal → tampil di papan harian & TV |
| **M2 Mesin hitung mundur** | Pengaturan angka standar; draf otomatis batch nata, kloter, masak per menu dari resep; beban per jam & bentrok | Pesanan UNPAK-like → draf mirip jadwal Mbak Rita dalam 1 klik |
| **M3 Eksekusi** | Mulai/Selesai/progres dari HP/tablet; TV progres; telat → langkah turunan ikut bergeser + peringatan ke Kontrol | Kepala dapur menekan Selesai, TV & papan ikut |
| **M4 Tim** | Petugas per pekerjaan (akun dapur + DW harian), kebutuhan orang per jam, sambung ke penugasan & honor | Mbak Rita membagi tim DW di aplikasi |
| **M5 Belajar** | Rencana vs kenyataan per pekerjaan → saran angka standar (kecepatan nata nyata, waktu masak nyata) | Draf makin mirip kenyataan tiap acara |

Data D-237 (`kitchen_plans`, saat ini 0 baris) dipindah ke tabel baru di M1 lalu tabel lama dibiarkan (aditif).

## 6. Batas jujur

- Jam pesanan teks bebas ("09.30 WIB brkt dr Julang"): mesin membaca jam pertama; berangkat vs siap saji bisa
  tertukar → ditampilkan untuk dicek operator, tidak diam-diam dipakai.
- 176 menu belum tersambung resep → batch masaknya dari porsi standar kategori sampai resepnya disambung.
- Waktu masak & kecepatan nata belum pernah dicatat di mana pun → angka awal = tebakan ahli, baru akurat setelah M5.
- Kloter/kendaraan belum dipakai tim → mesin membuat kloter di jadwal produksi; tidak memaksa modul Pengiriman.

## 7. Pertanyaan untuk Mbak Rita / kepala dapur (untuk M2, bukan M1)

1. Satu orang DW bisa nata berapa snack box / nasi box per jam?
2. Waktu masak biasa per jenis (nasi, lauk, sayur, gorengan, kue) untuk ±100 porsi?
3. Satu mobil muat berapa box? Ada berapa mobil biasanya?
4. Biasanya berapa orang DW per acara besar / kecil?
5. Tempat langganan + waktu tempuh dari Julang (Puri Begawan, IPB, …)?
