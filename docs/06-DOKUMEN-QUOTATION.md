# 06 — Dokumen: Quotation, Invoice, Kwitansi, Nota, BAST

Contoh asli: `lampiran/dokumen-contoh/` — Quotation manual PDGI rev2 (buffet+stall, 2 hari), Invoice manual CIFOR
(4 hari, PO), Quotation manual DIVAS (box saja, .xlsx), Quotation & Invoice dari Aplikasi Penjualan TC (Telkom, CIFOR),
Kwitansi buku manual, S&K. Teks hasil ekstrak: `data/rev2-QUO_…txt`, `data/e-INV_CIFOR…txt`.

## 1. Kepala dokumen (sama untuk quotation & invoice — tiru tata letak dokumen sekarang)

Kiri: ACCOUNT NAME – Pemesan · ADDRESS / HOME ADDRESS – Alamat · DATE – Tanggal.
Kanan: UP – Kepada · PIC · Phone – HP · No. dokumen · Ref. PO No. (invoice) · Jatuh tempo (invoice).
Blok acara: EVENT DAY/DATE – Tanggal Acara · DAYS – Jumlah Hari · EVENT – Nama Acara · TIME – Pukul / per DAY-n ·
EVENT STATUS (Proposal/Confirmed) · GUEST – Jumlah Tamu (boleh rentang, mis. "35-60 pax") · F&B Planner – Perancang Menu
(inisial, mis. LDW/SKW/RAY — ⚠️ siapa mereka belum diketahui) · VENUE/DELIVERY – Lokasi · SET-UP LOADING – Waktu setup.
Judul: "QUOTATION – <JENIS ACARA>" / "INVOICE – <JENIS ACARA>" (mis. GATHERING, WORKSHOP) dan tanggal ID + EN
("Saturday - Sunday, 24-25 October 2026 / [Sabtu - Minggu, 24-25 Oktober 2026]").

## 2. Tabel isi

Kolom: NO · DESCRIPTION/Jenis Pesanan · Day · Qty · Pax · Vol. (pax/box/ekor/paket/porsi/loyang/set) · Harga Satuan · Total.
Total baris = Day × Qty × Pax × Harga (pola `web/lib/uang.ts`; kosong = 1).
Struktur: judul hari/sesi ("MEAL ARRANGEMENT – DINNER", "Sabtu, 24 Oktober 2026", "19.00 WIB ready to serve") →
item bernomor romawi (I, II, …) → isi menu sub-item (I.1, I.2 …) **penomoran sub-item mengikuti induk** (bug manual DIVAS:
item II berisi I.1–I.7) → baris varian (mis. "VEGETARIAN" sebagai I.1 dengan harga sama) → "Total – I" per kelompok
(seperti invoice dari aplikasi).
Item paket menampilkan kode + nama hero dish: "[PR-24] Nasi Daging Lada Hitam", "PREFERRED LUNCH BOX – NASI LIDAH CABE IJO".
Stall menampilkan konversi (mis. "1 ekor = 50 porsi"). Pilihan klien ditandai.

## 3. Ringkasan bawah (urutan)

```
Sub Total (I–<romawi terakhir>)         ← label otomatis, tidak pernah salah
PBJT 10%                                 ← dari item makanan (cek aturan box: lihat 02 §1)
PPN 11%                                  ← hanya bila ada sewa alat / jasa PPN
Layanan Penyediaan Perlengkapan Buffet & Stall (15% / min. Rp1.500.000)   ← atau "(4 days @1.800.000)"
Delivery Fee                             ← zona / per kloter
Staf tambahan / overtime (bila ada)
TOTAL
Pembulatan                               ← ditampilkan sebagai baris (bukan diam-diam)
NETT TOTAL – Rounded
```
Blok rekening: "Pembayaran via transfer ke Rekening BCA … Account number 210-999-8880 a.n. PT. TISKA CIPTA IMAJI · Bank Code 014-0397 (KPO) · Swift CENAIDJA" (⚠️ cabang KC Tendean vs KCP Monginsidi — konfirmasi).
Catatan: "Dikonversi dari Penawaran <nomor>" pada invoice.
Tanda tangan: "Hormat Kami, <nama penandatangan> TISKA Catering" · "Persetujuan Klien, (……)" — klien bisa tanda tangan di HP lewat link.

## 4. Syarat & Ketentuan

Template per jenis layanan (`terms_templates`), ditulis sekali, menempel otomatis sesuai isi order:
I Buffet & Stall · II Nasi Box/Snack Box · II' Set Menu/Fine Dining · III Harga, pajak, layanan, cover charge, lost & breakable,
delivery · IV Penambahan pelayanan (tarif staf) · V Sewa peralatan (13 item) · VI Termin · VII Peraturan pemesanan ·
VIII Waktu & agenda + durasi 6 jam · IX Transit kitchen/pantry · X Refund/cancellation + force majeure.
Sumber teks: `data/rev2-QUO_…txt` + gambar `lampiran/dokumen-contoh/Syarat & Ketentuan quotation.png` + DIVAS.xlsx (teks lengkap).
**Sebelum dijadikan template, rapikan bersama owner**: (1) VI.7 vs X (refund); (2) III.2/III.3/III.10 "sudah termasuk PB1 /
service charge / delivery" padahal ditagih terpisah untuk buffet; (3) cabang bank; (4) penomoran VI melompat 5→7;
(5) poin Prokes COVID-19 (III.9) masih relevan?; (6) istilah "Service Charge" → "Layanan Penyediaan Perlengkapan Buffet & Stall".
Ukuran huruf S&K di PDF harus terbaca (quotation Telkom dari aplikasi tercetak terlalu kecil).

## 5. Invoice

Turunan dari quotation disetujui. Jenis: booking fee, DP, pelunasan, penuh (instansi). Menampilkan termin & riwayat bayar,
Ref. PO, jatuh tempo. Teks termin dari S&K VI. Faktur pajak (nomor) bila ada baris PPN. Tanggal diterima klien dari bukti kirim.

## 6. Kwitansi (digital pengganti buku)

Field buku saat ini: No · Sudah Terima Dari · Banyaknya Uang (terbilang) · Untuk Pembayaran · JUMLAH (Rp) · "Bogor, <tanggal>".
Ditambah: nomor invoice terkait, metode bayar, penandatangan, tanda **materai Rp10.000** bila > Rp5 juta (untuk instansi: wajib bermaterai).
Terbilang: helper tunggal (`terbilang.ts`, ada di Tetra Ops).

## 7. Nota & BAST

Belum ada contoh dari tim (⚠️ minta). Usulan:
- Nota (lunas): ringkas item + total + "LUNAS" + tanggal bayar.
- BAST: daftar pesanan yang diserahkan (jumlah per item/kloter), waktu tiba, kondisi, catatan, tanda tangan penerima (di HP captain/driver) + foto.

## 8. Format nomor & nama file

`QUO/TC/2610/006-R2` → file `QUO-TC-2610-006-R2.pdf`. Detail di `02-ATURAN-BISNIS.md` §12.

## 9. Pemeriksaan otomatis sebelum kirim

Label subtotal & romawi; sub-item mengikuti induk; terbilang = angka; jumlah tamu header vs isi pesanan (contoh selisih:
invoice CIFOR aplikasi header 25 tamu, isi 35+2 pax/hari; manual menyebut 37 pax); pajak sesuai jenis item; layanan
perlengkapan hanya bila ada buffet/stall; delivery fee sesuai zona; untung ≥ batas atau sudah disetujui owner; S&K sesuai jenis.
