# 11 — Sumber Data, Lampiran & Temuan

Semua file asli ada di `lampiran/`. Ekstrak siap-impor ada di `data/`. Lampiran berisi data bisnis & pribadi klien →
**jangan di-commit ke repo publik**; simpan di penyimpanan privat (R2/Drive) dan catat lokasinya. CSV di `data/` boleh di repo privat.

## 1. `data/` (hasil ekstrak, 14 Okt 2026)

| File | Isi | Baris |
|---|---|---|
| `bahan.csv` | Sheet *Database* file BOM: kode, kategori, nama, merk/jenis, kemasan beli, harga lama/terakhir/dipakai, satuan resep, isi per kemasan, harga per satuan resep, status data | 977 |
| `resep.csv` | Semua baris resep (sheet Main Course 1 & 2): kode menu, nama, porsi per resep, kode bahan, nama bahan, satuan, qty, harga/satuan, biaya. 🆕 Diekstrak ulang 14 Okt 2026 (parser baru di repo arsip `tools/ekstrak_resep_bom.py`) | 6.231 |
| `resep_ringkas.csv` | Per resep: total biaya batch, biaya per porsi, HPP (×1,3), jumlah bahan | 610 (= Daftar Menu; total cocok 610/610) |
| `daftar_menu_hpp_lama.csv` | Sheet *Daftar Menu*: kode, nama, porsi, total biaya batch, harga jual (15 terisi), HPP lama | 610 |
| `pricelist_menu_hpp_lama.csv` | Sheet *Pricelist*: kategori, nama menu, harga jual, HPP lama | 563 |
| `paket_box_hpp.csv` | Isi + HPP per item paket box dari 3 file (kolom `sumber`): "BS-PR terbaru" (aktif), "HPP BASIC STYLE PACKAGE 2025" (versi lama, ada BS-25..28), "Premium Lunch Box" (beberapa versi/sheet). Baris `__TOTAL_HPP__` & `__HARGA_JUAL__` per paket | ±2.200 |
| `pricelist-teks/*.txt` | Teks semua 18 pricelist PDF (+ dua versi "02 Menu Bogor") via `pdftotext -layout` | 19 file |
| `rev2-QUO_Reuni_PDGI…txt`, `e-INV_CIFOR…txt` | Teks quotation & invoice manual (termasuk S&K & termin) | |

Verifikasi: `resep_ringkas` MC1-001 Ayam Kodok → biaya/porsi 3.755,70, HPP 4.882,42 = HPP lama di file ✅.

## 2. File Excel (`lampiran/excel/`)

| File | Catatan |
|---|---|
| HPP Makanan - BOM.xlsx | Sheet: Database (bahan, kolom harga & konversi berformula), Pembelian (**kosong**), Resep - Main Course 1 (blok 2 kolom berdampingan, tiap blok: NAMA MENU / PORSI / Kode Menu / tabel bahan / Total Biaya Bahan / Biaya per porsi / Overhead = `Param_Overhead` (**#REF!**) / HPP / Saran harga @ food cost 50%), Resep - Main Course 2, Daftar Menu, Pricelist. Status bahan: OK 812, Lengkapi harga/konversi 145, Cek konversi 20. |
| HPP Basic Style, Lunch Box, Preferred Lunch Box (TERBARU) | Ringkasan BS 01–24 & PR 01–20 (harga, HPP, margin), sheet per kelompok harga. Isi tiap paket 7–10 item termasuk box & alat makan (Box Reguler 5.805; Box Sedang 6.605). Diterima 4× dengan nama berbeda (isi identik). |
| HPP BASIC STYLE PACKAGE 2025 (versi lama) | BS-01..28 (BS-25..28 @58.500), PR-01..20; PR-14..16 ada 78.500/88.500 |
| HPP Lunch Box BS & PR - v2 (versi paling lama) | BS-01..12 @37.500/47.500/57.500; PR-01..12 @65.000/75.000 |
| HPP Premium Lunch Box | Premium Nusantara @100.000 & @115.000 (Nasi Ayam Kecombrang, Nasi Berkat, Nasi Goreng Nusantara, Nasi Langgi, Nasi Bakar Cakalang, Nasi Bali, Nasi Daun Jeruk, Nasi Se'i Sapi Kupang, …; box premium 6.305), International Taste @130.000–140.000 (AS 1/2 Oriental Box, Korean Rice, Hainan Rice, …; box premium 6.705); untung 44–59% |

Untung paket BS/PR terbaru: 32–50% (PR-12 ±32%, BS-13 ±34%, PR-08 ±34% paling tipis; PR-09 ±51% paling tebal).

## 3. Pricelist PDF (`lampiran/pdf-pricelist/`)

🆕 Status 14 Okt 2026 (folder "PRICELIST TISKA 2026"): 18 PDF lengkap + dua versi "02". #18 berganti nama jadi **"18. E-PL Wedding Bogor & ATF Tiska Catering 2026"** — dipakai versi 14 Okt 16.16 (5 hlm); versi 11.44 (6 hlm) hanya beda halaman ke-6 nyasar berisi potongan harga, dibuang.
Versi "02": file `(versi A Indonesian 125rb, file 14 Okt 2026)` dan `(versi B Indonesian 115rb, file Nov 2025)` — beda isi hanya harga buffet Indonesian.
File "copy" 01 & 03 identik dengan aslinya (dibuang).

| No | Nama | Hlm | Catatan |
|---|---|---|---|
| 01 | JKT-Corp E-PL Menu Tiska Catering 2026 | 29 | Jakarta corporate; harga berbeda dari Bogor (mis. breakfast 145rb, Indonesian 160rb) |
| 02 | BGR E-PL Menu Tiska Catering Bogor 2026 | 29 | **2 versi**: A (Indonesian buffet 125.000++) & B (115.000++). Breakfast ala hotel 110rb++, Asian 160rb++, Western 195rb++, Fiesta 135/165/190rb++, stall, live pasta, lontong, mie, soto, aneka es, sewa alat, S&K |
| 03 | Coffee Break and Assorted Snack | 6 | harga 8.500–55.000 |
| 04 | Sajian Series Price List | 47 | 158 harga 6.500–850.000 |
| 05 | Hantaran | 17 | 145.000–590.000 |
| 06 | Tumpeng & Tampahan | 22 | tumpeng kecil/besar (25–30/30–40 pax) 1,5–2,75 jt++, tumpeng angka 975rb–2,2 jt |
| 07 | Rekanan Puri Begawan X Tiska | 9 | **venue rekanan, nett**: VOW 135/150/165rb nett; stall (Salmon Mentai 70rb, Potato & Ribs 200rb) |
| 08 | Artisan Holiday Hampers **2025** | 27 | 22 MB; belum versi 2026 |
| 09 | Ramadan Iftar Menu Western | 1 | 300.000/pax nett |
| 10 | Hampers Ramadan | 31 | 27.500–1.750.000 |
| 11 | Hampers Sedandang Ramadan | 4 | paket 4/6/8/10 porsi 350rb–1,1 jt |
| 12 | Meeting Package | 6 | full day 500rb nett/pax, half day 400rb nett/pax |
| 13 | Set Menu Sitting Dinner | 6 | |
| 14 | Staff Meal Plan Rp25.000 | 4 | SMP-05..20 serba 25rb; min 25 pax, Jadetabek min 100 pax, ++ delivery |
| 15 | Staff Meal Plan Rp20.000 | 4 | SMP-25..40 serba 20rb |
| 16 | ATF Favorite Buffet & Stall | 3 | buffet 90/105/120/135rb nett; stall lebih murah (Bakwan Malang 29.500) |
| 17 | Hampers Imlek | 7 | 295.000 |
| 18 | Wedding Bogor ATF | 6 | 19 MB; VOW 01/02/03 135/150/165rb nett; stall; aneka es ++; **paket wedding 100–1.500 pax (15 jt–198 jt nett, include service & charge gedung kecuali Puri Begawan; menu Fave 02; 4 jam; extra service 350rb/orang)** |

Perbandingan harga menu sama antar pricelist: lihat `00-KONTEKS-LENGKAP.md` §3.

## 4. Dokumen contoh (`lampiran/dokumen-contoh/`)

- **Quotation manual PDGI rev2** (`06/QUO-TC/10/26-rev 2`, 8 Okt 2026): Reuni 24–25 Okt 2026, Bukit Indah Villa Sentul, 35–60 pax, 2 hari; nett 14.800.000.
- **Invoice manual CIFOR** (`09/INV-TC/10/26`, PO/2026/2236/13040268): Workshop 5–7 & 9 Okt, 37 pax (35 + 2 vegetarian), 4 hari; grand total 56.650.500; termin lama (DP 50% H-14, lunas H-7).
- 🆕 **Invoice manual SEELINDO** (.xlsx, `006/INV-TC/X/26`, 6 Okt 2026): Grand Opening Zeelandia, PT Seelindo Sejahteratama, Cikupa–Tangerang, 236 pax; PR-01 236 box **+ PB1**, 5 stall + PB1 + layanan 20% stall; grand total 65.301.600; S&K versi "tidak dapat dikembalikan"; bank KCP Manginsidi (header) vs KCU Tendean (termin) di dokumen yang sama. Teks: `data/e-INV_SEELINDO_…txt`.
- **Quotation manual DIVAS** (.xlsx, `024/QUO-TC/VIII/26`, 24 Agu 2026): Grand Opening klinik, Bogor Utara, 2 paket box × 25; **tanpa PBJT**, delivery 50.000; grand total 2.975.000; sub-item item II salah nomor (I.1–I.7); penandatangan Ariz Rakhma.
- **Quotation dari Aplikasi Penjualan TC — Telkom** (format nomor aplikasi QUO-2026-xxxx; acara 15 Okt 2026): Indonesia buffet 90 pax @160.000, stall, snack box; ada baris "Layanan Penyediaan Perlengkapan Buffet & Stall"; S&K tercetak terlalu kecil.
- **Invoice dari aplikasi — CIFOR** (INV-2026-0028, ref `16/QUO-TC/09/26-rev`, "Dikonversi dari Penawaran QUO-2026-0001"): header 25 tamu vs isi 35+2/hari.
- **Kwitansi manual (buku)**: Kwitansi No · Sudah Terima Dari · Banyaknya Uang · Untuk Pembayaran · JUMLAH (Rp) · Bogor, tanggal. Kop: Jl. Julang I No.3 Tanah Sareal Bogor 16161; Phone +62 251 831 4442 (Hunting), +62 251 831 9713; Mobile +62 813 8310 8103; mktg@tiskacatering.com.
- **Syarat & Ketentuan** (gambar): Bag. I–X lengkap (ringkasan & kontradiksi di `02-ATURAN-BISNIS.md` & `06-DOKUMEN-QUOTATION.md`).

## 5. Screenshot

- `screenshot-wa/brief-01..10.png`: grup "NEW Tim Captain TISKA" & "NEW Tim Kitchen TISKA" (teks lengkap di `07-BRIEF-TEMPLATES.md`).
- `screenshot-wa/konfirmasi-driver-01..03.png`: konfirmasi "sudah sampai/diambil/diterima" + foto.
- `screenshot-referensi/tetra-ops-operations.png`: halaman Operations Tetra Ops (list event, KPI, filter) — referensi tampilan.
- `screenshot-referensi/mahakan-*.png`: Purchasing (PR), Daily Market, Supplier dari Mahakan POS — referensi pola.

## 6. Lain-lain (`lampiran/lainnya/`)

- `Proposal Konsep Tiska Ops.pdf` (24 hlm) — proposal ke atasan.
- `demo-layar-dapur.html` — demo Layar Dapur (buka di browser, tekan "Mulai demo + suara").
- `PROFIL-RAMA.md` — profil & aturan kerja Rama (berlaku semua proyek).

## 7. Website (sumber FAQ)

tiskacatering.com: profil 1980 → 2017 regenerasi (Bimo & Rita) → 2019 Kitchen Hub Bintaro (kini produksi kembali di Bogor) →
2020 hampers & nasi keranjang → 2024 tumbuh. Klien: BCA, BRI, Mandiri, BI, OCBC, DBS, Bank Raya, Royal Enfield, Pocari Sweat,
AQUA, BMW, Philips, Schneider, Coca-Cola, PLN, Codashop, Telkom, Indosat, Astra, Ecolab, Acer, XL Axiata, Pertamina, WCS.
FAQ lengkap (layanan, pemesanan, minimum, area, keamanan pengiriman, batas pemesanan, menu & vegetarian & custom, test food,
fine dining, live cooking, service charge, pajak, cover charge, lost & breakable, box, ongkir) → bahan wiki Hermes.
Tim di website: Bimo Haryo Dewanto (Chief of Ideation), Rita Ariyani (COO), Ariz Rakhma (Junior Client Experience Partner),
Reza Devyan (Finance & Accounting), Ramadan Saputra (Creative, Digital & AI Lead), Sarinah (Head Kitchen), Sulistiyowati
(Head Baker), Yoga Gusmantara, Asep Saepulloh, Sukir Edi Setiyawan (Kapten). Kontak: 0813-8310-8103 (Rita Ariyani),
(0251) 831 4442, catering.tiska@gmail.com, mktg@tiskacatering.com.
