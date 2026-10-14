# 02 — Aturan Bisnis (angka & rumus)

Semua angka di sini disimpan sebagai **pengaturan** (bisa diubah owner/accounting tanpa deploy), kecuali disebut lain.
Kolom "Sumber" menunjukkan dari mana aturan berasal. Rumus diimplementasikan di **satu modul** (`lib/hitung/*`) dan
dipakai halaman, PDF, Hermes, dan laporan. Tiap aturan wajib punya unit test dengan contoh angka di bawah.

## 1. Pajak

| Item | Pajak | Sumber |
|---|---|---|
| Harga makanan & minuman (katering) | **PBJT 10%** (dulu disebut PB1). Katering bukan objek PPN | Pak Reza, Mbak Ariz |
| Sewa alat / jasa selain katering | **PPN 11%** + faktur pajak (Tiska PKP) | Pak Reza |
| Layanan Penyediaan Perlengkapan Buffet & Stall | **Tidak kena pajak** | Pak Reza ("hanya harga makanan dan sewa alat") |
| Delivery Fee | **Tidak kena pajak** | Pak Reza |
| Staf tambahan, overtime | ⚠️ Belum ditanyakan — default ikut "jasa lain" (PPN)? **Konfirmasi ke Pak Reza** | — |

Dasar PBJT = subtotal makanan & minuman (setelah item compliment = 0). Contoh PDGI: 11.912.500 × 10% = 1.191.250.

⚠️ **Pesanan box saja**: quotation DIVAS (24 Agu 2026, 2 paket box @25 box, Bogor) **tidak menambahkan PBJT** —
Sub Total 2.925.000 + Delivery Service 50.000 = Grand Total 2.975.000. S&K III.2 berbunyi "Harga sudah termasuk PB-1 (10%)".
Dugaan: **harga box sudah termasuk PBJT**, sedangkan buffet/stall/coffee break ditambah PBJT terpisah (PDGI, CIFOR, Telkom).
**Wajib dikonfirmasi ke Pak Reza / Mbak Ariz** sebelum mesin hitung dibuat. Implementasi: flag per pricelist/paket
`harga_termasuk_pajak` (true untuk box bila terkonfirmasi), dan PBJT tetap dicatat terpisah di laporan (harga ÷ 1,1).

🆕 **Bukti tandingan (14 Okt 2026)**: invoice manual **SEELINDO** (`006/INV-TC/X/26`, 6 Okt 2026, Cikupa–Tangerang, corporate)
**menambahkan PB1 10% ke box** PR-01 236 box × 58.500 = 13.806.000 + PB1 1.380.600. Jadi praktik box **tidak seragam**:
DIVAS (Bogor, 25 box) tanpa PBJT vs SEELINDO (Tangerang, 236 box) dengan PBJT. Dugaan "harga box selalu termasuk PBJT" **lemah**;
kemungkinan lain: DIVAS lupa/diberi kelonggaran.

✅ **Terjawab (Pak Reza, 14 Okt 2026)**: "harusnya kena, cuma suka ada yang nego gak mau dikenakan PB1." → **D-022**: PBJT default aktif untuk semua
makanan termasuk box; Quotation Builder punya **saklar PBJT aktif/nonaktif** per quotation (dan per baris, `charge_pb1` sudah ada di aplikasi lama).
Saat dimatikan: wajib alasan (mis. "nego klien"), tercatat siapa & kapan, terlihat di laporan. Flag `harga_termasuk_pajak` per pricelist tidak dipakai untuk box.

## 2. Layanan Penyediaan Perlengkapan Buffet & Stall (pengganti istilah "service charge")

Berlaku **hanya** bila order mengandung item buffet atau stall (tidak untuk pesanan box saja).
Dasar = **subtotal makanan sebelum pajak**. Nilai = **max(persen × dasar, minimum)**.

| Zona / jenis | Persen | Minimum | Sumber |
|---|---|---|---|
| Bogor & sekitarnya — pribadi & corporate | 15% | Rp1.500.000 | Mbak Ariz, S&K |
| Jakarta / Jabodetabek — pribadi & corporate | 21% | Rp2.500.000 | Mbak Ariz, S&K |
| Set menu / fine dining — Bogor | 20% | Rp2.000.000 | S&K Bag. II |
| Set menu / fine dining — Jadetabek | 25% | Rp2.500.000 | S&K Bag. II |
| Mode flat per hari | mis. Rp1.800.000/hari (CIFOR: "2x Coffee Break & 1x Lunch Buffet, 4 days @1.800.000") | — | Invoice CIFOR |
| Mode manual | diisi admin | — | — |

Contoh: PDGI (Sentul = Bogor) subtotal 11.912.500 × 15% = 1.786.875 (> 1,5 jt) → 1.786.875.
🆕 SEELINDO (Tangerang = Jabodetabek): layanan "Service Penyediaan & Pelayanan Buffet" = **20%** × subtotal **stall saja** 38.550.000 = 7.710.000
(bukan 21% seperti tabel; box di order yang sama **tidak** ikut jadi dasar layanan). ⚠️ Tanyakan: 20% itu diskon khusus atau tarif lama?
Standar berlaku untuk durasi 6 jam (1 jam persiapan + 4 jam servis + 1 jam closing); lebih dari itu overtime (tarif staf tambahan).
Pesanan < 500 porsi: area buffet & stall tidak dapat dibagi 2 titik; bila perlu → biaya tambahan sewa pemanas + tim (S&K I.10).

## 3. Delivery Fee (istilah di quotation & invoice)

| Zona | Tarif | Catatan |
|---|---|---|
| Jakarta, Depok, Bekasi, Tangerang/BSD (Jabodetabek) | Rp250.000 | Toleransi: sales boleh Rp150.000 untuk Depok/Jaksel |
| Bogor | Rp50.000 | |
| Luar Jabodetabek | Bea transportasi khusus (manual) | S&K III.5 |

- Pesanan **hanya box**: dikenakan **per kloter** (2 kloter = 2×).
- Order **dengan layanan buffet**: jawaban tim ambigu — kemungkinan besar **tidak dikenakan** (sudah termasuk layanan perlengkapan; konsisten dengan quotation Telkom). ⚠️ Konfirmasi ke Mbak Ariz. Implementasi: saklar per order, default "tidak dikenakan bila ada layanan buffet".
- Standar delivery: 1 arah per 1 titik lokasi (drop off only) — S&K III.11.

## 4. Harga, paket, untung

- Harga paket **per pax**, **sama** berapa pun jumlah tamu (tidak ada tier). (Mbak Ariz)
- Isi paket dipilih dari daftar menu yang ada. Custom (tukar menu) → harga **ditentukan manual** oleh sales. (Mbak Ariz)
- Contoh custom terbanyak: tukar satu lauk dalam paket (ayam bakar → ayam dabu-dabu).
- Harga set menu dihitung mulai 2× harga menu reguler (S&K II.4). VIP/VVIP cutleries mulai Rp250.000++/pax (S&K II.7). Standar 1 waiter per meja 5–6 orang (S&K II.8).
- **HPP per porsi** = biaya bahan per porsi × (1 + 30%). Overhead 30% = tenaga kerja, gas, listrik. Sewa alat & transport **tidak** masuk HPP. (Pak Reza) Contoh: bahan Rp10.000.000 + overhead Rp3.000.000 = HPP Rp13.000.000. Verifikasi data lama: Ayam Kodok bahan 3.755,70 × 1,3 = 4.882,41 (file: 4.882,42).
- Saran harga jual = HPP ÷ 50% (target food cost dari file BOM).
- **Untung minimum 30% dari harga jual** (Mbak Ariz). Penanda: ≥35% aman · 30–35% mepet (info ke owner & accounting) · <30% wajib persetujuan owner sebelum quotation dikirim.
- Untung untuk pricelist basis **nett**: harga nett dikurangi PBJT & layanan dulu, baru dibandingkan HPP.
- Harga menu tidak mengikat & dapat berubah (S&K III.1).

## 5. Minimum, batas waktu, perubahan

| Aturan | Nilai | Sumber |
|---|---|---|
| Minimum order buffet & box | 25 pax / 25 box | Website FAQ, S&K II.6 |
| Minimum intim | 20 pax dengan penyesuaian layanan | Website FAQ |
| Batas konfirmasi pemesanan | Acara besar H-30, sedang H-14, casual H-3 (mendadak → admin) | Website FAQ |
| Perubahan porsi/menu buffet | H-5, jam kantor 09.00–17.00 | S&K I.4 |
| Perubahan nasi box | H-2, jam kantor | S&K II.9 |
| Perubahan waktu & agenda acara | H-3 | S&K VIII.2 |
| Tambahan porsi | minimal 10% dari total | S&K I.3, II.7 |
| Masa konsumsi aman | 4 jam sejak disajikan/diterima (DinKes) | S&K I.7, II.2 |

## 6. Termin pembayaran

Default (S&K Bag. VI, dikonfirmasi Mbak Ariz):
1. Booking fee **Rp5.000.000** (tanda jadi)
2. DP **50%** paling lambat **H-30**
3. Pelunasan paling lambat **H-14**

Variasi: Pak Reza menyebut DP tidak tetap (20–50% atau nominal tanda jadi) → admin boleh mengubah per klien.
Invoice CIFOR lama menulis "DP 50% H-14, pelunasan H-7" → versi lama, jangan dipakai.
Instansi pemerintah: boleh bayar setelah acara; dokumen: invoice/faktur + **kwitansi bermaterai**.
Bukti DP = menyetujui semua S&K walau tanpa tanda tangan (S&K VI.8).
Rekening: BCA a.n. **PT. TISKA CIPTA IMAJI**, No. 210-999-8880 (⚠️ cabang tertulis KC Tendean di S&K vs KCP Monginsidi di quotation/invoice — konfirmasi).

## 7. Pembatalan (S&K Bag. X)

| Waktu pembatalan sepihak | Pengembalian |
|---|---|
| ≥ H-90 | 100% |
| H-45 s/d H-89 | 70% dari yang sudah dibayar (atau dipakai untuk produk lain) |
| H-30 s/d H-44 | 50% |
| < H-30 | Tiska berhak 100% (dapat dipakai produk lain) |
Pemakaian ulang dana maksimal 3 bulan dari tanggal pembatalan. Force majeure diatur terpisah.
⚠️ S&K Bag. VI poin 7 menyatakan "semua pembayaran tidak dapat dikembalikan" → kontradiksi, minta owner memilih.

## 8. Komisi, materai, persetujuan

- Komisi rekanan (WO/vendor): **3,5% dari nilai makanan & minuman** (tidak termasuk layanan, delivery, sewa alat, pajak). Waktu pembayaran komisi: belum ditentukan (usul: setelah klien lunas).
- Bea materai: dokumen bernilai **> Rp5.000.000** → materai Rp10.000 (tandai di kwitansi).
- Persetujuan quotation: mayoritas "OK" via WA/telepon; diharapkan tanda tangan & kirim balik ke sales.

## 9. Staf tambahan & sewa alat (S&K Bag. IV & V)

Staf: Kitchen Rp350.000/3 jam/orang (+Rp75.000/jam) · Waiter Rp300.000/3 jam (+Rp50.000/jam) · Clear-up Rp250.000/3 jam (+Rp50.000/jam). Standar clear-up 1 waiter/150 pcs.

Sewa alat di luar standar menu (juga dasar tabel lost & breakable):
| # | Item | Harga |
|---|---|---|
| 1 | Peralatan standar set piring, gelas, garpu, sendok | Rp5.000/pc |
| 2 | Gelas goblet | Rp10.000/pc |
| 3 | Gelas wine | Rp15.000/pc |
| 4 | Alat pemanas makanan (chafing dish)* | Rp250.000/pc |
| 5 | Set meja gubukan/stall (taplak, sketsel gawangan, runner)* | Rp250.000/set |
| 6 | Set meja round table Ø120 cm (VIP taplak & runner)* | Rp200.000/set |
| 7 | VIP table cover (taplak bulat + runner) only | Rp150.000/set |
| 8 | Kursi futura + stretch cover putih | Rp35.000/set |
| 9 | Rangkaian vas bunga meja round table | Rp75.000/pc |
| 10 | Rangkaian vas bunga meja buffet | Rp350.000/pc (pricelist Bogor: /set) |
| 11 | Napkin | Rp15.000/pc |
| 12 | Placemat | Rp15.000/pc |
| 13 | Juice pitcher | Rp20.000/pc |
\* Setiap tambahan sewa peralatan wajib diikuti tambahan staf clear-up.

## 10. Honor & DW

Honor per event untuk karyawan tetap & freelance, **tarif berbeda** (angka belum ada → diisi via wizard). DW dicatat captain (nama, HP, peran, hadir, jam datang–pulang) → rekap ke Pak Reza → transfer → "sudah ditransfer" + bukti. Honor = biaya event.

## 11. Belanja, stok, opname

- Belanja per event oleh Pak Sur, termasuk isi ulang stok yang terpakai. 80% pasar/cash, 20% supplier tempo.
- Alur: daftar kebutuhan → persetujuan Finance → transfer dana estimasi → belanja → rekap nota per event → lapor Finance & Accounting.
- Gudang mencatat **bahan makanan + packaging**. Opname **sebulan sekali oleh Tya** (pengingat tanggal 1). Selisih > 5% wajib alasan (pola Mahakan).
- Peralatan: belum ada data → hitung awal. Rekap peralatan per event: sewaan vs milik sendiri.

## 12. Penomoran dokumen

Format: `<JENIS>/TC/<YYMM>/<NNN>[-R<n>]` — mis. `QUO/TC/2610/006-R2`. Jenis: QUO, INV, KWT, NTA, BAST, PR, PO, GR.
Urutan per bulan per jenis (mulai 001 tiap bulan). Revisi menambah `-R2`, `-R3` (versi pertama tanpa akhiran).
Invoice mencantumkan nomor quotation asal. Nama file: tanda `/` diganti `-` (`QUO-TC-2610-006-R2.pdf`).
Penerbitan nomor aman dari tabrakan (lock per jenis+bulan; pola `web/lib/nomor.ts` + advisory lock Mahakan).
Nomor lama tidak diubah. Format lama yang beredar: `06/QUO-TC/10/26-rev 2` (bulan angka), `024/QUO-TC/VIII/26` (bulan romawi, quotation DIVAS), `09/INV-TC/10/26`, dan dari aplikasi `QUO-2026-0001` / `INV-2026-0028`.

## 13. Contoh perhitungan acuan (wajib jadi test)

**PDGI rev2 (quotation manual, Sentul/Bogor)**
| Baris | Nilai |
|---|---|
| I Dinner buffet PR-24 60 pax × 88.500 | 5.310.000 |
| II Stall lontong + kambing guling 1 ekor | 3.500.000 |
| III Breakfast: coffee 20 × 17.500, tea 15 × 17.500, bubur kendil 1 paket 550.000 | 1.162.500 |
| IV Lunch buffet BS-15 40 pax × 48.500 | 1.940.000 |
| Subtotal | 11.912.500 |
| PBJT 10% | 1.191.250 |
| Layanan perlengkapan 15% (min 1,5 jt) | 1.786.875 |
| Total | 14.890.625 |
| Pembulatan | −90.625 |
| Nett | 14.800.000 |

**DIVAS (quotation box saja, Bogor)**: PR "Nasi Lidah Cabe Ijo" 25 box × 68.500 = 1.712.500; BS "Nasi Bakar Limau" 25 box × 48.500 = 1.212.500; subtotal 2.925.000; Delivery 50.000; grand total 2.975.000 (tanpa baris PBJT, tanpa layanan perlengkapan).

**CIFOR (invoice, Bogor, 4 hari)**: subtotal 44.955.000 → PBJT 4.495.500 → layanan flat 4 × 1.800.000 = 7.200.000 → grand total 56.650.500.

**SEELINDO (invoice, Tangerang, 1 hari, box + stall)** — dihitung per kelompok:
| Baris | Nilai |
|---|---|
| I PR-01 Nasi Sapi Lada Hitam 236 box × 58.500 | 13.806.000 |
| PB1 10% (I) | 1.380.600 |
| Total I | 15.186.600 |
| II Stall: Sate Ponorogo 150 × 45.000; Kambing Guling 3 ekor × 3.500.000; Laksa 150 × 55.000; Nasi Bebek Hainan 150 × 59.500; Rujak Ice Cream 150 × 27.500 | 38.550.000 |
| PB1 10% (II) | 3.855.000 |
| Layanan 20% × stall | 7.710.000 |
| Total II | 50.115.000 |
| Grand total | 65.301.600 |
Tanpa delivery fee (ada layanan buffet/stall → konsisten dengan dugaan §3). Termin corporate: approval quotation → pelunasan H+7 setelah invoice diterima.
