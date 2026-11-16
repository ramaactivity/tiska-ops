# 19 — Cetakan (katalog, stok, pengajuan, generator PDF)

Status: **usulan, menunggu persetujuan Rama** (16 Nov 2026). Belum ada kode.

## Masalah hari ini

- Desain cetakan Tiska (nama menu, kartu ucapan, sleeve, stiker, label minuman, form serah terima) ada di Canva milik Rama.
  Yang tahu linknya, ukurannya, bahannya, dan cara pesannya hanya Rama.
- Tiap cetak, Rama mengetik ulang pesan ke Oke Print Mancur: "Kak mau cetak … Ukuran … Bahan … Qty … Finishing …".
- Nama menu untuk event diketik satu per satu di Canva (file "NAMA MENU KECIL" sudah 202 halaman).
- Stok cetakan tidak tercatat. Dapur, owner, dan sales meminta cetak lewat chat WA; mudah tenggelam, tanpa status.
- Biaya cetak per event tidak terlihat.

## Tujuan

Satu menu **Cetakan** di Tiska Ops:
1. **Katalog**: semua jenis cetakan beserta ukuran, bahan, finishing, isi per lembar A3, link Canva, dan file siap cetak.
2. **Stok**: masuk/keluar/hitung fisik, peringatan menipis.
3. **Pengajuan cetak**: dari dapur (stok menipis) atau dari pesanan (event / Ikut Menu Pesta), dengan status sampai barang diambil.
4. **Generator PDF**: nama menu (dan nanti kartu ucapan/label) dibuat otomatis dari daftar menu pesanan, siap cetak.
5. **Pesan ke percetakan**: teks WhatsApp terisi otomatis (ukuran, bahan, jumlah, finishing), tinggal salin atau buka WA.

## Katalog awal (dibaca dari 14 desain Canva Rama, 16 Nov 2026)

| Desain Canva | Ukuran | Halaman | Bahan & finishing (dari chat Oke Print) | Isi berubah per pesanan? |
|---|---|---|---|---|
| DT - NAMA MENU KECIL TISKA | 11 × 6,6 cm | 202 | BW Carton, potong | Ya, nama menu |
| DT - NAMA MENU IKEA 10X15 CM | 10 × 15 cm | 118 | BW Carton, potong pas ukuran | Ya, nama menu |
| DT - NAMA MENU WIDE 10X29 CM | 29 × 10 cm | 19 | — | Ya, nama menu |
| DT - KARTU UCAPAN SQUARE 8X8CM | 8 × 8 cm | 5 | — | Ya, nama/ucapan |
| DT - KARTU UCAPAN LANDSCAPE 9X5.5 CM | 9 × 5,5 cm | 4 | — | Ya, nama/ucapan |
| DT - KARTU UCAPAN 7x11 CM | 7 × 11 cm | 19 | — | Ya, nama/ucapan |
| DT - INTERNAL DESAIN KARTU UCAPAN HAMPERS | — | 4 | — | Ya |
| DT - STICKER 7X7 CM (logo) | Ø 7 cm | 5 | Sticker Chromo glossy, half cut lingkaran | Tidak (stok) |
| DT - STICKER 4X4 CM (SAYUR) | 4 × 4 cm | 14 | — | Tidak (stok) |
| DT - STICKER LANDSCAPE 15x10CM | 15 × 10 cm | 4 | Sticker Chromo glossy, potong | Tidak (stok) |
| DT KECIL - STICKER MINUMAN 8x5CM | 8 × 5 cm | 7 (7 minuman) | Sticker Chromo glossy, potong; 3 A3 per menu | Tidak (stok) |
| DT BESAR - STICKER MINUMAN 10x15CM | 10 × 15 cm | 2 | Sticker Chromo glossy, half cut | Tidak (stok) |
| DT - Sleeve Tiska 9x48CM | 9 × 48 cm | 1 | — | Tidak (stok) |
| DT - SERAH TERIMA TISKA | ±17,6 × 12,5 cm | 1 | — | Tidak (stok) |

Dua jenis cetakan dengan cara kerja berbeda:
- **Stok tetap** (stiker logo, sleeve, label minuman, form serah terima): dicetak berulang, dihitung stoknya.
- **Per pesanan** (nama menu, kartu ucapan): isinya ikut pesanan, tidak distok, dibuat dari data menu.

## Alur

### 1. Katalog cetakan
Per jenis: nama, kelompok (stiker / label / nama menu / kartu ucapan / sleeve / dokumen), ukuran (cm), bentuk potong,
bahan, finishing, isi per lembar A3, satuan stok (pcs/lembar), stok minimum, percetakan langganan (dari data Vendor,
mis. Oke Print Mancur + no. WA), link Canva (edit), file PDF siap cetak terakhir (disimpan di R2), harga terakhir per lembar A3.
Tombol: **Buka di Canva**, **Unduh PDF siap cetak**, **Ajukan cetak**.

### 2. Stok & hitung fisik
- Kartu stok per cetakan: masuk (cetakan jadi diambil), keluar (dipakai event / rusak), koreksi hasil hitung fisik.
- Hitung fisik ikut jadwal opname bulanan yang sudah ada (pengingat di Dashboard yang sama), satu daftar terpisah "Cetakan".
- Stok di bawah minimum → muncul di Dashboard + notifikasi ke pemegang cetakan.
- Pola sama dengan Stok Bahan (mutasi, opname), tapi **tabel sendiri**: cetakan bukan bahan makanan dan tidak boleh muncul
  di resep/HPP.

### 3. Pengajuan cetak
Hari ini dapur, owner, dan sales meminta cetak lewat chat WA ke Rama — mudah tenggelam, tidak ada status. Gantinya:
- **Dari dapur/gudang (HP)**: buka Cetakan → ketuk cetakan yang menipis → "Minta cetak" (tanpa mengetik; jumlah usulan
  otomatis = sampai stok aman).
- **Dari owner/sales**: tombol "Minta cetak" yang sama, plus permintaan desain baru/khusus (kartu ucapan customer, nama
  menu khusus) dengan catatan & lampiran foto contoh.
- **Dari pesanan**: di detail Pesanan & Event / Ikut Menu Pesta → tombol "Cetak nama menu & kartu" → daftar menu pesanan
  sudah terisi otomatis, pilih template, jumlah per menu, tanggal dibutuhkan (default H-1 acara).
- Pengajuan masuk → notifikasi HP (sistem notifikasi yang sudah ada) ke pemegang cetakan; peminta mendapat kabar tiap
  status berubah. Link pengajuan bisa dibagikan ke grup WA kalau perlu, tapi status hidup di sistem.
- Status: Diajukan → Disetujui → Dipesan ke percetakan (catat **No. Order Pengambilan** dari Oke Print, mis. 28270) →
  Sudah diambil (otomatis masuk stok untuk cetakan stok tetap) → Selesai. Batal kapan saja dengan alasan.
- Biaya dari nota percetakan dicatat di pengajuan; kalau terkait event, muncul di biaya event.

### 4. Pesan ke percetakan (teks siap tempel)
Dari pengajuan yang disetujui, sistem menyusun teks persis gaya chat Rama sekarang:

```
Kak mau cetak
Sticker Tiska Besar 7x7cm
Ukuran : Diameter 7 cm
Bahan : Sticker Chromo glossy
Qty : 10 Lembar A3
Finishing : Half Cut potong jadi circle lingkaran bukan persegi
```

Tombol **Salin teks** dan **Buka WhatsApp Oke Print** (membuka chat dengan teks terisi; Rama/admin sendiri yang menekan
kirim). Jumlah lembar A3 dihitung dari kebutuhan pcs ÷ isi per A3 (dibulatkan ke atas), bisa diubah.

### 5. Generator PDF native di Tiska Ops (nama menu, kartu ucapan, label)
Rama mengizinkan (16 Nov 2026) membuat desain di Canva atau sepenuhnya di sistem. Pilihan: **dibuat di sistem**, Canva hanya
sumber gambar latar resmi.
1. Sekali per template: latar desain (bingkai, logo resmi, ornamen, **tanpa** teks nama menu) diambil dari desain Canva
   yang sudah ada sebagai PDF vektor (Claude mengekspornya lewat koneksi Canva, Rama tidak perlu melakukan apa-apa),
   disimpan di R2. Logo & ornamen tidak digambar ulang (aturan logo resmi).
2. Di Tiska Ops ditentukan kotak teks per template: posisi, huruf, ukuran maks (mengecil otomatis kalau nama panjang,
   pindah baris rapi), warna CMYK, huruf besar/kecil.
3. Saat cetak: pilih pesanan → daftar menu terisi (nama, nama Inggris, keterangan dari data Menu) → pratinjau semua kartu →
   **Unduh PDF**.
4. PDF keluaran: latar vektor + teks vektor (huruf ditanam, warna CMYK), disusun di lembar A3 (29,7 × 42 cm) dengan
   bleed 2 mm dan garis potong; jumlah lembar A3 ikut tertulis di teks WA. Tajam di ukuran berapa pun karena vektor.
5. Nama menu yang salah ketik dibetulkan di data Menu, sekali untuk selamanya (bukan di Canva).
6. Desain baru yang berulang (mis. label exp date) boleh langsung dibuat sebagai template sistem; Canva tetap dipakai untuk
   desain sekali pakai / yang butuh ilustrasi.

Teknis: PDF dibuat di server dengan `pdf-lib` (JavaScript murni, jalan di Vercel, mendukung warna CMYK dan menanam halaman
PDF lain sebagai vektor). Tanpa layanan berbayar.

## Batas yang tidak bisa (ditulis terang)

- **Isi otomatis langsung di dalam Canva tidak bisa dengan paket biasa.** "Autofill" Canva lewat API hanya untuk Canva
  Enterprise, dan 14 desain di atas dicek: tidak punya kolom isian. Karena itu generator membuat PDF di Tiska Ops sendiri.
- **CMYK**: teks dari sistem ditulis langsung dalam warna CMYK. Latar hasil ekspor Canva lewat API berwarna RGB (vektor
  tetap tajam); percetakan yang mengonversi, sama seperti file Canva yang selama ini dikirim ke Oke Print. Kalau butuh
  latar CMYK murni, latar diekspor manual dari Canva "PDF Print – CMYK" (Canva Pro) lalu diunggah ulang.
- Huruf nama menu harus tersedia sebagai file huruf (TTF/OTF) yang lisensinya membolehkan ditanam di PDF. Kalau huruf di
  Canva bukan huruf bebas, dipilih huruf Google Fonts yang paling mirip — dicek berdampingan dulu.

## Data (aditif, tabel baru)

- `print_items` — katalog (nama, kelompok, ukuran mm, bentuk, bahan, finishing, isi_per_a3, satuan, stok_min, vendor_id,
  canva_url, file_key R2, harga_per_a3, jenis: stok/per_pesanan, aktif).
- `print_stock_movements` — masuk/keluar/koreksi (qty, tanggal, catatan, event_id?, request_id?, created_by).
- `print_requests` + `print_request_lines` — pengajuan (asal: dapur/event/ikut_menu_pesta/manual, event_id?, order_id?,
  status, no_order_percetakan, biaya, diajukan/disetujui/diambil oleh+waktu, alasan batal).
- `print_templates` — latar PDF (R2), ukuran, kotak teks (JSON: x, y, lebar, tinggi, huruf, ukuran, warna CMYK, perataan).
- Hitung fisik cetakan memakai pola `stock_counts` dengan baris sendiri.

## Peran

- Kepala Dapur, Dapur, Gudang, Captain: lihat stok, catat pemakaian, **Minta cetak**. Tidak melihat harga.
- Sales: lihat katalog, **Minta cetak** / minta desain khusus untuk pesanannya, lihat status.
- Admin/Marketing (Rama), Owner: semua, termasuk setujui, pesan, biaya, template.
- Finance: lihat biaya cetak.

## Milestone (1–2 per sesi)

1. **Katalog + Buka Canva + teks WA**: tabel `print_items`, halaman Cetakan (daftar kartu, HP-friendly), isi 14 desain
   di atas, tombol Buka di Canva / Salin teks pesan. *Bisa langsung dipakai Rama.*
2. **Stok + Minta cetak**: mutasi, stok minimum, peringatan Dashboard, tombol "Minta cetak" untuk dapur, owner, sales + notifikasi HP.
3. **Pengajuan & pelacakan**: status sampai diambil, No. Order Oke Print, biaya, masuk stok otomatis, hitung fisik bulanan.
4. **Pengajuan dari pesanan**: tombol di Pesanan & Event dan Ikut Menu Pesta, daftar menu terisi otomatis.
5. **Generator nama menu**: template latar PDF + kotak teks, imposisi A3 + garis potong, unduh PDF CMYK.
6. **Generator kartu ucapan & label** (exp date, nama customer) sebagai template sistem.

## Pertanyaan terbuka untuk Rama

1. Akun Canva Tiska: **Pro/Teams** atau gratis? (Hanya perlu untuk latar CMYK murni; generator tetap jalan tanpa Pro.)
2. Huruf untuk nama menu di desain "NAMA MENU KECIL" namanya apa? (Di Canva: klik teks → nama huruf di kiri atas.)
3. Siapa yang menyetujui pengajuan & memesan ke Oke Print: Rama saja, atau juga Mas Reza?
4. Nomor WhatsApp Oke Print Mancur (untuk tombol Buka WhatsApp) dan harga per lembar A3 per bahan kalau ada nota.
5. Stok fisik cetakan disimpan di mana dan siapa yang menghitung (gudang atau dapur)?
