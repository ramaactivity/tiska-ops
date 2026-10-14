# 01 — Spesifikasi Produk Tiska Ops

Status: rancangan v1 (14 Okt 2026). Basis kode: `cateringtiska/Aplikasi-Penjualan-TC/web` (sudah dipakai produksi).
Konvensi: label "**[ADA]**" = sudah ada di Aplikasi Penjualan TC, "**[UPGRADE]**" = diperluas, "**[BARU]**" = dibangun baru.
Aturan angka & rumus: `02-ATURAN-BISNIS.md`. Skema: `03-DATA-MODEL.md`. Akses: `05-ROLES-RBAC.md`.

## Prinsip produk

1. **Satu data, satu tempat.** Menu, harga, klien, event ditulis sekali; quotation, invoice, brief, layar dapur, Hermes membaca dari data yang sama. Satu helper/rumus dipakai semua permukaan (halaman, PDF, bot, AI).
2. **Sistem yang menghitung.** HPP, pajak, layanan perlengkapan, delivery fee, termin, terbilang, pembulatan.
3. **Tampilan sesuai peran.** HPP/harga beli/margin hanya Owner & Accounting — dikunci di DB.
4. **HP-first untuk lapangan**, desktop untuk kantor. Pengguna lapangan usia 50+, sebagian tidak lancar membaca.
5. **AI membantu, manusia memutuskan.** Tidak ada pesan ke klien tanpa persetujuan.
6. **Bahasa sehari-hari**: "Untung per porsi", "Harga ini terlalu mepet" — bukan "gross margin", "food cost ratio".
7. **Exception-based**: layar hijau = tidak perlu tindakan; kuning/merah hanya bila ada yang perlu perhatian.

---

## A. Klien & Lead (CRM) — [UPGRADE dari `customers`]

- Jenis klien: perorangan, perusahaan, instansi pemerintah, WO/vendor rekanan, venue rekanan.
- Sumber lead: WA langsung, Instagram/TikTok, website, rekanan (WO/vendor), repeat order.
- Tahapan (pipeline): `tanya` → `quotation` → `dp` → `test_food` (opsional) → `final` → `berjalan` → `selesai` / `batal`.
- Profil: nama, PIC, HP, email, alamat, NPWP, rekanan pemberi referensi (untuk komisi 3,5%), catatan preferensi.
- Riwayat: chat (ringkasan dari Hermes), quotation & versi, invoice, pembayaran, pricelist yang pernah dikirim, event.
- Pengingat follow-up untuk klien yang belum membalas (ke admin/sales, bukan otomatis ke klien kecuali disetujui).
- Lead dari Hermes masuk otomatis berisi data terkumpul + ringkasan percakapan.

## B. Bahan, Resep & HPP — [BARU]

- Impor 977 bahan dari `data/bahan.csv` (kode, kategori, kemasan beli, isi per kemasan dalam satuan resep, harga).
- Konversi satuan: kemasan beli → satuan resep (mis. beras 25 kg = 33,25 liter). Pratinjau konversi saat input (pola Mahakan).
- Harga bahan = harga pembelian terakhir (dari Purchasing), fallback harga lama.
- Resep per menu: porsi per batch + daftar bahan & qty. Impor dari `data/resep.csv` (588 resep terbaca, 5.999 baris).
- **HPP per porsi** = (Σ qty × harga per satuan resep) ÷ porsi × (1 + overhead%). Overhead default 30%.
- Saran harga jual = HPP ÷ target food cost (default 50%). Kedua angka di Pengaturan.
- Status resep: `standar` (±70%) / `perkiraan` (±30%) / `belum_ada`. Antrian "Perlu dilengkapi" untuk Kepala Dapur.
- Riwayat HPP per menu (ikut perubahan harga bahan) → peringatan bila untung paket/pricelist turun < batas.
- Menu ditandai **dapur pelaksana**: `masak` atau `pastry` (untuk pemecahan brief & layar dapur).
- Tim dapur melihat resep & takaran **tanpa harga**.

## C. Paket & Menu — [BARU]

- **Master menu**: satu menu satu baris (nama, kategori: soup/rice/beef/chicken/fish/vegetable/appetizer/dessert/beverage/condiment/snack/stall/dll., resep, foto, deskripsi, label vegetarian/halal, dapur).
- **Master paket** tiga jenis:
  1. *Isi tetap* — BS-01..24, PR-01..20+, Premium Nusantara, International Taste (box).
  2. *Pilih per kategori* — buffet Indonesian/Asian/Western/Fiesta/VOW: "1 soup, 1 rice, 1 beef, 1 chicken, 1 fish, 1 vegetable + 2 dessert + 3 minuman", dari daftar pilihan per kategori.
  3. *Bundling per jumlah tamu* — paket wedding 100–1.500 pax (buffet + stall + VIP).
- **Bentuk penyajian** dipisah dari isi: box reguler / box sedang / box premium / buffet / stall / plated / tampah / tumpeng. Biaya kemasan/alat per bentuk dihitung terpisah sehingga HPP tepat.
- Tukar menu dalam paket menampilkan alternatif **kategori yang sama**.

## D. Pricelist & Pustaka PDF — [BARU]

- Pricelist = daftar harga per konteks: kode (01–18), nama, segmen (Corporate/Wedding/Hampers/Musiman/Venue/Staff meal), wilayah (Bogor/Jakarta), venue, **basis harga (nett / ++)**, masa berlaku, status (draft/aktif/arsip), versi.
- Item pricelist: menu/paket → harga di pricelist ini. Harga boleh beda antar pricelist (tercatat & bisa dibandingkan).
- Untung dihitung per item per pricelist; untuk basis nett, harga dikurangi pajak & layanan dulu sebelum dibanding HPP.
- Fitur: salin pricelist, update massal dengan pratinjau (mis. semua stall Jakarta +5%), perbandingan 2 pricelist berdampingan, peringatan lintas pricelist saat HPP naik.
- **Pustaka PDF untuk sales** (HP & desktop): cari/filter, pratinjau, "Kirim WA", "Salin link". Hanya versi aktif tampil. Link permanen `/pl/<slug>` selalu ke versi terbaru. Versi terkompres untuk WA (file asli disimpan). Riwayat versi (siapa, kapan, apa berubah). Tanda "PDF perlu update" bila harga sistem berubah. Musiman (Ramadan, Imlek, Holiday) auto-arsip setelah masa berlaku + pengingat sebelum musim. Log pengiriman PL per klien.
- Fase lanjut (opsional): PDF pricelist dibuat otomatis dari data.

## E. Quotation Builder — [UPGRADE, PRIORITAS]

Yang sudah ada di `web/` (pertahankan): baris hari × qty × pax × harga, kelompok item + sub-item (romawi), compliment, saklar PB1/service per baris, service %, delivery, biaya tambahan (`quotation_charges`), multi-tanggal acara, F&B planner, penandatangan, ekspor Excel, cetak.

Yang ditambah:
1. Pilih **pricelist** otomatis dari konteks (wilayah, venue, segmen) — bisa diganti.
2. **Struktur Hari → Sesi** (jam + jenis: breakfast/coffee break/lunch/dinner/stall) → item. Header jumlah tamu dicek vs isi pesanan.
3. Pilih paket → isi menu masuk → **Tukar** (kategori sama) / tambah / hapus. Harga baris tetap, sales boleh ubah manual; HPP dihitung ulang di belakang.
4. **Pajak per jenis item**: makanan → PBJT 10%; sewa alat → PPN 11%; layanan perlengkapan & delivery fee → tanpa pajak.
5. **Layanan Penyediaan Perlengkapan Buffet & Stall** otomatis bila ada item buffet/stall: mode persen-minimum (Bogor/Jakarta), set menu, flat per hari, manual.
6. **Delivery Fee** otomatis dari zona; box per kloter; toleransi manual.
7. Add-on dari tabel S&K: staf tambahan, sewa alat (13 item), overtime.
8. **Pembulatan nett** sebagai baris diskon yang terlihat.
9. **Penanda untung** (Owner & Accounting saja): ≥35% hijau, 30–35% kuning, <30% merah → status `menunggu_persetujuan_owner`; sales hanya melihat status itu.
10. **Revisi berversi**: R1, R2… snapshot penuh; tampilan perbandingan antar versi (menu diganti, pax, harga).
11. **PDF langsung dari server** (bukan print browser), S&K terbaca (ukuran layak), nomor format baru, nama file `QUO-TC-2610-006-R2.pdf`.
12. **Persetujuan klien**: catat "OK via WA/telepon" (siapa, kapan, bukti screenshot) atau link tanda tangan di HP; unggah dokumen bertanda tangan.
13. **Pemeriksaan otomatis** sebelum kirim: label subtotal & penomoran item, terbilang, pax header vs isi, pajak sesuai jenis.
14. Kirim ke klien via WA (Hermes) **hanya setelah admin menekan Kirim**.
15. Komisi rekanan 3,5% tercatat bila klien dari rekanan.

## F. Dokumen & Pembayaran — [UPGRADE]

- Dokumen: Quotation, Invoice (DP / termin / pelunasan / penuh), Kwitansi, Nota (lunas), BAST. Satu sumber data dari quotation yang disetujui.
- Termin default: booking fee Rp5 jt → DP 50% H-30 → pelunasan H-14; bisa diubah per klien (persen atau nominal). Instansi: bayar setelah acara.
- Pembayaran [ADA]: alokasi ke banyak invoice, PPh 23, status lunas otomatis, piutang, pengakuan penjualan saat acara terjadi.
- Kwitansi: terbilang otomatis; tanda **wajib materai Rp10.000** bila > Rp5 jt.
- Faktur pajak untuk baris PPN (sewa alat) — catat nomor faktur; ekspor untuk Coretax (fase lanjut).
- BAST: ditandatangani klien di lokasi (tanda tangan di HP captain) atau foto dokumen.
- Penomoran baru (D-007) untuk semua jenis; nomor lama tetap.
- Tanggal invoice diterima klien (dari bukti kirim) → dasar jatuh tempo.
- Pembatalan: hitung refund otomatis sesuai jadwal S&K.

## G. Event & Operasional — [BARU]

- Event = order yang sudah DP/final. Hari → Jadwal (jam tiba/ambil/siap saji) → Item (paket/menu, qty, kemasan: box coklat, 12x12, 26x20, stiker logo; pilihan menu `*`; catatan dapur; vendor luar mis. MEY Bakery; regular vs vegetarian pax per hari; lokasi detail di venue).
- Cara layanan: antar (tiba di lokasi) / diambil klien di Tiska / set-up & service.
- **Penugasan**: kloter (jam berangkat dari Julang), kendaraan, driver, captain (PIC), anggota + peran (steward, delivery lauk, dll.), tugas khusus (ambil bunga), perlengkapan (pemanas VIP, rangkaian bunga buffet — bisa pakai ulang dari event lain).
- Cek bentrok: orang/kendaraan di dua tempat; kapasitas dapur per tanggal.
- Tugas non-event untuk driver (mis. antar keluarga owner) — jadwal kendaraan.
- **Sesi masak** per order per dapur dihitung mundur dari jam berangkat (durasi default per jenis/porsi — belum ada patokan; bisa diedit Kepala Dapur).
- **Kunci order** setelah batas perubahan (H-5 buffet, H-2 box, H-3 agenda); perubahan sesudahnya = persetujuan + "UPDATE ke-n".
- **Brief otomatis** (format di `07-BRIEF-TEMPLATES.md`), pratinjau → kirim lewat Hermes ke grup → log + tanda "Siap 👍" per orang.
- **Tracking status** per order/kloter: `dimasak` → `packing` → `siap` → `berangkat` → `tiba`/`diambil` → `dokumen_diterima`; masing-masing oleh peran yang benar dari HP.
- **Bukti kirim**: foto + jam + lokasi + nama penerima (suara opsional), antrian offline.
- **Operasional Hari Ini** (owner/admin): semua order hari ini & besok, status, peringatan (tanpa captain, bentrok, belum konfirmasi, telat berangkat).
- **Ringkasan WA owner**: malam (rencana besok + yang belum siap), pagi (keberangkatan), sore (rekap).

## H. Purchasing, Gudang & Stock Opname — [BARU] (detail `09-PURCHASING-GUDANG.md`)

## I. Rekap & Laporan — [UPGRADE dari laporan margin/penjualan/piutang]

- Rekap event: (1) peralatan dipakai/kembali/rusak/hilang, sewaan vs milik sendiri; (2) bahan baku rencana vs real (belanja, pemakaian, sisa); honor tim & DW; biaya event; untung event. Alur: diajukan → disetujui → dikunci (buka kembali hanya super admin).
- Laporan: omzet & untung bulanan, menu/paket terlaris, paket paling sering diubah, ketepatan waktu kirim, piutang, komisi rekanan, hutang dagang, selisih opname.
- Laporan mingguan otomatis ke owner (WA).

## J. Karyawan — [BARU, fase akhir]

Absen dari HP (bisa dari check-in hari-H), jadwal kerja, profil, honor per event (karyawan vs freelance), DW sementara (akses kedaluwarsa setelah acara).

## K. Halaman Tim (PWA) & Layar Dapur — [BARU] (detail `08-TIM-PWA-LAYAR-DAPUR.md`)

## L. Hermes & Wiki Tiska — [BARU] (detail `10-HERMES-WIKI.md`)

## M. Pengaturan, Onboarding, Audit

- Pengaturan: overhead %, target food cost %, batas untung, tarif pajak, layanan perlengkapan per zona, delivery fee per zona, termin default, batas perubahan, tarif staf, tabel sewa/lost & breakable, template S&K per jenis layanan, rekening, penandatangan.
- **Onboarding per peran**: tur singkat, wizard pengisian data (Accounting: tarif & pajak; Kepala Dapur: resep; Gudang: stok & alat — wizard *Hitung Awal Peralatan*; Sales: pricelist), checklist "data yang perlu dilengkapi" per orang. Panduan per peran gaya `Panduan-Gudang-Purchasing` Mahakan (HTML/PDF santai + video 30 detik).
- Audit log untuk aksi sensitif (harga, persetujuan, pembayaran, kunci/buka rekap, ubah stok).
