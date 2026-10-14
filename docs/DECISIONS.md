# DECISIONS — Tiska Ops

Format: nomor · tanggal · keputusan · alasan · sumber. Tambah di bawah; baca nomor terakhir tepat sebelum menambah (sesi paralel).

| No | Tanggal | Keputusan | Alasan | Sumber |
|---|---|---|---|---|
| D-001 | 2026-10-14 | Tiska Ops dibangun dengan meng-upgrade Aplikasi Penjualan TC (`web/`); Laravel lama diarsipkan | Sudah dipakai owner & sales, ada data asli, logika keuangan rumit sudah teruji (±429 tes) | Rama: "masih dipakai tapi minta gua upgrade lagi dan disatukan" |
| D-002 | 2026-10-14 | Stack Next 16 + React 19 + TS + Tailwind v4 + shadcn + Supabase Postgres; Prisma lanjut dipakai | Konsisten dengan repo & stack default Rama | PROFIL-RAMA §9 |
| D-003 | 2026-10-14 | Web app di Vercel; VPS untuk Hermes, worker WA, cron, backup harian ke R2 | Hermes butuh proses 24 jam; Supabase gratis tanpa backup otomatis | Diskusi infrastruktur |
| D-004 | 2026-10-14 | Database ERP terpisah dari database website tiskacatering.com | Data HPP/keuangan tidak satu tempat dengan situs publik | — |
| D-005 | 2026-10-14 | Satu data satu tempat; angka hanya dari DB, wiki hanya pengetahuan naratif | Akar masalah Tiska = data disalin ke banyak file | Temuan audit file |
| D-006 | 2026-10-14 | HPP, harga beli, margin hanya Owner & Accounting; dikunci di server/DB | Jawaban tim + aturan Rama | Pak Reza; PROFIL-RAMA §12 |
| D-007 | 2026-10-14 | Nomor dokumen baru `QUO/TC/2610/006-R2`; nomor lama tetap | Urutan bulanan seperti kebiasaan, tahun-bulan di depan agar terurut, satu pola semua dokumen | Rama: "silahkan dibuat yang terbaik" |
| D-008 | 2026-10-14 | Struktur Master Menu → Master Paket → Pricelist berversi; bentuk penyajian dipisah dari isi paket | Harga beda per konteks harus disengaja & terlacak; HPP box ≠ buffet | Temuan 18 pricelist & file paket |
| D-009 | 2026-10-14 | WA mulai jalur tidak resmi (Baileys via Hermes); uji di nomor kedua dulu; siap pindah ke resmi | Bisa membaca histori, murah; risiko blokir nomor utama | Rama: "kayanya sih bailey dulu" |
| D-010 | 2026-10-14 | Hermes bertahap: internal → draf+persetujuan → otomatis bertahap; tak ada pesan ke klien tanpa izin | Keamanan reputasi | Aturan Rama |
| D-011 | 2026-10-14 | Halaman tim sebagai PWA dulu, native nanti bila perlu | HP tim jadul, storage terbatas, tim gaptek | Rama |
| D-012 | 2026-10-14 | "Service charge" → "Layanan Penyediaan Perlengkapan Buffet & Stall"; ongkir → "Delivery Fee" | Permintaan sales | Mbak Ariz |
| D-013 | 2026-10-14 | Penanda untung ≥35% aman, 30–35% mepet, <30% wajib persetujuan owner | Minimum 30% dari tim; pita kuning = peringatan dini | Mbak Ariz |
| D-014 | 2026-10-14 | Repo tetra-ops & mahakan-pos (release/phase-1) hanya referensi pola; aturan mengikuti Tiska | Bisnis & mekanisme berbeda | Rama |
| D-015 | 2026-10-14 | Pajak: makanan PBJT 10%, sewa alat PPN 11%; layanan perlengkapan & delivery tanpa pajak | Jawaban Finance | Pak Reza |
| D-016 | 2026-10-14 | Termin default booking fee 5 jt → DP 50% H-30 → lunas H-14; bisa diubah per klien | S&K + sales; Finance menyebut DP fleksibel | S&K VI, Mbak Ariz, Pak Reza |
| D-017 | 2026-10-14 | Alur pesanan: quotation → DP → test food (bila diminta) → final → event → pelunasan; box juga via quotation | Koreksi Rama & sales | Rama, Mbak Ariz |
| D-018 | 2026-10-14 | Tujuan utama sistem: mengisi kekosongan peran Operational | Posisi kosong, dipegang owner | Rama |
| D-019 | 2026-10-14 | Layar Dapur (TV+speaker) disimpan sebagai MVP, disempurnakan kemudian (nyala/mati otomatis, per dapur) | Permintaan atasan | Rama |
| D-020 | 2026-10-14 | Istilah "komisi rekanan/vendor" diganti **"Partner Fee"** di UI, dokumen, laporan & Hermes (tetap 3,5% dari nilai makanan & minuman) | Permintaan Rama | Rama |
| D-021 | 2026-10-14 | Paket kickoff + lampiran asli (Excel, PDF pricelist, dokumen contoh, screenshot) disimpan di repo **private** `ramaactivity/tiska-ops-arsip`, terpisah dari repo kode | Repo kode `cateringtiska/Aplikasi-Penjualan-TC` publik & akun Rama hanya akses baca; lampiran berisi data klien & 86 MB, tidak boleh masuk repo kode | Rama: "amankan ke repo kita" |
| D-022 | 2026-10-14 | PBJT 10% **default aktif untuk semua makanan, termasuk box**; Quotation Builder punya **saklar PBJT aktif/nonaktif** per quotation (+ saklar per baris `charge_pb1` yang sudah ada). Mematikan PBJT tercatat (siapa, kapan, alasan "nego klien") | Harusnya selalu kena; sebagian klien nego tidak mau dikenakan (penjelasan DIVAS tanpa PBJT) | Pak Reza via Rama |
| D-023 | 2026-10-14 | Tiska Ops dibangun di **repo baru (private)**, bukan di `cateringtiska/Aplikasi-Penjualan-TC`. Repo lama tidak diubah sama sekali dan tetap jalan untuk owner & sales sampai Tiska Ops siap. **Mengubah D-001** soal lokasi kode; logika & tes dari aplikasi lama tetap jadi acuan (boleh disalin) | Permintaan Rama; repo lama publik & hanya akses baca; aman untuk produksi yang sedang dipakai | Rama: "bikin repo baru saja, jangan di repo lama" |
| D-024 | 2026-10-14 | Repo `ramaactivity/tiska-ops` diisi **salinan kode `web/` aplikasi lama** (commit `b727d21`, tanpa riwayat git) + dokumen kickoff; struktur `web/` dipertahankan. Database = **Supabase baru** (akun catering.tiska@gmail.com, ref `wbqjduapfdlontbwmprr`), bukan DB aplikasi lama; data lama dipindah sekali saat Tiska Ops siap menggantikan | Logika uang & ±276 unit test sudah terbukti; DB terpisah = aplikasi lama yang sedang dipakai sales tidak terganggu | Rama: "lanjut, terima beres" atas rekomendasi |
