# 04 — Roadmap & Milestone

Aturan: **1–2 milestone per sesi**. Tiap milestone selesai = `tsc --noEmit` + lint file sendiri + `next build` + test hijau,
diverifikasi lewat halaman asli (screenshot desktop + HP), commit + push + deploy, update `HANDOVER.md`, catat keputusan di
`DECISIONS.md`, lapor ke Rama dengan ✅/⏳/❌ dan pisahkan "yang udah gua kerjain" vs "yang perlu lu kerjain".
Aplikasi sedang dipakai owner & sales → **jangan merusak alur quotation/invoice/pembayaran yang ada**; setiap perubahan
skema aditif; backup sebelum perubahan berisiko; deploy di luar jam sibuk bila menyentuh dokumen.

---

## Fase 0 — Persiapan

**0.1 Audit & backup**
- ✅ (14 Okt) Kode sudah disalin ke repo baru `ramaactivity/tiska-ops` (D-024). Baca `web/CLAUDE.md`, `web/AGENTS.md`, `web/README.md`, skema Prisma, `web/lib/*`, `web/scripts/*`, workflow.
- Catat akun yang dipakai (GitHub org `cateringtiska`, akun Vercel, project Supabase) ke `deploy.md`/`accounts.md` — **tanya Rama**, jangan tebak.
- Jalankan `web/scripts/cadangkan.mjs` (backup JSON penuh) → simpan di luar repo; laporkan jumlah baris per tabel.
- Selesai bila: dokumen akun terisi, backup ada, ringkasan kondisi repo (tes lulus? build? versi Next?) dilaporkan.

**0.2 Rapikan repo**
- Pindahkan aplikasi Laravel lama ke `legacy-laravel/` (atau branch arsip) — **tanya dulu** (operasi besar).
- Taruh paket dokumen ini: `CLAUDE.md`, `HANDOVER.md`, `DESIGN.md`, `MOBILE.md`, `deploy.md`, `accounts.md` di root; `docs/*`; `data/*` (CSV kecil boleh di repo; lampiran besar **jangan** — simpan di R2/Drive, catat lokasinya).
- Pastikan deploy mengikuti pola standar (GitHub Actions → Vercel CLI). Cek workflow yang ada.
- Ingatkan Rama: repo `Aplikasi-Penjualan-TC`, `tetra-ops`, `mahakan-pos` **publik** → jadikan private (Settings → Danger Zone).

**0.3 Fondasi peran & pengaturan**
- Tambah peran baru (owner, direksi, accounting, bizdev, kepala_dapur, dapur, captain, field, driver, gudang, dw) tanpa mengubah perilaku peran lama.
- Mekanisme "kolom rahasia" (🔒) di server + test kebocoran payload.
- Tabel `settings` untuk semua angka di `02-ATURAN-BISNIS.md`.

## Fase 1 — Fondasi data

**1.1 Bahan & resep**: tabel ingredients/prices/recipes/recipe_lines; skrip impor DRY-RUN dari `data/*.csv`; halaman daftar bahan (cari, filter kategori, antrian "perlu dilengkapi"); halaman resep (dapur: tanpa harga).
**1.2 HPP**: fungsi tunggal `hitungHpp()` + test (Ayam Kodok = 4.882,41; Tumis Kacang Panjang = 3.053,70); tampilan HPP & saran harga untuk owner/accounting.
**1.3 Menu & paket**: menus, packages (fixed/choice/bundle), service_forms; impor paket BS/PR/Premium; validasi HPP paket vs file (BS-15 = 27.099,33 termasuk box 5.805).
**1.4 Pricelist & Pustaka PDF**: pricelists + items + files; unggah 18 PDF (versi A/B "02" → tanya Rama mana yang aktif); halaman sales HP (cari, kirim WA, salin link); link permanen `/pl/<slug>`; kompres PDF; perbandingan pricelist.

## Fase 2 — Upgrade penjualan (PRIORITAS ATASAN)

**2.1 Mesin hitung quotation**: modul `lib/hitung/quotation.ts` — pajak per jenis, layanan perlengkapan (semua mode), delivery fee, pembulatan, komisi; test wajib dengan angka PDGI, CIFOR, DIVAS (`02-ATURAN-BISNIS.md` §13). Pastikan dokumen lama menghasilkan angka **sama persis**.
**2.2 Quotation Builder**: sesi per hari, pilih pricelist & paket, tukar menu kategori sama, harga manual, penanda untung (owner/accounting), status menunggu persetujuan owner.
**2.3 Revisi & penomoran**: quotation_versions + perbandingan; `document_sequences` + format baru; nomor lama tetap.
**2.4 PDF langsung**: render server-side (pertimbangkan `@react-pdf/renderer` seperti Tetra Ops), S&K per jenis layanan dari `terms_templates`, nama file baru; bandingkan visual dengan dokumen lama.
**2.5 Persetujuan klien & dokumen turunan**: catat OK WA/telepon + bukti; link tanda tangan; invoice termin (booking/DP/pelunasan); kwitansi (terbilang, materai > 5 jt); nota; BAST; refund pembatalan.
**2.6 CRM dasar**: leads + pipeline + aktivitas; konversi lead → quotation.

## Fase 3 — Operasional & tim

**3.1 Event**: konversi quotation disetujui → event (hari, jadwal, item, cara layanan); kunci setelah batas perubahan; event_changes.
**3.2 Penugasan & armada**: vehicles, assignments (kloter), driver_tasks, cek bentrok, kapasitas.
**3.3 Brief otomatis**: generator teks sesuai `07-BRIEF-TEMPLATES.md` (+ test snapshot terhadap contoh asli), pratinjau-edit-kirim, antrian `bot_commands`, idempotensi, ack "Siap 👍".
**3.4 PWA tim**: manifest + service worker + push (VAPID), login foto+PIN, beranda per peran, 🔊 TTS, offline brief hari ini; desain sesuai `08-TIM-PWA-LAYAR-DAPUR.md`; uji di HP Android murah.
**3.5 Tracking & bukti kirim**: tombol status per peran, foto + lokasi + antrian offline, notifikasi admin/sales, posting otomatis ke grup WA.
**3.6 Layar Dapur**: halaman kiosk per dapur, realtime, pengumuman suara, jadwal nyala/mati; uji dengan perangkat asli.
**3.7 Purchasing**: PR otomatis dari event, persetujuan Finance, cash advance (Daily Market), PO tempo, penerimaan (sebagian), supplier & harga, konversi satuan, hutang dagang.
**3.8 Gudang**: stok bahan & packaging, opname bulanan (pengingat tgl 1), wizard Hitung Awal Peralatan, keluar–kembali alat, rekap peralatan & bahan.
**3.9 Honor & DW, rekap event, Operasional Hari Ini (owner), ringkasan harian.**

## Fase 4 — Hermes internal
VPS + Hermes + gateway WA (nomor uji), tool API Tiska Ops (baca jadwal, kirim brief, tanya data — tanpa data 🔒 untuk non-owner), Wiki Tiska awal (FAQ, S&K, SOP), ringkasan owner via Hermes. Lihat `10-HERMES-WIKI.md`.

## Fase 5 — Hermes klien
Olah histori chat (sampel) → halaman gaya bahasa; mode draf + persetujuan admin; pengumpulan lead ke CRM; kirim pricelist; aturan serah-terima; evaluasi berkala; pindah ke nomor Admin Utama setelah stabil.

## Fase 6 — Lanjutan
Absen & jadwal karyawan; analitik (menu terlaris, paket sering diubah, ketepatan waktu, selisih opname); ekspor faktur (Coretax); PDF pricelist otomatis; aplikasi native bila PWA terbukti kurang.

## Onboarding (berjalan di setiap fase)
Setiap modul yang dirilis ke peran baru disertai: tur singkat di aplikasi, wizard data yang perlu diisi, panduan HTML/PDF santai per peran, sesi pendampingan pemasangan PWA di HP masing-masing, uji dengan 3–5 pengguna asli sebelum rilis luas. Cara kerja lama tetap jalan paralel selama transisi.
