# 09 — Purchasing, Gudang & Stock Opname

Referensi pola: **Mahakan POS branch `release/phase-1`** (repo `ramaactivity/mahakan-pos`, update 12 Okt 2026) — PR, "Tarik PR ke
Pembelian" multi-supplier, terima sebagian, Market List (harga per supplier + ukuran kemasan), konversi satuan dengan pratinjau,
Daily Market (uang muka kurir, nota multi-foto), opname dari HP (`/m/opname`), Arsip Nota (`/m/nota`), pergerakan stok bulanan,
notifikasi stok menipis, panduan `docs/Panduan-Gudang-Purchasing.html`. **Hanya referensi** — aturan mengikuti Tiska di bawah.

## 1. Fakta Tiska (dari Pak Reza & tim)

- Belanja **per event** oleh **Pak Sur**, mencakup kebutuhan event + isi ulang stok yang terpakai.
- Rasio **80% pasar / cash : 20% supplier tempo**.
- Alur: Pak Sur susun daftar → **Finance (Pak Reza) setujui** → Finance **transfer dana sebesar estimasi** → belanja → rekap nota per event → lapor Finance & Accounting.
- Gudang mencatat **bahan makanan + packaging**. Opname **sebulan sekali oleh Tya**.
- Data peralatan **belum ada** → hitung dari awal.
- Rekap setelah acara: peralatan (sewaan vs milik sendiri) + bahan baku (oleh gudang).

## 2. Alur sistem

```
Event final ─► PR otomatis (resep × pax − stok tersedia + isi ulang ke stok minimum), per event; boleh gabung beberapa event satu hari
           ─► Purchasing menyesuaikan (tambah/kurang, catatan)
           ─► Diajukan ke Finance ─► disetujui / dikoreksi (Pak Reza)
           ─► Transfer uang muka (Daily Market top up ke Pak Sur)   [80% kasus]
              atau PO ke supplier tempo                            [20% kasus]
           ─► Belanja / penerimaan barang (boleh sebagian; sisa tetap terbuka)
           ─► Stok bertambah (konversi ke satuan resep), harga bahan ter-update
           ─► Rekap per event: estimasi vs nyata, sisa uang muka dikembalikan/dibawa, nota lengkap
           ─► Biaya bahan dialokasikan ke event (untung per event akurat)
```

### Daily Market (uang muka belanja)
- Top up = Finance mentransfer ke pemegang (Pak Sur; siapkan saldo **per orang** bila ada pembelanja lain).
- Belanja = foto nota (boleh banyak foto; nota pasar sering tulisan tangan) **atau "tanpa nota"** + foto barang + alasan; item qty × harga = total (pola Google Sheets yang biasa dipakai); pilih event.
- Saldo pemegang harus sama dengan uang di tangan; selisih terlihat. Saldo tidak boleh minus (guard).
- Tercatat di buku kas (pola Mahakan: akun kas khusus uang muka).

### PO supplier tempo
Pesan → terima (GR, sebagian boleh) → hutang dagang dengan jatuh tempo (TOP default supplier) → pengingat bayar ke Finance → bayar.

## 3. Supplier & harga

- `suppliers`: nama, kategori, kontak, cash/tempo (hari), rekening.
- Harga per bahan per supplier + ukuran kemasan + supplier utama; **riwayat harga** (kapan naik).
- Pembelian otomatis memperbarui harga → HPP menu ikut → peringatan menu/paket/pricelist yang untungnya < 35%/30% (hanya Owner & Accounting).
- Konversi satuan dengan pratinjau warna (hijau aman, kuning perlu set ukuran kemasan, merah satuan tidak cocok). Data awal konversi sudah ada di file BOM (mis. beras 25 kg = 33,25 liter; ⚠️ beberapa konversi berstatus "Cek konversi").

## 4. Stok bahan & packaging

- Data awal: 977 bahan dari `data/bahan.csv` (termasuk 155 packaging: box reguler/sedang/premium, mika, cup, dll.).
- Masuk: pembelian/penerimaan. Keluar: pemakaian event (otomatis dari resep × porsi; dikoreksi rekap gudang), waste.
- Stok minimum per bahan → notifikasi "hampir habis" ke Purchasing.
- Pergerakan bulanan: stok awal (opname) + pembelian − pemakaian = stok akhir; drill-down per bahan.

## 5. Stock opname (bulanan, Tya)

- Pengingat ke HP Tya **tanggal 1** + banner "opname belum dilakukan" di dashboard Owner & Accounting sampai selesai.
- Hitung dari HP per kategori/rak; sistem tampilkan selisih; **selisih > 5% wajib alasan** (rusak, kedaluwarsa, salah catat, tumpah).
- Satu sesi opname berjalan dalam satu waktu (unique index). Diajukan → difinalkan Accounting → penyesuaian stok tercatat.
- Hasil = stok awal bulan (dasar HPP nyata bulanan).

## 6. Peralatan

- **Wizard "Hitung Awal Peralatan"** (Tya): kategori (penghangat/chafing dish & pemanas VIP, piring, gelas & goblet & wine, alat saji, meja & taplak & runner, kursi, dekor & vas bunga, napkin/placemat, pitcher, lainnya); daftar contoh diisi dari tabel sewa S&K; isi jumlah, kondisi, foto. Bisa dicicil per kategori; barang mahal dulu.
- Per event: kebutuhan alat (dari jenis layanan & pax) → keluar → kembali (centang dari HP) → rusak/hilang tercatat → bila di lokasi klien, ditagih sesuai tabel lost & breakable.
- Alat **sewaan dari vendor**: ambil, kembali, biaya → biaya event.
- Rekap peralatan per event: sewaan vs milik sendiri.
- Opname alat berkala (alur sama dengan bahan).
- Opsional: label QR untuk alat bernilai tinggi.
- ⚠️ Penanggung jawab alat prasmanan (gudang atau captain) belum jelas — tanyakan.

## 7. Laporan untuk Finance & Accounting

Rekap belanja per event & per bulan, estimasi vs nyata, saldo uang muka per pemegang, hutang dagang & jatuh tempo, selisih opname
(nilai rupiah), harga bahan naik terbesar, biaya bahan per event (masuk laporan untung per event).
