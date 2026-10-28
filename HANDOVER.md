# HANDOVER — Tiska Ops

Diperbarui: 14 Okt 2026 (sesi perancangan di claude.ai, belum ada kode yang diubah).

## Status
- ✅ Perancangan konsep selesai; proposal 24 halaman untuk atasan (`lampiran/lainnya/Proposal Konsep Tiska Ops.pdf`).
- ✅ Jawaban tim (Pak Reza, Mbak Ariz) bagian A–E sudah masuk `docs/02-ATURAN-BISNIS.md`.
- ✅ Data Excel & PDF diekstrak ke `data/`.
- ✅ Demo Layar Dapur (`lampiran/lainnya/demo-layar-dapur.html`).
- ⏳ Persetujuan konsep dari atasan.
- ⏳ Pertanyaan terbuka: `docs/13-PERTANYAAN-TERBUKA.md` (paling mendesak: #8 harga box termasuk PBJT?, #6 pembulatan, #1 pricelist 02 versi mana).
- ❌ Belum ada perubahan di repo `cateringtiska/Aplikasi-Penjualan-TC`.

## Update 14 Okt 2026 (sesi Claude Code pertama)
- ✅ Paket kickoff + lampiran diamankan di repo private `ramaactivity/tiska-ops-arsip` (D-021). Lokal: `~/Proyek/TISKA OPS/tiska-ops-arsip`.
- ✅ 18 PDF pricelist lengkap + 2 versi "02" di `lampiran/pdf-pricelist/` (#18 nama baru "Wedding Bogor & ATF").
- ✅ PBJT: selalu kena + saklar nonaktif di builder (D-022, Pak Reza).
- ✅ Dokumen baru: invoice SEELINDO (box kena PB1, layanan 20% dari stall) → `02-ATURAN-BISNIS.md`, `13` #8/#9a.
- ✅ Istilah komisi rekanan → **Partner Fee** (D-020).
- ✅ **D-023: Tiska Ops dibangun di repo baru**, repo lama `cateringtiska/Aplikasi-Penjualan-TC` tidak disentuh (tetap dipakai owner & sales). Fase 0.1/0.2 di `04-ROADMAP.md` perlu disesuaikan: clone repo lama hanya untuk dibaca/disalin.

- ✅ **Repo baru `ramaactivity/tiska-ops` (private)** berisi salinan `web/` dari aplikasi lama (commit b727d21) + dokumen (D-024).
  Kondisi awal: `tsc` 0 error, eslint bersih, vitest **276/276 lulus**, `next build` hijau. (Uji alur `npm run uji:alur` butuh DB — belum dijalankan.)
  Sebelum `tsc`: jalankan `npx prisma generate` dan `npx next typegen` (tipe PageProps/LayoutProps dibuat oleh Next).
- ✅ Supabase baru (catering.tiska@gmail.com, ref `wbqjduapfdlontbwmprr`) — kunci sudah dirapikan di `web/.env` (tidak di-commit).
  ✅ DB baru siap: 27 tabel (`prisma db push`), RLS + REVOKE anon di semua tabel, 9 CHECK warisan Laravel + role + kategori biaya, izin peran default (`siapkan-db-baru.mjs` dkk., lihat `deploy.md`).
  ✅ `npm run uji:alur`: **133/144 lulus**. 11 gagal karena DB masih kosong (belum ada user, invoice, penandatangan) — bukan kerusakan. `nilai-lama-tetap` baru bermakna setelah data lama dipindah.
  Diperbaiki: `vitest.alur.config.mts` memakai `fileURLToPath` (path folder berspasi "TISKA OPS" membuat alias `@`/`server-only` rusak).
- ✅ Logo resmi (®) di `web/public/brand/`; semua logo + sponsorship di repo arsip.
- ✅ **Live: https://tiska-ops.vercel.app** (project Vercel `tiska-ops`, team Tiska, region sin1). Deploy pertama manual via CLI dari `git archive`; login admin `rama` dites lewat Chrome (desktop 1440 & HP 390, tanpa overflow).
  Akun admin `rama` dibuat; sandi di `~/Proyek/TISKA OPS/AKUN-ADMIN-TISKA-OPS.txt` (lokal, hapus setelah Rama ganti sandi).
- ✅ Bucket storage `perusahaan` (publik, logo) & `tanda-tangan` (tertutup).
- ✅ Deploy otomatis jalan: push `main` → test + lint → Vercel CLI (run 38549831556 hijau, alias tiska-ops.vercel.app). Secret `VERCEL_TOKEN` & `SUPABASE_DB_URL` dipasang Rama; `jaga-supabase-aktif` hijau (ping harian 09.00 WIB).
- ℹ️ Aplikasi masih bernama "Penjualan TC" di UI — ganti ke Tiska Ops + logo resmi di milestone UI berikutnya.
- ℹ️ Project lama `penjualan-tc` memakai region iad1 (AS) padahal DB di Singapore → lambat; tidak diubah (repo/project lama tidak disentuh).
- ℹ️ Backup DB aplikasi lama (0.1) tidak dijalankan: kita tidak punya kredensialnya dan repo/DB lama tidak disentuh. Dibutuhkan nanti saat migrasi data.

## Fase 0.3 selesai (14 Okt 2026)
- ✅ 13 peran (D-025): owner (= admin), direksi, finance (Finance & Accounting), sales, bizdev, cost, kepala_dapur, dapur, captain, driver, gudang, field. DB `users_role_check` dilebarkan (`tambah-peran-tiska.mjs`).
- ✅ Gerbang angka rahasia satu tempat: `bolehLihatBiaya` / `bolehKelolaUang` di `lib/peran.ts` — semua halaman margin, invoice, dan unduhan Excel memakainya.
- ✅ **Kebocoran ditutup**: peran tanpa menu dulu jatuh ke Dashboard (omzet & piutang). Sekarang ke `/beranda` tanpa angka. Diuji lewat browser: captain buka /dasbor, /tagihan, /laporan/margin → dialihkan; /laporan/margin/excel → 403.
- ✅ Angka bisnis di `lib/pengaturan-bisnis.ts` + tabel `business_settings` (D-026). Halaman ubah angka menyusul di Fase 2.
- ✅ Nama Tiska Ops + logo resmi (D-027). 288 unit test, tsc, eslint, build hijau.
- ✅ Semua akun memakai sandi default yang ditentukan Rama (tidak ditulis di repo; tanyakan ke Rama), termasuk `rama`.
- ⏳ Tes kebocoran payload per peran untuk kolom HPP baru → dibuat bersama tabel HPP di Fase 1.2 (belum ada kolom HPP sekarang).

## Fase 1.1 berjalan (14 Okt 2026)
- ✅ Resep diekstrak ulang: 610 resep / 6.231 baris (dulu 588 / 5.999), total per resep = Excel & Daftar Menu 610/610.
- ✅ Tabel ingredients / ingredient_prices / recipes / recipe_lines dibuat (RLS, `tambah-tabel-resep.mjs`, D-029).
- ✅ Impor `--apply` dijalankan (Rama "jalankan"): DB berisi 982 bahan, 834 harga, 610 resep, 6.205 baris; biaya resep di DB = Excel 607/610.
  3 selisih menunggu jawaban Mbak Sarinah/Pak Reza: Tahu Baso Ayam Mt-064 (resep 2.500 vs daftar 2.200 → MC1-002 & MC1-029), Es Pisang MC2-029
  (satuan sisir vs biji; HPP sekarang Rp11.498/porsi, salah), "Bumbu Gulai (Jadi)" IMP-001 20.000 vs Spc-130 30.000, `Spc-107` bahan apa.
- ✅ `lib/hitung/hpp.ts` `hitungHpp()` (Fase 1.2 inti) + tes acuan Ayam Kodok 4.882,42 / Tumis Kacang Panjang 3.053,70.
- ✅ `lib/harga-bahan.ts` `hargaBahanTerkini(sesi)` — satu-satunya pembaca harga bahan, menolak sendiri bila peran tidak boleh melihat biaya.
- ✅ Halaman `/resep` (cari, filter Perlu dicek/Standar/Perkiraan/Belum ada, HPP & saran harga untuk owner/finance), `/resep/[id]` (takaran per resep & per porsi),
  `/bahan` (cari, filter status & kategori, antrian diurut dari yang paling banyak dipakai resep). Menu "Dapur & Bahan": resep → finance, kepala_dapur, dapur; bahan → finance, kepala_dapur, gudang.
  Diuji lewat browser + respons mentah server: akun dapur & gudang sementara TIDAK menerima angka harga (kontrol positif: halaman admin terdeteksi berharga). Akun uji sudah dihapus.
- ✅ `/bahan/[id]`: ubah data & konversi (finance/kepala_dapur/gudang), catat harga + riwayat (owner/finance), daftar resep pemakai (D-030).
  `/resep/[id]`: status Standar/Perkiraan/Belum ada + porsi + catatan oleh kepala_dapur/owner. Diuji di browser dengan data & akun sementara
  (HPP 1.040 → 520 setelah konversi diubah; gudang tanpa harga; kepala dapur simpan resep) lalu dihapus — DB kembali 982/834/610/6.205.
- ✅ Editor isi resep (`/resep/[id]` → "Ubah isi resep", kepala_dapur & owner) + halaman `/angka-bisnis` (owner/finance) — D-031.
  Diuji satu putaran di browser (data & akun sementara, sudah dihapus): overhead 30→40% membuat HPP Ayam Kodok 4.882 → 5.258 lalu kembali;
  isi 150% ditolak; kepala dapur ganti bahan pengganti, ubah takaran 2,5, hapus & tambah baris (pencarian tidak menawarkan pengganti);
  kepala dapur & sales ditolak dari angka-bisnis, finance boleh; tanpa harga di HTML kepala dapur; HP 390px tanpa overflow.
- ⏳ **Fase 1.3 Menu & Paket** (D-032): tabel dibuat (`tambah-tabel-paket.mjs`), halaman `/paket` & `/paket/[id]` siap.
  Impor `scripts/impor-paket.mjs` DRY-RUN: 44 paket BS/PR, 332 isi, 186 menu (68 terhubung resep), HPP 44/44 = file, BS-15 = 27.099,33.
  ✅ `--apply` dijalankan (Rama "jalankan"): 10 bentuk, 186 menu, 44 paket, 332 isi; HPP di DB = file 44/44. Untung: 40 aman, 4 mepet (PR-12 31,6%, BS-22 32,5%, PR-08 33,6%, BS-13 33,8%).
  ✅ Diuji di browser: admin BS-15 HPP 27.099 / untung 44,1% Aman; sales melihat harga jual tanpa HPP/untung di HTML mentah (kontrol positif di admin);
  kepala dapur ditolak; pencarian isi menu cocok dengan DB; HP 390px tanpa overflow. Akun uji dihapus.
  ⏳ Premium Nusantara/International Taste menunggu konfirmasi sheet yang berlaku (Mbak Ariz). PR-12 78.500 vs 88.500 menunggu konfirmasi.
- ⏳ **Menu ↔ resep + ubah paket** (D-033) — kode selesai & lolos tes browser (paket/menu/akun uji sudah dihapus), **commit lokal BELUM di-push**:
  dengan tautan hasil impor apa adanya, 2 paket tampak < 30% & 8 mepet karena 16 menu porsinya beda dari resep (bukan harga naik).
  ✅ `rapikan-tautan-menu.mjs --apply` (15 Okt): 16 tautan dilepas (catatan saran faktor di tiap menu), 52 tetap. Pita untung: 38–39 aman, 5–6 mepet, 0 di bawah 30%.
- ✅ **Fase 1.4a Pustaka Pricelist** (D-035, 16 Okt): 18 pricelist + 19 berkas diunggah (`impor-pricelist.mjs`), `/pricelist` & `/pricelist/[id]`
  (Kirim WA / Salin link / Buka + log, unggah versi baru, status & catatan, riwayat versi & kirim), link publik `/pl/<slug>`.
  Diuji: klien tanpa login dapat PDF ringan 1,77 MB (wedding) / asli 16,9 MB; arsip → 410; sales HP salin & WA tercatat; unggah versi 2 pricelist
  uji → /pl langsung membuka versi baru; arsipkan → 410; finance tanpa unggah; kepala dapur ditolak (halaman & berkas internal 403). Data uji dihapus.
- ⏸ Fase 1.4b (harga per item pricelist) ditunda — dikerjakan bersama Builder (D-036).
- ✅ **Fase 2.1 mesin hitung quotation** (D-036): perluasan `hitungTotalDokumen` + `lib/hitung/quotation.ts`; 4 dokumen asli cocok persis.
- ✅ **Fase 2.2a Builder tahap 1** (D-037): tambah dari paket, tombol zona + minimum layanan, usulan pembulatan, istilah resmi, data perusahaan.
  Diuji di browser: BS-15 40 box + buffet 60 pax → layanan min 1.500.000, PBJT 725.000, pembulatan −75.000, TOTAL 9.400.000 di detail & cetak & DB;
  data uji dihapus (nomor pertama tetap QUO-2026-0001).
- ✅ **Fase 2.2b-1 penanda untung + persetujuan owner** (D-038, 16 Okt): panel untung makanan di detail quotation (owner/finance),
  tombol "Setujui harga ini" (owner), banner tanpa angka untuk sales, pill "Menunggu owner" di daftar; PBJT default aktif di quotation/invoice baru.
  Diuji di browser (akun & data sementara, sudah dihapus): sales BS-15 40 box @38.000 → 28,2% (HPP resep 1.091.695) → banner sales, owner setujui
  → banner hilang; turun ke 37.000 → perlu ulang; naik 48.500 → bersih. Desktop + HP 390px.
- ✅ **PPN sewa alat** (D-039, 16 Okt): centang "Sewa alat (PPN)" per baris; diuji di browser: BS-15 10 box + sewa chafing 4 × 250.000 →
  PBJT 48.500 + PPN 110.000 = 1.643.500 sama di form, detail, cetak, dan invoice hasil konversi. Excel penjualan dapat kolom PPN.
- ⚠️ Tes alur excel-dokumen / kartu-dasbor / nilai-lama-tetap butuh invoice di DB — gagal sampai data lama dipindah (bukan regresi).
- ✅ **Tukar menu kategori sama** (D-040, 16 Okt): tombol ⇄ per isi paket; HPP mengikuti menu yang disajikan. Diuji: BS-15 Ayam Kemangi →
  Ayam Bakar Madu → HPP 40 box 1.091.695 → 1.077.120 (selisih 364,4/box = HPP resep 6.794 − 6.429); balik ke menu asli → tanda tukar hilang.
  Kategori 186 menu diisi otomatis dari nama — **minta kepala dapur cek di /menu** (filter per kategori).
- ✅ **Sesi per hari** (D-041, 16 Okt): "+ Sesi" per baris (tanggal acara, jenis, jam); tampil di detail/cetak/dapur/Excel/invoice.
  Diuji: 2 hari, Lunch Sel 20 Okt 11.00–13.00 + Dinner Rab 21 Okt — sama di semua permukaan & setelah dikonversi ke invoice.
  Bug Excel "[object Object]" untuk isi paket ikut dibetulkan.
- ✅ **Fase 2.2 Quotation Builder selesai** (kecuali revisi berversi, PDF server, persetujuan klien, pemeriksaan otomatis — Fase 2.3+).
- ✅ **Fase 2.3 Revisi & penomoran** (D-042, 16 Okt): nomor baru QUO/TC/2610/001 & INV/TC/2610/001; ubah quotation terkirim → revisi -R2
  + riwayat & perbandingan. Diuji: QUO/TC/2610/001 → kirim → ubah qty 40→50 + tukar Ayam Kemangi→Ayam Crispy → QUO/TC/2610/001-R2 (draft),
  riwayat menampilkan perubahan & total 2.134.000 → 2.667.500; invoice pertama INV/TC/2610/001.
- ✅ **S&K per jenis pesanan + cetak terbaca** (D-043, 16 Okt): tombol "Isi S&K standar" di form quotation, halaman /syarat (owner/admin),
  cetak tidak lagi mengecil ke 50%, nama berkas PDF QUO-TC-2610-002. Diuji: box saja → 9 bagian (I Nasi Box … IX Refund), box+buffet → 10.
  ⚠️ **Naskah S&K masih versi lama apa adanya — perlu dirapikan owner di /syarat**: (1) VI.6 (pembayaran tidak dikembalikan) bertentangan dengan
  X (refund 100%/70%/50%); (2) III.2/III.3/III.10 bilang "sudah termasuk PB1 / service charge / delivery" padahal ditagih terpisah;
  (3) cabang bank KCP Monginsidi vs KC Tendean; (4) poin Prokes COVID-19 (III.9); (5) istilah "Service Charge" → "Layanan Penyediaan
  Perlengkapan Buffet & Stall", "PB-1" → "PBJT"; (6) III box bilang layanan "mulai 10%", versi buffet "15%".
- ⏸ PDF render server (2.4) ditunda sampai Hermes perlu kirim berkas.
- ✅ **Persetujuan klien tercatat** (D-044, 16 Okt): dialog cara + catatan + bukti di "Tandai disetujui". Diuji di HP: WA + screenshot →
  "Disetujui customer · WhatsApp · dicatat …", bukti terbuka (PNG 59 KB) lewat tautan bertanda tangan. Detail tidak melebar lagi di HP.
- ✅ **Kwitansi digital** (D-045, 16 Okt): /pembayaran/[id]/kwitansi — terbilang, materai > Rp5 jt, nomor KWT/TC/2610/001 tetap.
  Diuji: payment 5.880.000 + PPh 23 120.000 → "Enam Juta Rupiah", kotak materai, sales ditolak.
- ✅ **Termin & sisa tagihan** (D-046, 16 Okt): kartu termin di detail invoice + riwayat bayar & sisa di cetakan. Diuji: invoice 14,8 jt,
  dibayar 6 jt, acara 20 Des → Booking 5 jt Lunas · DP 2,4 jt (20 Nov) Sebagian · Pelunasan 7,4 jt (6 Des) Menunggu; cetak "SISA TAGIHAN Rp 8.800.000".
- ⏳ 2.5 sisa: link tanda tangan klien di HP, nota, BAST, refund pembatalan (butuh contoh dokumen dari tim — 06-DOKUMEN-QUOTATION §7).
- ✅ **Fase 2.6 CRM dasar** (D-047, 16 Okt): menu Lead — pipeline, follow-up, aktivitas, "Buat quotation" (customer + isian otomatis).
  Diuji di HP sebagai sales: lead IG → follow-up hari ini tampil → kirim pricelist tercatat → Buat quotation (CUST-0001 dibuat, isian terisi)
  → QUO tertaut & tahap Quotation → batal dengan alasan. Lebar 390px.
- ✅ **Fase 3.1 Event** (D-049, 16 Okt): Buat event dari quotation disetujui; jadwal per hari/sesi tanpa harga; batas kunci H-5/H-2 17.00;
  "Perbarui dari invoice" → UPDATE ke-n (sesudah batas hanya owner). Diuji: QUO 2 hari (Lunch/Dinner) → event; invoice direvisi 40→45 box →
  sales ditolak (lewat batas), owner → "UPDATE ke-1 sesudah batas: jumlah 40 → 45"; kepala dapur baca saja, tanpa Rp, HP 390px.
- ✅ **Brief grup tim** (D-050, 16 Okt): pratinjau "Konfirmasi New Order" + "UPDATE ke-n" di detail event, tombol Salin (tanpa harga).
- ✅ **Fase 3.2 penugasan & armada** (D-051, 16 Okt): /kendaraan, kloter + anggota (akun atau nama DW) di detail event, peringatan bentrok,
  brief "Jadwal Tim Service" + Salin. Diuji: 2 event 10 Nov, DW + Luxio di keduanya → peringatan di dua event; brief jadwal sesuai format.
  ⚠️ Perlu diisi admin: daftar kendaraan (/kendaraan) & akun tim lapangan (User → peran captain/driver/field).
- ✅ **Jadwal saya di Beranda** (D-052, 16 Okt): kartu tugas tim lapangan + 🔊 Dengarkan + Siap 👍 (captain bisa atas nama anggota).
  Diuji di HP sebagai captain: kartu besok 05.00, tanpa Rp, tandai DW siap + diri sendiri siap → ✅ di HP & di halaman event kantor.
- ✅ **PWA dasar** (D-053, 16 Okt): bisa "Tambahkan ke Layar Utama" (ikon logo resmi), halaman "Tidak ada sinyal" saat offline.
  Diuji: service worker aktif; offline → halaman tidak ada sinyal; online lagi → Coba lagi → Jadwal saya.
- ✅ **Status kirim & foto bukti** (D-054, 16 Okt): 🚐 Berangkat → ✅ Sudah sampai (kamera, foto dikecilkan) → 🏁 Selesai di Jadwal saya;
  garis waktu + foto di event kantor. Diuji di HP (lokasi diizinkan): tiga status tersimpan dengan lokasi, foto 37 KB terbuka dari kantor.
- ✅ **Layar Dapur MVP** (D-055, 16 Okt): /layar-dapur untuk TV — jam, order hari ini, jadwal angkut + hitung mundur, suara T-60/30/15.
  Diuji di 1920×1080: kloter 13.53 "24 menit lagi" tersorot, pengumuman suara sekali dengan sisa menit sebenarnya, sales ditolak.
- ✅ **Status masak** (D-056): Dimasak → Packing → Siap angkut di Layar Dapur; tercatat di garis waktu event.
- ✅ **Kebutuhan Bahan** (D-057): daftar bahan per tanggal dari event (tanpa harga) + daftar menu yang belum bisa dihitung.
  Diuji: event besok BS-15 40 box + baris manual → 28 bahan dari 3 menu tersambung (Ajinomoto 2 gr = 5 gr ÷ 100 × 40 ✓); 4 menu belum
  tersambung resep + "Kue tampah manual" tercantum. ⚠️ Baru 52 menu tersambung resep — kepala dapur perlu melengkapi di /menu supaya utuh.
- ✅ **Operasional Hari Ini** (D-058): event hari ini & besok + peringatan. Diuji: 4 peringatan tepat, sales ditolak, HP 390px.
- ⏳ Berikutnya: PR/PO & stok (3.7–3.8), honor/DW (3.9), push notifikasi, cache offline, login foto+PIN.
- ✅ Utang desain `<select>` bawaan dilunasi (D-048): PilihCari + PilihanChip di semua form; bug PilihCari "klik ulang tidak membuka" dibetulkan.
- ✅ **Sistem desain v2 tahap 1** (D-059): token indigo, Inter + JetBrains Mono, kerangka sidebar baru (bisa diciutkan → halaman melebar), PilihTanggal & PilihJam custom menggantikan semua input tanggal/jam bawaan.
- ✅ **Kartu Piutang v2** (D-060): tab "Perlu ditagih" per customer (Tagih sekarang → Menunggu jawaban → Segera jatuh tempo) + panel kanan: draf WA → wa.me (dikirim admin sendiri), telepon, janji bayar, catat bayar; riwayat di `collection_activities`. Diuji dengan 3 customer sementara (dihapus).
- ✅ **Halaman Tim** (D-061, owner/admin): kartu anggota per bagian + status tugas hari ini dari kloter; tab Jadwal hari ini per kloter (termasuk DW tanpa akun).
- ⚠️ Akun **reza** sementara jadi **admin** (akses semua) untuk uji menyeluruh — kembalikan ke finance lewat menu User setelah selesai.
- ✅ **Tabel daftar v2 + avatar Notionists** (D-062): 6 daftar seragam, kolom bisa diurutkan, panel angka di Quotation/Invoice/Payment; avatar per orang (bisa pakai hijab) diatur di menu User.
- ✅ **Form seksi v2** (D-063): form Quotation/Invoice & Company jadi kartu per bagian + ringkasan kanan; baris rincian berlabel; bug nilai baris tanpa pax dibetulkan.
- ✅ **Penyunting S&K baru** (D-064): satu poin satu kotak, nomor otomatis, Enter = poin baru, simpan otomatis.
- ✅ **Operasional Hari Ini v2** (D-065): panel angka, tab Hari ini/Besok, Perlu tindakan, progres 6 tahap per kloter, panel persetujuan owner & jatuh tempo.
- ✅ **Dashboard, Penjualan, Margin v2** (D-066): papan penjualan bulan ini + prioritas tagih; Margin nyata vs perkiraan jadi dua tab.
- ✅ **Penyeragaman v2** (D-067): warna mentah nol, tabel & kepala halaman seragam di semua halaman + detail; bug pax di detail dibetulkan.
- ✅ **Form quotation satu halaman + isian cepat** (D-068→D-069): 6 bagian bernomor dengan navigasi menempel, saran & chip (jenis acara, venue, satuan, biaya, jam, masa berlaku), "Pakai jumlah tamu", rupiah dirapikan; cari paket di atas, porsi diminta otomatis, isi paket bisa ditukar/ditambah/ditulis sendiri, rumus terlihat.
- ✅ **Event vs Retail, Urungkan/Ulangi, upgrade/tambah/kurangi isi paket** (D-070).
- ✅ **Baris baru di atas, unduh JPG/PNG halaman cetak, Pricelist baru + ganti PDF, bukti transfer di Payment** (D-071).
- ✅ **Tombol hapus semua data tes + 10 skenario demo (DEMO-01…10, termasuk event berjalan untuk Layar Dapur)** (D-072). Data demo bisa dibuat ulang dengan skrip di `~/Proyek/TISKA OPS/panduan-tes/demo/`.
- ✅ **Impor Excel/CSV + template** untuk Customer, Product, Menu, Bahan, Paket (D-073).
- ✅ **Tambah & Ubah jelas di Menu, Resep, Paket, Bahan** (D-074).
- ✅ **Fase 3.7a Belanja (PR)** (D-075, 19 Okt): Kebutuhan Bahan → "Buat daftar belanja (PR)" → gudang ubah/tambah → Ajukan → Finance setujui + dana / kembalikan.
  Diuji di browser (akun & data sementara, sudah dihapus): event 2 Okt → 11 bahan dari resep; tambah minyak (master) + gas elpiji (manual);
  Finance kembalikan → gudang hapus minyak → ajukan → setujui Rp 500.000; perkiraan di DB 246.440 = jumlah baris; payload gudang tanpa harga; HP 390px tanpa overflow.
  ⚠️ Satuan beli beberapa bahan di master janggal (Kecap Manis Bango "Mililiter" @25.000, Maggie Ayam "Gram" @96.000, Mie Telur "Gram" @6.000) → perkiraan PR ikut janggal; gudang/kepala dapur perlu rapikan di /bahan.
- ✅ **Port fitur aplikasi lama yang menyusul** (D-079, 19 Okt): alasan wajib saat batal invoice / tolak quotation (dialog + catatan di detail), laporan penjualan cetak menjelaskan selisih.
  Diuji di browser (demo INV/TC/2610/001 & QUO/TC/2610/002, status dikembalikan sesudahnya): alasan kosong ditolak; detail "dibatalkan pada 19 Oktober 2026 oleh … — alasan"; laporan 24.416.000 + 0 + 22.500.000 = 46.916.000.
  Sisa beda dengan aplikasi lama: hanya DATA (belum dipindah).
- ✅ **Pratinjau quotation & invoice sebelum disimpan** (D-080, 19 Okt): tombol Pratinjau di form (desktop & HP) → dokumen cetak dari isian yang sedang diketik.
  Diuji: pratinjau form ubah INV/TC/2610/001 identik dengan halaman cetak; ubah hari tanpa simpan → total pratinjau ikut; HP 390px lembar diperkecil, tanpa overflow.
- ✅ **Fase 3.7b Uang Muka Belanja / Daily Market** (D-081, 19 Okt): Finance catat dana ke Pak Sur (dari PR) → Pak Sur catat belanja di HP (barang PR terisi, isi harga, foto nota) → saldo; Finance catat sisa dikembalikan / batalkan nota beralasan; PR → Realisasi + Tandai selesai.
  Diuji di browser (akun, data & foto sementara sudah dihapus): dana 300.000 dari PR → nota 11 barang (2,5 koma desimal, 2 foto) Rp 117.970 = Σ baris di DB → saldo 182.030; harga 500.000 → "Melebihi saldo", tombol mati; pengembalian 999.999 ditolak server; batal nota → saldo 300.000; HP 390px tanpa overflow.
- ✅ **Fase 3.7c PO supplier tempo + hutang dagang** (D-085, 19 Okt): menu kelompok Pembelian (PO Supplier, Supplier, Hutang Supplier). PR → PO → salin pesan WA → dipesan → terima barang (sebagian boleh, harga dikoreksi, foto surat jalan) → hutang jatuh tempo = terima + tempo → Finance bayar.
  Diuji di browser (akun, data & foto sementara sudah dihapus): supplier tempo 14 hari; PO 2 barang Rp 610.000; terima 6/10 kg ayam + 100 bakso harga dikoreksi 1.350 → Rp 423.000 = Σ baris = hutang, jatuh tempo 2 Nov; terima melebihi sisa ditolak; 2 barang PO tidak muncul lagi di belanja pasar (9/11); Finance bayar → lunas; gudang ditolak buka Hutang; HP 390px tanpa overflow.
  ⏳ Berikutnya: harga bahan otomatis dari nota/penerimaan (konversi satuan → HPP), 3.8 Gudang (stok & opname).
- ✅ **Fase 3.8a Stok bahan & packaging** (D-087, 19 Okt): menu Stok Bahan; masuk otomatis dari nota & penerimaan PO (konversi satuan hanya bila pasti, sisanya "Belum masuk stok"), pemakaian dari Kebutuhan Bahan, waste/koreksi, minimum; PR dikurangi stok + isi ulang ke minimum.
- ✅ **Fase 3.8b Stock opname bulanan** (D-088, 19 Okt): Stok → Stock opname; hitung per kategori dari HP (tersimpan per baris), selisih > 5% wajib alasan, Finance finalkan → stok disesuaikan; banner pengingat di Stok & Dashboard.
- ✅ **Fase 3.8c Peralatan** (D-089, 19 Okt): menu Peralatan (Hitung Awal per kategori, 13 alat dari tabel sewa S&K), bagian Peralatan di halaman Event (milik/sewaan, bawa keluar → kembali, rusak/hilang, peringatan kurang).
  ⚠️ Tabel harga ganti rugi (lost & breakable) belum ada di S&K → perlu diisi owner/Finance di menu Peralatan.
- ✅ **Tes browser gabungan 3.8a/b/c: 32/32 lulus** (19 Okt; akun & data sementara sudah dihapus, tabel stok/opname/alat kembali kosong):
  nota ayam 2 kg → 2.000 gr, bakso 50 Pieces → 50 Piece, "1 ekor" → Belum masuk stok → diisi 1.200 gr; waste 100 → 3.100; pemakaian 2 Okt −300 → 2.800, batalkan → 3.100;
  PR ayam & bakso "Cukup dari stok gudang"; opname ayam hitung 2.000 (selisih −800 = 28,6%) tanpa alasan ditolak → "Rusak" → final → saldo 2.000; banner opname hilang sesudah final;
  chafing milik 10 rusak 1 → event minta 12 → peringatan "tersedia 9"; kembali 1 rusak 1 hilang → milik 9 rusak 2; ganti rugi 2 × 1,5 jt = Rp 3.000.000; tenda sewaan Rp 500.000;
  kepala dapur buka Stok tapi ditolak Peralatan; halaman stok tanpa Rp; HP 390px tanpa overflow (6 halaman).
  🔧 Ditemukan & dibetulkan saat tes: baris opname yang baru diisi langsung hilang dari tab "Belum dihitung" (alasan selisih tak sempat dipilih); gudang tidak punya akses halaman Event (D-090).
  ℹ️ Bahan yang belum pernah dibeli lewat sistem akan MINUS sesudah "Catat pemakaian" — wajar sebelum opname pertama; opname pertama = stok awal yang sah.
- ✅ **Fase 3.9a Honor & DW** (D-091, 19 Okt): captain → Jadwal saya → 📝 Absen & DW (hadir, jam, + DW) → Kirim ke Finance; Finance → Honor & DW (tarif, kunci fee, tandai dibayar + bukti).
  ⚠️ Tarif honor belum ada (13-PERTANYAAN #20) → Finance isi di Honor & DW → Tarif & status kerja.
- ✅ **Fase 3.9b Rekap event** (D-092, 19 Okt): Event → Ajukan rekap → owner/Finance Buka rekap (bahan rencana vs nyata, honor, alat, untung) → Setujui & kirim biaya ke Margin → owner Kunci.
- ✅ **Fase 3.9c Ringkasan harian owner** (D-093, 19 Okt): Operasional Hari Ini → Ringkasan untuk owner (🌙 malam / ☀️ pagi / 🌇 sore) + Salin / Buka WA.
- ✅ **Tes browser gabungan 3.9a/b/c: 24/24 lulus** (19 Okt; event 23 DEMO-05 dipakai lalu dikembalikan persis — tanggal, status final, antar, tanpa kloter, invoice unpaid tanpa biaya; akun/PR/nota/tarif uji dihapus):
  tarif captain tetap 200rb, DW freelance 125rb → captain HP: Kirim terkunci sampai semua ditandai, jam "430" → 04.30, Ujang tidak hadir, + DW Dedi (Waiter), tanpa angka Rp, captain ditolak Honor;
  Finance: usulan 200.000 + 0 + 125.000 = 325.000 → kunci → dibayar (3 orang); gudang ajukan rekap, tidak bisa buka rekap; rekap honor 325rb + bahan 250rb + sewa 500rb = 1.075.000,
  untung 5.132.000 − 1.075.000 = 4.057.000 (DB invoice_margins sama; disetujui 2× tetap 3 baris otomatis); owner kunci; ringkasan malam/pagi/sore tampil; HP 390px tanpa overflow (5 halaman).
  🔧 Dibetulkan saat tes: fee 0 (tidak hadir) tidak ikut tercentang "Tandai sudah dibayar" → tertinggal selamanya; jam tampil rapi (07.30) begitu kotak ditinggalkan.
- ✅ **Harga bahan otomatis dari nota & penerimaan PO** (D-094, 20 Okt): HPP ikut harga pasar; Bahan → "Harga dari nota · 30 hari" + banner Dashboard bila berubah > 20%; nota batal → harga dihapus.
  Diuji di browser (akun & data sementara dihapus): ayam 2 kg @60.000 → Rp 49 → 60/gram +22% ditandai, bakso 0%; banner Dashboard; HPP Cap Cay 322.375 → 333.375 (1.000 gr × Rp 11);
  gudang tidak melihat harga (termasuk payload); nota dibatalkan → HPP kembali 322.375; HP 390px. 🔧 PilihCari: mengetik sesudah memilih kini membuka daftar.
- ✅ **Push notifikasi HP** (D-096, 20 Okt): menu akun → Notifikasi HP (aktifkan per HP, kirim uji); PR/absen/opname/penugasan → notifikasi; cron 17.00 WIB jadwal besok, 06.00 WIB opname tgl 1–3 & hutang jatuh tempo.
  Diuji lokal dengan layanan push palsu (https, sertifikat lokal; kiriman didekripsi): 11/11 — cron tanpa rahasia 401; captain "Besok berangkat 05.30 … kamu captain"; PR diajukan → Finance (url PR); disetujui → pembuat PR; ditugaskan → "Tugas baru"; tidak salah alamat; semua ber-VAPID & TTL; halaman Notifikasi HP + HP 390px. Event 26 dikembalikan persis.
  ⚠️ Pengiriman ke HP sungguhan (layanan Google/Apple) belum bisa dites dari sini — Rama perlu mencoba "Kirim notifikasi uji" dari HP-nya.
- ✅ **Jadwal tanpa sinyal** (D-098, 20 Okt): "Jadwal saya" tersimpan di HP & tetap terbuka tanpa sinyal (juga dari ikon), banner "Tidak ada sinyal … diperbarui jam", dihapus saat keluar akun; halaman lain tidak pernah disimpan.
  Diuji pada build produksi lokal dengan server dimatikan: 9/9 (salinan tampil 05.30 + banner; "/" → jadwal; /dasbor → halaman tidak ada sinyal; hanya /beranda tersimpan; keluar akun → salinan hilang).
- ✅ **Tombol tanpa sinyal** (D-099, 20 Okt): Siap 👍 / Berangkat / Sudah sampai + foto / Selesai disimpan di HP dulu, terkirim sendiri saat ada sinyal dengan jam saat ditekan; kartu "⏳ menunggu sinyal", banner jumlah laporan tertunda.
  Diuji dev 13/13 + build produksi dengan server dimatikan 8/8 (screenshot HP 390px). Laporan tidak dobel bila terkirim ulang; kloter orang lain ditolak.
- ✅ **Notifikasi status kirim ke admin & sales** (D-100, 20 Okt): "✅ Sudah sampai 09.28 · Pak Agus — <event> kloter 1 · foto bukti di halaman event", klik → halaman event. Ke semua admin + sales pemegang event; yang menekan tidak.
  Diuji build produksi + layanan push palsu 6/6. ⚠️ Pengiriman ke HP asli butuh admin/sales mengaktifkan Notifikasi HP dulu.
- ✅ **Masuk HP tim pakai wajah + PIN** (D-101, 20 Okt): masuk sekali pakai sandi → buat PIN (Beranda "Biar masuk gampang" / menu akun → PIN masuk HP) → besok di HP itu cukup pilih wajah + tekan PIN. 5× salah dikunci 15 menit; admin ganti sandi = PIN dicabut.
  Diuji build produksi HP 390px 15/15 + desktop. ⚠️ Perlu dicoba bareng 3–5 orang lapangan asli (08-TIM §3 validasi); wajah = avatar akun, isi avatar tiap orang di menu User supaya gampang dikenali.
- ✅ **Pembatalan event & refund** (D-102, 20 Okt): Event → Batalkan event → refund otomatis menurut S&K Bag. X (Angka Bisnis) → Finance tutup (ditransfer / deposit). ⚠️ Owner perlu memutuskan S&K VI.7 vs X.
- ✅ **BAST** (D-103, 20 Okt): captain/driver → BAST — tanda tangan penerima (jalan tanpa sinyal) → kantor cetak dari halaman event.
  Diuji build produksi 31/31 (refund + BAST, desktop & HP 390).
- ✅ **PO To Kitchen jadi gambar + Konfirmasi New Order format baru** (D-112, 28 Okt): halaman cetak punya tombol **Kirim ke WA** (HP) + JPG/PNG yang selalu selebar A4; brief Konfirmasi New Order mengikuti format admin terbaru (jam brkt dr Julang 👉🏻 tiba, dari kloter). Teks brief ada di halaman Event → Brief.
- ✅ **Avatar sesuai jenis kelamin** (D-111, 28 Okt): kolom Jenis kelamin di form & impor User, pemilih avatar tersaring, 21 akun dapat wajah sesuai pekerjaan. ⏳ Jilbab/tidak untuk karyawan perempuan masih tebakan — koreksi lewat menu User.
- ✅ **Login tidak lagi habis tiap hari** (D-110, 28 Okt): sesi 7 hari diperpanjang otomatis selama dipakai (proxy.ts).
- ✅ **Ulang tahun karyawan** (D-109, 28 Okt): menu Karyawan → Ulang Tahun (25 orang dari daftar atasan), kolom ulang tahun di form User, pengingat HP 06.00 H-1 & hari H ke owner/admin, kartu Dashboard.
  28 Okt (Rama): Nanang Supriyadi = Pak Nung, Slamet Suryadi = Pak Sur, Tya = Septiana Rahmadani (23 Sep 2006); tahun lahir Ariz 1984, Reza 1983, Ramadan 1998, Rita 1976. **12 akun baru** untuk karyawan di daftar yang belum punya akun (titiek, nia, dwi, kustinah, daud, kasni, sulistiyowati, maryamto, suparni, vikri, agus, tukinem; sandi awal bawaan, wajib ganti). Peran (Rama 28 Okt): Ibu Titiek = owner generasi pertama (bisnis diturunkan ke Bimo & Rita) → **Direksi**; Nia, Dwi, Kustinah, Tukinem, Suparni, Sulistiyowati (Head Baker) + helper Atun (= Kasni Rohiatun) & Maryamto → **Dapur**; Daud, Agus, Vikri → **Tim Lapangan**. Sekarang 26/26 baris ulang tahun tersambung ke akun.
- ✅ **Avatar wajah Tiska** (D-108, 27 Okt): 96 wajah garis hitam-putih (6 kelompok) di menu User → Ubah data → Avatar. Akun yang belum memilih tetap wajah lama; perlu dipilihkan satu per satu.
- ✅ **Pembaruan aplikasi lama 19–21 Okt dibawa** (D-106, 27 Okt): jumlah/pax isi paket tampil, warna menu navy & isi paket hitam di 3 lembar cetak, tanggal acara di 5 daftar; + perbaikan Kartu Piutang melebar di HP. Aplikasi lama tidak berubah sejak 21 Okt.
- ✅ **Pindah data lama — wizard** (D-107, 27 Okt): Company → Pindah data lama. 5 langkah: apa yang dihapus/diambil → cocokkan akun → penandatangan → customer kembar → Coba dulu (tidak disimpan) → ketik PINDAHKAN → jalan. Satu transaksi + cadangan otomatis (bucket `cadangan`) + pembuktian jumlah & total.
  Uji coba mesin ke DB asli (mode coba, di-rollback): 38 customer (3 digabung), 12 quotation, 45 invoice Rp517.448.475, 45 payment Rp478.941.301 = DB lama; DB tidak berubah.
  ⚠️ Belum dijalankan sungguhan (tim masih uji coba). ⚠️ Belum dites klik di browser: membuat akun admin sementara diblok pengaman — Rama coba sendiri sampai tombol "Coba dulu". 37 dari 45 invoice lama tanpa quotation → tidak bisa "Buat event" (event menempel ke quotation); semua acaranya sudah lewat kecuali yang tercantum di layar hasil.
  ℹ️ Akun lama "Tiya" (cost) tidak punya pasangan di Tiska Ops (yang ada "Tya" gudang) → wizard menawarkan pilih/kosongkan.
- ✅ **Impor user dari Excel/CSV** (D-105, 27 Okt): menu User → Impor Excel / CSV; sandi awal diketik di halaman impor (tidak di berkas), wajib ganti saat masuk; Admin/Owner tidak bisa diimpor.
- ✅ **Peta Alur** (D-104, 20 Okt): menu Panduan → Peta Alur — flowchart kanvas 24 langkah, sorot per alur, klik kartu → penjelasan + Buka menunya. Perbarui `lib/peta-alur.ts` bila alur berubah.
- ✅ **Siap uji coba seluruh tim** (20 Okt): 9 akun tim dibuat (sarinah · yoga, sukir, asep · nung, mul, agil · tya, sur; sandi awal bawaan, wajib ganti saat masuk — sandi tidak ditulis di repo). **Panduan & Daftar Tes v2** (44 hlm, per peran, 13 skenario, data yang perlu diisi dengan angka DB per 20 Okt) di `~/Proyek/TISKA OPS/panduan-tes/Panduan-Tes-Tiska-Ops-v2.pdf` (sumber `panduan.html`; v1 di `arsip-v1/`).
  ⚠️ Selama uji coba `rama`, `reza`, `rahma` = **admin** (Rama 20 Okt: akses semua halaman). Notifikasi khusus Finance & sales pemegang event tidak sampai ke mereka. Setelah uji coba: reza → finance, rahma → sales (tercantum di PDF).
  ⏳ Berikutnya: 3.7b Daily Market (uang muka Pak Sur + belanja + foto nota, saldo tidak boleh minus), 3.7c PO tempo & hutang dagang.
- ✅ **Jadwal persiapan dapur otomatis (Operasional), Delivery Order per kloter, menu Pengiriman retail** (D-076–D-078).
- ✅ **Paket pilihan per kategori: 404 paket buffet/coffee break/wedding/stall dari pricelist 2026 + pemilih menu di quotation** (D-082). Perlu konfirmasi Rama: tafsiran di daftar ragu (D-082), harga nett FV/WD vs PBJT.
- ✅ **Peringatan harga nett + tombol matikan PBJT/layanan; penyunting kategori paket di layar** (D-083, D-084). Keputusan sementara daftar ragu pricelist dicatat di D-083 — tunggu koreksi Rama.
- ✅ **HPP paket pilihan dari menu yang dipilih + 273 pilihan disambungkan ke menu lewat resep** (D-086). Sesi paralel tiska-ops-ca mengerjakan Fase 3.8 Gudang (D-087+); koordinasi lewat SendMessage.
- ✅ **Kebutuhan Bahan & PR memahami isi paket pilihan buffet** (D-095).
- ✅ **Layar Dapur per dapur (masak / pastry & bersih)** (D-097). Perlu: kepala dapur mengisi kolom "Dapur" tiap menu (sementara ditebak dari kategori).
- ⏳ Desain v2 berikutnya: sisa yang belum sesuai referensi: tampilan HP tim lapangan (Beranda/Jadwal saya) & Layar Dapur dibiarkan (dirancang khusus pengguna 50+ / TV).

## Backlog wajib sebelum tim memakai aplikasi
- ✅ Wizard login pertama (D-034) — selesai 15 Okt.
- ✅ Akun uji: reza (finance), rahma (sales), bimo (owner), rita (owner), sandi default + wajib ganti saat login pertama.

## Langkah berikutnya (rencana awal)
**Fase 1.1 — Bahan & resep** (`docs/04-ROADMAP.md`): tabel ingredients/prices/recipes, skrip impor DRY-RUN dari `data/bahan.csv` & `data/resep.csv`
(ingat: menu dikenali dari KODE — "Tumis Kacang Panjang" ada dua; pembulatan HPP Ayam Kodok 4.882,41 vs 4.882,42 perlu diputuskan).

## Langkah Fase 0 (arsip)
1. **0.1 Audit & backup**: clone repo, baca `web/` (CLAUDE.md, AGENTS.md, schema, lib, scripts, workflow), tanya Rama akun
   GitHub/Vercel/Supabase yang dipakai → tulis `deploy.md` & `accounts.md`, jalankan backup, laporkan kondisi (tes, build).
2. **0.2 Rapikan repo**: rencana memindah Laravel lama (tanya dulu), taruh paket dokumen ini, cek workflow deploy.
3. **0.3 Fondasi peran & pengaturan**.

## Catatan untuk sesi berikutnya
- Repo basis & referensi publik → ingatkan Rama menjadikan private.
- Lampiran besar (PDF pricelist 81 MB) jangan di-commit; simpan di penyimpanan privat, catat lokasinya di sini.
- Brief WA asli & aturan format: `docs/07-BRIEF-TEMPLATES.md` — generator wajib dites terhadap contoh asli.
