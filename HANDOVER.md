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
- 🔧 Utang desain warisan: form lama masih memakai `<select>` bawaan untuk customer, katalog product, penandatangan, dan ukuran cetak → ganti PilihCari.

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
