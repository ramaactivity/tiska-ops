# Sewa alat (D-209)

Permintaan atasan lewat Rama, 18 Nov 2026: sewa alat jangan bercampur dengan menu di quotation/invoice; alat punya
database sendiri (Mas Reza yang mengisi alat & harganya); tim dapur/belakang perlu tahu alat apa yang harus disiapkan.

Penjelasan Rama (fakta bisnis):
- Klien melihat semua alat sebagai **milik Tiska**. Sebagian alat memang milik Tiska (piring, gelas, chafing dish, …);
  bila jumlah yang dibutuhkan event **melebihi stok milik Tiska**, Tiska menyewa lagi ke vendor (mis. J&C Equipment).
- Alat yang tidak disewakan ke klien (operasional sehari-hari) = **data aset**, bukan katalog sewa.
- Mas Reza: "sementara kita masukin dulu database alat-alatnya aja biar bisa diinput ke dalam invoice."

## Tahap 1 — sudah jalan

**Data**
- `equipment.for_rent` — dicentang **"Disewakan ke klien"** di halaman Peralatan (bagian harga). Hanya alat bercentang
  yang muncul sebagai saran di section Sewa alat. 13 alat lama otomatis bercentang.
- `quotation_items.kind` / `invoice_items.kind` = `'alat'` untuk baris sewa alat (null = menu, seperti semua data lama);
  `equipment_id` menautkan ke alat di Peralatan (kosong bila ditulis sendiri).
- Kolom `equipment.source`, `supplier_id`, `vendor_price`, `vendor_terms` sudah ada di DB tetapi **belum dipakai layar**
  (lihat tahap 2 — rancangannya berubah setelah penjelasan Rama).

**Form quotation/invoice** — section "Sewa alat" di bawah Menu & harga: ketik nama alat → saran dari daftar alat sewa
(harga sewa ikut terisi) atau "Tulis alat sendiri". Per baris: Day, Qty, Vol., Harga sewa, Compliment, "Kena PPN sewa alat"
(bawaan nyala: PPN, bukan PBJT & layanan — D-015), Catatan di bawah alat.

**Keluaran**
| Tempat | Tampilan |
|---|---|
| Quotation/Invoice (layar cetak, PDF, WA) | Tabel **SEWA ALAT** sendiri di bawah tabel menu, nomor 1, 2, 3; baris "Total sewa alat" bila ≥ 2 alat; compliment tanpa harga |
| Excel | Baris judul "SEWA ALAT" lalu alatnya, sesudah semua menu |
| Lembar dapur (PO to Kitchen) | Tabel **"Alat yang perlu disiapkan"**: No, Alat, Day, Qty, Vol. — tanpa harga |
| Event, Kebutuhan bahan, Layar dapur, riwayat harga menu, panel kiri form | Baris alat **tidak** ikut (bukan menu) |

Tes: `lib/dokumen.test.ts` (simpan kind/equipment_id), `components/dokumen-dapur.test.tsx` (tabel alat dapur, tanpa harga),
`scripts/excel-dokumen.test.ts` (urutan & nomor di Excel).

## Tahap 2 — rancangan (belum dibangun, tunggu data dari Mas Reza)

1. **Daftar harga vendor** — tabel baru per vendor (`suppliers` kategori sewa_alat): nama barang vendor, harga sewa dari
   vendor (biaya Tiska), harga ganti rugi, paket & S&K vendor, dan tautan opsional ke alat Tiska (`equipment_id`) bila
   barangnya sama (mis. "Piring Makan" J&C ↔ "Set piring" Tiska). Bahan pertama: `data/vendor-sewa-alat/jc-equipment.csv`
   (57 barang). Harga vendor = biaya → hanya Owner & Accounting (aturan HPP), disaring di server.
2. **Kekurangan stok per event** — dari baris alat di quotation/invoice yang sudah jadi event: butuh (qty) − milik Tiska
   yang tersedia di tanggal itu = kurang → saran sewa ke vendor dengan harganya. Dicatat ke `event_equipment` (alat dibawa)
   yang sudah ada di halaman event.
3. **Data aset** (alat yang tidak disewakan) tetap di halaman Peralatan dengan centang "Disewakan ke klien" mati — tidak
   perlu menu terpisah sampai ada kebutuhan (penyusutan, dsb.).

Pertanyaan untuk atasan sebelum tahap 2: sewa alat selama ini kena **PPN 11%** (D-015) — QUO 832 lama menagihnya dengan
PBJT. Bawaan form sekarang PPN; centang "Kena PPN sewa alat" bisa dimatikan per baris bila memang PBJT.
