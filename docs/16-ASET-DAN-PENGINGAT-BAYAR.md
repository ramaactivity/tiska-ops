# 16 — Aset Digital & Pengingat Bayar

Status: **dibangun & diuji** (2 Nov 2026, D-127, D-128). Permintaan Rama 2 Nov: link dokumentasi Google Drive per
acara, kumpulan link penting (Drive, Canva: pricelist, brosur, kartu nama, kartu menu, label, stiker), dan daftar
tagihan rutin/sekali bayar dengan pengingat supaya tidak terlewat dan kena denda.

## 1. Aset Digital (menu Data Induk → Aset Digital)

Satu tempat untuk semua tautan penting. **Hanya tautan** — berkasnya tetap di Google Drive / Canva; menghapus tautan
di Tiska Ops tidak menyentuh berkas aslinya. Tidak butuh sambungan Google/Canva (gratis, tanpa izin aplikasi).

- **Tambah tautan**: tempel link dari tombol Bagikan/Share → jenisnya terbaca otomatis (Folder/Berkas Google Drive,
  Google Docs/Sheets/Slides/Form, Canva, lainnya) → judul → kategori → catatan → tanda ★ Penting (tampil paling atas).
- Kategori: Dokumentasi acara · Pricelist · Brosur & katalog · Kartu menu · Kartu nama · Label & stiker ·
  Konten sosmed · Dokumen penting · Lainnya.
- Ketuk kartu = buka di tab baru (di HP langsung masuk aplikasi Drive/Canva).
- Cari toleran salah ketik (judul, catatan, nama customer) + saring per kategori.
- **Dokumentasi acara**: di halaman **Event** ada bagian "Dokumentasi & berkas" → Tambah link dokumentasi (judul
  otomatis "Dokumentasi", menempel ke acara itu). Muncul juga di Aset Digital → Dokumentasi acara dengan nama
  customer & tanggal acara, jadi bisa dicari dari dua arah.
- Akses: sales, finance, bizdev, admin, owner (bisa ditambah lewat User → izin). Dapur & gudang tidak melihat.

## 2. Pengingat Bayar (menu Pembelian → Pengingat Bayar)

Tagihan kantor yang **rutin** (wifi, listrik, air, BPJS, setor PBJT, sewa tempat) dan yang **sekali bayar** (sewa
alat untuk acara, pelunasan crew, pajak tahunan, dll).

- **Tagihan baru**: tombol isi cepat (Wifi kantor, Listrik PLN, Air PDAM, BPJS, Setor & lapor PBJT, Sewa tempat) →
  nama, kategori, **Bayar**: Sekali / Tiap bulan / 3 bulan / 6 bulan / tahun, jatuh tempo, nominal (kira-kira, boleh
  kosong kalau berubah-ubah), **Ingatkan mulai** H-1/H-3/H-7/H-14.
- Detail bebas (semua opsional): **PIC** yang membayar (ikut menerima pengingat), **ID pelanggan / kode bayar**,
  **rekening tujuan / cara bayar** (keduanya ada tombol Salin), acara terkait, catatan (mis. aturan denda), **foto
  tagihan** (maks 5, bucket tertutup).
- **Sudah dibayar**: tanggal, nominal (terisi perkiraan), catatan, bukti transfer. Tagihan rutin otomatis maju ke
  periode berikutnya dengan **tanggal tetap** (tgl 31 → akhir bulan untuk bulan pendek); sekali bayar → Selesai.
  Dua orang menekan bersamaan tidak tercatat dobel.
- Halaman utama: **Perlu dibayar** (lewat jatuh tempo / hari ini / masuk masa pengingat — kuning), **Akan datang**,
  **Sudah dibayar 31 hari terakhir**, dan pintasan **Hutang supplier jatuh tempo ≤ 7 hari** + **Honor tim siap
  dibayar** (dibayar tetap di menunya masing-masing) — semua yang harus dibayar terlihat dari satu tempat.
- **Hentikan** (wifi diputus, sewa selesai) → tidak diingatkan lagi, riwayat tetap ada. **Hapus** hanya untuk salah
  input yang belum pernah dibayar.
- **Pengingat**: notifikasi HP tiap pagi 06.00 WIB (cron "pagi" yang sudah ada) untuk tagihan yang sudah masuk masa
  pengingat atau lewat jatuh tempo, **diulang tiap pagi sampai dicatat dibayar**. Penerima: Finance + akun yang
  mencentang "Terima notifikasi Finance" (Mas Reza) + PIC tagihan itu (hanya tagihannya). Contoh:
  "⚠️ 1 tagihan lewat jatuh tempo — Air PDAM (lewat 2 hari) · Wifi kantor (besok, Rp 350.000)".
- Akses: Finance + admin/owner (bisa ditambah lewat izin). Hanya pencatat & pengingat — **tidak membuat jurnal/kas**.

## 3. Yang sengaja tidak dibuat

- Sambungan langsung ke Google Drive/Canva (membaca isi folder, pratinjau desain): butuh izin aplikasi Google/Canva;
  link biasa sudah cukup untuk membuka & mengedit.
- Pengingat lewat WhatsApp: notifikasi HP aplikasi sudah dipakai untuk pengingat lain; WA butuh bot/nomor terpisah.
- Pembukuan otomatis dari tagihan yang dibayar: menunggu modul kas/jurnal.
