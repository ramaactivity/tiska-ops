# Tiska Ops — Konteks Lengkap (baca ini dulu)

> Dokumen induk. Merangkum SELURUH diskusi perancangan Tiska Ops (14 Okt 2026) antara Rama dan Claude:
> latar belakang, temuan, keputusan, aturan bisnis, rancangan modul, dan hal yang masih terbuka.
> Sesi Claude Code berikutnya harus bisa melanjutkan pekerjaan **hanya dari folder ini** tanpa kehilangan konteks.
> Dokumen lain di `docs/` adalah pendalaman per topik; kalau ada yang bertentangan, yang lebih spesifik
> (mis. `02-ATURAN-BISNIS.md`) menang, lalu catat koreksinya di `DECISIONS.md`.

---

## 0. Cara kerja dengan Rama (WAJIB, ringkasan dari `lampiran/lainnya/PROFIL-RAMA.md`)

- Rama = vibecoder **non-teknis**, Business Development di Tiska Catering. Bahasa Indonesia santai (lu/gua),
  kalimat utuh, tanpa jargon; istilah teknis dijelaskan sekali dengan bahasa awam.
- Pisahkan **"yang udah gua kerjain"** vs **"yang perlu lu kerjain"**; langkah manual: situs → halaman → tombol.
- 1–2 milestone per sesi. Laporan pakai ✅ / ⏳ / ❌. Kegagalan disebut terang-terangan.
- **Terima beres**: Claude yang jalankan terminal, install, migrasi, commit, push, deploy. Commit + push + deploy
  setelah terverifikasi = izin tetap. Tetap tanya untuk: migrasi destruktif, `push --force`, `reset --hard`,
  dan **mengirim pesan ke klien/orang luar**.
- Skrip pengubah data: default **DRY-RUN** → tunjukkan rencana → Rama bilang "jalankan" → `--apply` dalam 1 transaksi.
- Jangan pernah suruh Rama copy-paste SQL ke dashboard. Migrasi dijalankan sendiri (pola `admin_exec_sql` / skrip).
- Git: **jangan `git add -A`/`.`**; stage file sendiri satu per satu; sering ada sesi paralel.
- Sebelum bilang beres: `tsc --noEmit` + lint (file sendiri) + `next build` + test; verifikasi lewat jalur asli
  (halaman beneran, screenshot desktop + mobile).
- UI: bersih, modern, lembut, **sans-serif**, tombol pill, kartu rounded-2xl bayangan lembut, aksen pastel.
  **Tanpa kontrol native browser** (`confirm/alert`, `<select>` native, `<textarea>` polos). Uang: angka tabular, rupiah tanpa desimal.
- **Rahasia bisnis**: crew/staf tidak pernah melihat HPP, harga beli, margin. Strip di server/DB, bukan cuma UI.
- Tulisan ke klien: gaya admin manusia (kalimat pendek, "Kak" secukupnya, emoji maks 1, maks 2 pertanyaan/pesan),
  tanpa frasa gaya AI. **Jangan kirim apa pun ke klien tanpa izin.**
- Deploy standar: push → GitHub Actions → Vercel CLI (`VERCEL_TOKEN`), `rm -rf .git` sebelum `vercel deploy --prod`.
  PUSH ≠ DEPLOY untuk VPS (Hermes) — VPS punya skrip deploy sendiri.

---

## 1. Latar belakang

- **Tiska Catering** (PT. Tiska Cipta Imaji), Bogor, sejak 1980, 3 generasi. Dapur pusat: Jl. Julang I No. 3,
  Tanah Sareal, Kota Bogor. Melayani Jabodetabek. 350+ acara/tahun, 8.000+ pesanan/bulan (mayoritas box), 800+ menu.
  Halal & HACCP. Website: tiskacatering.com (Next + Supabase, project terpisah).
- 11 bentuk layanan: Wedding, Private Event & Party, Corporate & Institusi, Snack & Lunch Box, Hampers,
  Buffet & Banquet, Foodstall, Everyday Meal Catering, Fine Dining (set menu/plated), Tumpeng, Tampah.
- Atasan meminta Rama membangun **sistem end-to-end (ERP + CRM) + AI agent "Hermes" + Obsidian + LLM wiki**.
- **Tujuan utama** (disepakati): posisi **Operational kosong** (orangnya resign, sementara dipegang owner).
  Sistem harus **mengambil alih sebagian besar kerja koordinasi operasional** (brief, jadwal, pengingat, pemantauan)
  sehingga owner cukup memantau dan memutuskan.
- Fitur paling prioritas menurut atasan: **quotation** (klien hampir selalu minta custom + revisi), lalu invoice,
  nota, kwitansi, BAST; manajemen paket–menu–resep–bahan–HPP; rekap real event; inventory; assign tim;
  brief ke grup WA; Hermes yang canggih (jawab klien, analisa, tracking).

## 2. Struktur organisasi (nama asli)

| Bagian | Orang |
|---|---|
| Direksi | Keluarga besar owner (nama belum diketahui) — cukup laporan ringkas |
| Owner | **Pak Bimo Haryo Dewanto**, **Ibu Rita Ariyani** ("Mbak Rita"; mungkin juga disebut "Mbak Ari") |
| Finance & Accounting | **Pak Reza Devyan** |
| Sales & Marketing | **Mbak Ariz Rakhma** (juga admin; tampil sebagai "Tiska Catering (Rakhma)" / "Admin Tiska") |
| Business Development | **Ramadan Saputra (Rama)** — pembangun sistem |
| Operational | **Kosong** → dipegang owner; sistem diharapkan mengisi peran ini |
| Kepala Dapur | **Mbak Sarinah**. Dua dapur: **Dapur Masak** dan **Dapur Pastry/Bersih**; masing-masing juru masak + cook helper. Head Baker (website): Sulistiyowati |
| Captain | **Pak Yoga, Pak Sukir, Pak Asep** (+ anggota karyawan tetap; DW/freelance untuk acara besar) |
| Driver | **Pak Nung, Pak Mul, Pak Agil**. Armada terlihat: Luxio, Grand Max (daftar lengkap belum ada) |
| Gudang & Purchasing | **Tya** (opname bulanan), **Pak Sur** (belanja per event) |
| Admin | 2 admin. Nomor WA Admin Utama: **0813-8310-8103** |

## 3. Kondisi saat ini & temuan (dari file yang dikirim — detail di `11-SUMBER-DATA.md`)

1. **File HPP & resep (`HPP Makanan - BOM.xlsx`)**: 977 bahan berkode (8 kategori: Groceries 299, Packaging 155,
   Spices 132, Vegetable & Fruit 121, Meat 111, Pastry 90, Non Halal 54, Retail 15), 610 resep (Main Course 1: 547,
   Main Course 2: 63; mayoritas per 100 porsi). **HPP per porsi error `#REF!`** karena parameter overhead terhapus;
   sheet Daftar Menu & Pricelist ikut kosong. 145 bahan "Lengkapi harga/konversi", 20 "Cek konversi".
   Sheet Pembelian kosong. Baru 15/610 menu punya harga jual. "HPP Lama" = bahan × 1,3 (terverifikasi).
2. **Paket box**: 3 generasi harga (v2: BS 37.500/47.500/57.500 & PR 65.000/75.000; 2025: BS-01..28;
   terbaru: BS-01..24 @38.500/48.500, PR-01..20 @58.500/68.500/78.500/88.500). PR-12 di judul 78.500 tapi
   harga jual 88.500. **PR-23 & PR-24 dipakai di lapangan tapi tidak ada di file mana pun.** Premium Lunch Box:
   Premium Nusantara @100.000/115.000; International Taste @130.000–140.000. Untung paket 32–59% dari harga jual.
   **HPP paket box sudah memasukkan box & alat makan (Rp5.805–6.705)** padahal paket yang sama dipakai untuk buffet.
3. **18 pricelist PDF** (nomor 01–18). Dua file bernama sama "02. Menu Bogor 2026" isinya beda
   (Buffet Indonesian **125.000 vs 115.000**). Satu menu punya 3–4 harga antar pricelist (Bakwan Malang 37.500/
   35.000/29.500; Pempek 50.000/48.500/40.000; Salmon Mentai 50.000/50.000/55.000/70.000; Potato & Ribs
   225.000/150.000/200.000; Kambing Guling 3,5 jt/3 jt). Basis harga beda: **nett** (wedding, venue rekanan)
   vs **++** (menu reguler). Beberapa PDF 9–22 MB (berat untuk WA). Artisan Holiday Hampers masih versi 2025.
4. **Quotation/invoice manual** (Excel): format nomor beragam (`06/QUO-TC/10/26-rev 2`, `024/QUO-TC/VIII/26`); quotation box DIVAS tanpa baris PBJT (harga box mungkin sudah termasuk pajak — konfirmasi); sub-item item II bernomor I.x; label "Sub Total (I–V)" padahal item I–IV; S&K bilang "sudah termasuk
   PB1 & service" padahal ditambahkan terpisah. Kwitansi masih buku tulis.
5. **Aplikasi Penjualan TC sudah ada & dipakai owner + sales** (repo `cateringtiska/Aplikasi-Penjualan-TC`,
   folder `web/`, Next 16 + Prisma + Supabase) untuk klien nyata (Telkom, CIFOR). Detail di `12-REPO-REFERENSI.md`.
   Diputuskan: **Tiska Ops = upgrade + penyatuan dari aplikasi ini**, bukan mulai dari nol.
6. **Brief ke grup WA** (Kitchen & Captain) diketik manual; update berantai; harga di screenshot quotation
   dicoret manual; banyak pesan dihapus; driver konfirmasi kirim dengan foto di grup. Contoh lengkap di `07-BRIEF-TEMPLATES.md`.

## 4. Keputusan kunci (detail + alasan di `DECISIONS.md`)

- D-001 Tiska Ops dibangun di atas **Aplikasi Penjualan TC** (`web/`), Laravel lama diarsipkan.
- D-002 Stack: Next.js 16 + React 19 + TS + Tailwind v4 + shadcn + Supabase (Postgres) — Prisma sudah dipakai di repo, lanjutkan.
- D-003 Web app di **Vercel**; **VPS** untuk Hermes, worker WA, cron, backup harian ke R2. Vercel Hobby hanya non-komersial → Pro saat produksi.
- D-004 Database ERP **terpisah** dari Supabase website.
- D-005 Prinsip **satu data satu tempat**; angka hanya dari DB (wiki hanya pengetahuan naratif).
- D-006 HPP/harga beli/margin hanya Owner & Accounting — **dikunci di DB** (tabel owner-only + view aman untuk lainnya).
- D-007 Format nomor dokumen baru `QUO/TC/2610/006-R2` (jenis/TC/YYMM/urut bulanan/revisi). Nomor lama tidak diubah.
- D-008 Struktur 3 lapis: **Master Menu → Master Paket → Pricelist (berversi, per konteks)**. Bentuk penyajian (box/buffet/stall/plated) dipisah dari isi paket.
- D-009 WhatsApp: mulai jalur **tidak resmi (Baileys via Hermes)**; disarankan uji di nomor kedua dulu sebelum nomor Admin Utama; arsitektur siap pindah ke API resmi.
- D-010 Hermes bertahap: internal dulu → draf + persetujuan admin → otomatis bertahap. Tidak ada pesan ke klien tanpa persetujuan.
- D-011 Halaman tim = **PWA** (bukan native dulu), dirancang untuk pengguna 50+ / literasi rendah.
- D-012 Istilah "service charge" diganti **"Layanan Penyediaan Perlengkapan Buffet & Stall"**; ongkir disebut **"Delivery Fee"**.
- D-013 Penanda untung: ≥35% aman, 30–35% mepet, <30% wajib persetujuan owner.
- D-014 Repo `tetra-ops` & `mahakan-pos` (`release/phase-1`) **hanya referensi pola**, aturan mengikuti Tiska.

## 5. Aturan bisnis (ringkas — lengkap & sumbernya di `02-ATURAN-BISNIS.md`)

- **Pajak** (⚠️ cek apakah harga **box** sudah termasuk PBJT — quotation DIVAS tidak menambah PBJT): hanya **harga makanan → PBJT 10%** (dulu PB1) dan **sewa alat → PPN 11% + faktur pajak**. Tiska PKP,
  katering dikecualikan dari PPN. Layanan perlengkapan & delivery fee **tidak** kena pajak.
- **Layanan Penyediaan Perlengkapan Buffet & Stall**: hanya buffet & stall (tidak untuk box). Dasar = subtotal makanan.
  Bogor (pribadi & corporate) = max(15%, Rp1.500.000). Jakarta/Jabodetabek (pribadi & corporate) = max(21%, Rp2.500.000).
  Set menu (S&K): max(20%, Rp2 jt) Bogor / max(25%, Rp2,5 jt) Jadetabek. Ada juga mode flat per hari (CIFOR: Rp1,8 jt/hari).
- **Delivery Fee**: Jabodetabek Rp250.000 (toleransi Rp150.000 untuk Depok/Jaksel, keputusan sales), Bogor Rp50.000.
  Pesanan box = per kloter. Bila ada layanan buffet: **kemungkinan tidak dikenakan** (perlu konfirmasi).
- **Harga paket**: per pax, sama berapa pun jumlah tamu. Isi paket dipilih dari daftar menu yang ada.
  Custom (mis. ayam bakar → ayam dabu-dabu): **harga ditentukan manual oleh sales**; sistem tetap hitung ulang HPP di belakang.
- **HPP** = biaya bahan per porsi × 1,3 (overhead 30%: tenaga kerja, gas, listrik). Sewa alat & transport tidak masuk HPP.
  Saran harga = HPP ÷ 50% (target food cost). ±70% resep sudah standar, ±30% masih perkiraan.
- **Untung minimum 30%** dari harga jual.
- **Termin**: Booking fee Rp5.000.000 → DP 50% (H-30) → pelunasan H-14. Pak Reza menyebut DP fleksibel 20–50% / nominal tanda jadi → default mengikuti S&K, bisa diubah per klien. Instansi pemerintah boleh bayar setelah acara (faktur/invoice + kwitansi bermaterai).
- **Alur pesanan**: tanya → quotation → DP (langsung atau via invoice DP) → test food bila diminta → final → event → pelunasan. Pesanan box juga lewat quotation.
- **Persetujuan quotation**: OK via WA/telepon (mayoritas); lebih baik tanda tangan & kirim balik ke sales.
- **Komisi rekanan WO/vendor**: 3,5% dari nilai makanan & minuman.
- **Batas perubahan** (S&K): porsi/menu buffet H-5, nasi box H-2, waktu/agenda H-3; tambahan porsi min. 10%.
- **Minimum**: 25 pax/box (20 pax dengan penyesuaian layanan). Durasi layanan standar 6 jam (1+4+1), lebih = overtime.
- **Pembatalan** (S&K Bag. X): H-90 refund penuh; H-45–89 70%; H-30–44 50%; < H-30 hangus (bisa dipakai produk lain ≤3 bulan). ⚠️ Bertentangan dengan Bag. VI poin 7.
- **Tarif staf tambahan**: kitchen Rp350rb/3 jam (+75rb/jam), waiter Rp300rb/3 jam (+50rb), clear-up Rp250rb/3 jam (+50rb).
- **Sewa alat** (13 item, lihat `02-ATURAN-BISNIS.md`) — juga jadi tabel lost & breakable.
- **Honor tim lapangan**: per event; tarif beda karyawan vs freelance (angka belum ada). DW dicatat captain, dibayar Pak Reza.
- **Belanja**: per event oleh Pak Sur; 80% pasar/cash, 20% supplier tempo; diajukan → disetujui & ditransfer Finance → belanja → rekap nota per event → lapor Finance.
- **Opname**: bulanan oleh Tya. Gudang mencatat **bahan makanan + packaging**. Data peralatan **belum ada** (hitung dari awal).
- **Rekap setelah acara**: (1) peralatan — sewaan vs milik sendiri; (2) bahan baku — oleh gudang.

## 6. Rancangan modul (lengkap di `01-SPEC.md`)

A. Klien & Lead (CRM) · B. Bahan, Resep & HPP · C. Paket & Menu · D. Pricelist & Pustaka PDF ·
E. Quotation Builder (prioritas) · F. Dokumen & Pembayaran · G. Event & Operasional (assign, brief, tracking) ·
H. Purchasing, Gudang & Stock Opname · I. Rekap & Laporan · J. Karyawan (absen/jadwal) ·
K. Halaman Tim (PWA) + Layar Dapur · L. Hermes + Wiki Tiska · M. Pengaturan & Onboarding.

Hal-hal penting per modul:
- **Quotation Builder**: pilih pricelist sesuai konteks → pilih paket → tukar menu (kategori sama) → multi-hari/multi-sesi
  (hari × qty × pax × harga) → pajak per jenis item → layanan perlengkapan → delivery fee → pembulatan nett (tercatat
  sebagai diskon) → revisi berversi (R1, R2) + perbandingan → PDF langsung + link persetujuan/tanda tangan klien.
  Contoh angka asli PDGI: subtotal 11.912.500 → PB1 1.191.250 → layanan 15% 1.786.875 → 14.890.625 → nett 14.800.000.
- **Pustaka Pricelist**: hanya versi aktif terlihat sales, link permanen, versi ringan untuk WA, riwayat versi,
  tanda "PDF perlu update" bila harga sistem berubah, musiman auto-arsip, tercatat PL mana dikirim ke klien mana.
- **Brief otomatis** 5 jenis (Konfirmasi New Order, Pre-info, Update, Jadwal Tim Service, Jadwal Persiapan Besok) dengan
  format persis seperti di grup sekarang; update = hanya perubahan; per dapur (Masak/Pastry).
- **Tracking**: Dimasak → Packing → Siap → Berangkat → Tiba (foto) → Dokumen diterima. Bukti kirim (foto+jam+lokasi).
- **Layar Dapur** (TV + speaker): jam besar, kartu order + hitung mundur, papan jadwal angkut, pengumuman suara ala loket,
  nyala/mati otomatis mengikuti jadwal masak (smart plug / HDMI-CEC). Demo: `lampiran/lainnya/demo-layar-dapur.html`.
- **Halaman tim PWA**: beranda per peran; tombol "Siap 👍", "🔊 Dengarkan" (TTS), check-in hari-H, rekam suara/foto,
  login foto wajah + PIN, push notification (iPhone wajib "Tambahkan ke Layar Utama", iOS ≥16.4).
- **Purchasing**: PR otomatis dari order → persetujuan Finance → Daily Market (uang muka) / PO → terima barang (sebagian boleh)
  → rekap per event. Supplier + riwayat harga per bahan; konversi satuan; hutang dagang; opname dari HP.
- **Operasional Hari Ini** (owner) + ringkasan WA malam/pagi/sore.
- **Onboarding & wizard per peran** setelah aplikasi bisa dipakai; angka pasti diisi lewat wizard.

## 7. Hermes, WhatsApp, Wiki (lengkap di `10-HERMES-WIKI.md`)

- Hermes Agent (Nous Research, open-source MIT) di VPS; gateway WA via Baileys (WhatsApp Web emulation).
- Tugas klien: jawab FAQ, kumpulkan data lead (nama, jenis acara, tanggal, lokasi, pax, layanan, sumber), kirim pricelist
  (tanya dulu jenis acara & lokasi), cek tanggal, follow-up. Serah ke admin: **komplain, pesanan dadakan, paket rumit**
  (+ usulan: minta invoice/dokumen resmi, nego/diskon, minta bicara orang, AI ragu) — daftar final menunggu Mbak Rita/Ari.
- Tugas internal: kirim brief ke grup, kabar status, ringkasan harian owner, tanya data ("omzet bulan ini").
- Gaya bahasa: belajar dari **histori chat sejak 2022** (ekspor chat per klien) → halaman gaya bahasa di wiki; koreksi admin jadi bahan belajar.
- Biaya WA resmi (per 1 Okt 2026, Indonesia): service/utility ±Rp357/pesan, marketing ±Rp586/pesan, +PPN 11%, 1.000 service gratis/bulan → estimasi ±Rp500–700rb/bulan + biaya BSP.

## 8. Biaya operasional (estimasi)

Uji coba ±Rp0,5–0,6 jt/bulan; produksi ±Rp0,8–3,3 jt/bulan (Vercel Pro ±US$20, Supabase 0–US$25, VPS Rp150–300rb,
AI Rp300rb–1,5jt, WA resmi opsional Rp500–700rb). Perangkat layar dapur sekali beli (TV box Android, speaker, smart plug).

## 9. Tahapan (lengkap dengan kriteria selesai di `04-ROADMAP.md`)

Fase 0 Persiapan (backup, rapikan repo, akun atas nama Tiska, impor data) → Fase 1 Fondasi data (bahan, resep, HPP, menu,
paket, pricelist, Pustaka PDF) → Fase 2 Upgrade penjualan (Quotation Builder, revisi, PDF langsung, nomor baru, dokumen,
CRM dasar) → Fase 3 Operasional & tim (event, assign, brief, PWA, tracking, layar dapur, purchasing, gudang, opname, honor)
→ Fase 4 Hermes internal → Fase 5 Hermes klien → Fase 6 Lanjutan (absen, analitik, PDF pricelist otomatis).

## 10. Yang masih terbuka (lengkap di `13-PERTANYAAN-TERBUKA.md`)

Pricelist "02 Menu Bogor" mana yang berlaku; daftar PR-21 dst.; BS-25..28 & PR-12; harga paket box sebagai buffet;
perbedaan harga antar pricelist disengaja?; aturan pembulatan nett; OUTENTIKA by Tiska Catering; delivery fee saat ada
buffet; 3 kontradiksi S&K; daftar final kondisi handover; penanggung jawab alat prasmanan; tarif honor; durasi masak;
armada; TV & Wi-Fi dapur; contoh nota & BAST; akun Vercel/GitHub/Supabase atas nama Tiska; anggaran bulanan.

## 11. Artefak yang sudah dibuat

- `lampiran/lainnya/Proposal Konsep Tiska Ops.pdf` — proposal 24 halaman untuk atasan (versi terakhir).
- `lampiran/lainnya/demo-layar-dapur.html` — demo interaktif TV dapur (juga dipublikasikan sebagai artifact privat Rama).
- `data/` — ekstrak CSV dari Excel + teks semua pricelist & dokumen contoh (lihat `11-SUMBER-DATA.md`).
- Pertanyaan ke tim dikirim via WA (format list A–F); jawaban sudah masuk ke dokumen ini.

## 12. Langkah pertama di Claude Code

1. Baca `CLAUDE.md`, `HANDOVER.md`, dokumen ini, `DECISIONS.md`, `04-ROADMAP.md`.
2. Clone `cateringtiska/Aplikasi-Penjualan-TC`; baca `web/CLAUDE.md`, `web/AGENTS.md`, `web/prisma/schema.prisma`, `web/lib/*`.
3. Mulai **Fase 0 milestone 0.1** di `04-ROADMAP.md` (backup DB + audit repo + rencana restrukturisasi), laporkan ke Rama.
