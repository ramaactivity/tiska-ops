# 12 — Repo: basis kode & referensi

## 1. BASIS: `cateringtiska/Aplikasi-Penjualan-TC` (dipakai produksi oleh owner & sales)

Status saat dicek (14 Okt 2026, commit terakhir "Invoice punya kolom referensi PO"). Repo **publik** (tidak ditemukan rahasia
ter-commit; tetap jadikan private).

Struktur:
- Root = aplikasi **Laravel/Livewire lama** (Phase 1) — disimpan sebagai pembanding; `.env.example` root milik Laravel.
- `web/` = aplikasi aktif: **Next.js 16.3.4**, React 19, TS, Tailwind v4, shadcn + `@base-ui/react`, **Prisma 7 + adapter pg** ke
  Supabase Postgres (bukan supabase-js untuk data; supabase-js hanya Storage bucket `perusahaan` untuk logo/tanda tangan),
  auth sendiri (jose cookie + bcrypt, lockout gagal masuk), zod 4, react-hook-form, exceljs, decimal.js, vitest
  (**44 file tes, ±429 kasus**). Komentar kode bahasa Indonesia yang rapi.
- `.github/workflows/jaga-supabase-aktif.yml`: ping DB harian 09.00 WIB (secret `SUPABASE_DB_URL`) agar Supabase gratis tidak dijeda.
- `web/.env.example`: `DATABASE_URL` (pooler 6543, wajib `&uselibpqcompat=true`, escape `+` → `%2B`), `DIRECT_DATABASE_URL`
  (5432, untuk Prisma CLI & skrip; jatah 15 koneksi — jangan dipakai aplikasi: pernah tumbang `EMAXCONNSESSION`), `AUTH_SECRET`,
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server only). Tidak ada `NEXT_PUBLIC_*`.

Halaman `web/app/(aplikasi)/`: dasbor, pelanggan, produk, penawaran (+margin, ubah, excel, status), tagihan (+margin, ubah, excel),
pembayaran, laporan (penjualan, margin, piutang + excel), pengguna (+tabel izin peran × menu), perusahaan (+penandatangan).
Cetak `web/app/(cetak)/`: penawaran/tagihan `cetak` & **`dapur` (lembar dapur tanpa harga)**, pelanggan cetak, laporan penjualan cetak.

Pustaka `web/lib/` penting:
- `uang.ts` — rumus baris **HARI × QTY × PAX × HARGA** (kosong = 1), compliment = 0, flag service/PB1 per baris, pembulatan ala PHP round(); tes ekstensif.
- `nomor.ts` — kode CUST-0001/PRD-0001, nomor `QUO-2026-0001` per tahun, retry saat bentrok; catatan penting soal transaksi & kolam koneksi.
- `pengakuan.ts` — pengakuan penjualan saat acara terjadi (tanggal terakhir), panjar vs piutang vs proyeksi.
- `alokasi-pembayaran.ts` — alokasi pembayaran ke banyak invoice, hitung ulang dari nol.
- `margin.ts`, `biaya.ts` — biaya estimasi vs aktual per dokumen, kunci margin invoice; kategori biaya warisan Laravel; PB1 disetor tidak dihitung margin.
- `kartu-piutang.ts`, `laporan-*.ts`, `excel-*.ts`, `dokumen.ts`, `baris-cetak.ts`, `skala-cetak.ts` (cetak), `rbac.ts`, `izin.ts`, `peran.ts` (admin/sales/finance/cost), `penandatangan.ts`, `batas.ts` (batas panjang teks), `tanggal*.ts`.
- `components/dokumen-dapur.tsx` — nama dagang "TISKA Catering" di lembar dapur (sengaja beda dari nama badan hukum), total kelompok (uang) dibuang.
- `scripts/` — skrip migrasi aditif (`tambah-*.mjs`), `cadangkan.mjs` (backup JSON penuh, hash sandi ikut), `kosongkan-transaksi.mjs` (berbahaya), `uji-produksi.mjs`, `cek-koneksi.mjs`, `hitung-ulang-margin.mjs`, dll.

Skema (`web/prisma/schema.prisma`, warisan migrasi Laravel): lihat `03-DATA-MODEL.md` §1.

PDF saat ini dibuat via cetak browser ("Microsoft: Print To PDF").

**Cara melanjutkan**: pertahankan semua logika & tes di atas; tambah modul baru di `web/` mengikuti pola folder & penamaan
Indonesia yang ada; migrasi tetap lewat skrip aditif (atau perkenalkan `prisma migrate` dengan hati-hati — putuskan & catat di DECISIONS).

## 2. REFERENSI: `ramaactivity/tetra-ops` (photobooth; commit 13 Okt 2026)

Next 16.2.4, React 19, Tailwind v4, shadcn + base-ui, Zod 4, Biome, pnpm; Supabase SSR (`getClaims()`), RLS di semua tabel,
RPC `SECURITY DEFINER` untuk alur multi-tabel (`settle_event`, `reopen_settlement`), 227 migrasi via `scripts/apply-migration.ts`
+ `admin_exec_sql`. File ke Google Drive & R2 (presigned). Deploy pola standar Rama. Cron di `vercel.json` + `.github/workflows/crew-briefing.yml`.

Yang dipakai sebagai pola:
- Crew mobile `(crew)/crew` (home, jadwal, rekap dengan draft localStorage & kompres foto, alat, notifikasi, profil), redirect per peran.
- PWA push: `public/sw.js`, `manifest.json`, `src/lib/push/web-push.ts`, tabel `push_subscriptions`, tombol subscribe.
- Bot WA terpisah: tabel `bot_commands` (status pending, di-poll bot), brief idempoten `crew_briefings` unik (event, jenis), H-1 15.00 & hari-H 06.00, tanpa angka uang; `src/lib/bot-auth.ts`; `/api/availability`; dokumen `WHATSAPP_BOT_AVAILABILITY_*.md`.
- Pusat Dokumen (quotation/invoice/kwitansi/nota lunas/BAST; draft→sent→accepted/rejected/void), `@react-pdf/renderer`, `src/lib/documents/` (totals, send, approval "kirim ke owner dulu"), `src/lib/terbilang.ts`.
- Gudang: items, assets, bundles, stock-take, purchases, purchase-requests, suppliers, wastage; `stock_movements`.
- Rekap: crew submit → owner approve → `settle_event` (kurangi stok, jurnal, kunci) → `reopen_settlement` (super_admin).
- **Rahasia biaya di DB**: migrasi `20260721g_inventory_cost_owner_only.sql` (tabel owner-only + view `inventory_items_safe`); pelajaran: filter di aplikasi saja tidak cukup bila klien bisa query Supabase langsung.
- Konvensi: domain Indonesia + teknis Inggris; cek tabel ada sebelum menambah; audit_log; `DESIGN.md` (frame gradien pastel, kartu opak rounded-2xl, satu warna aksi, warna untuk status, `.tabular` untuk uang), `MOBILE.md` (kolom 480px, bottom nav + FAB, target 44–48px, input ≥16px, tabel → kartu).
Jangan disalin: frame/mediaset/backdrop/booth/galeri, ketersediaan per unit booth, COA & sinking fund spesifik.

## 3. REFERENSI: `ramaactivity/mahakan-pos` branch **`release/phase-1`** (coffee shop; commit 12 Okt 2026)

(`main` = snapshot lama Mei; `dev/modal-dividen-v2` Mei.) Next 16.2.4, React 19, Tailwind v4, Drizzle + Neon Postgres 17,
Auth.js v5 (email/password owner, PIN staf), Serwist PWA (`next build --webpack`), Dexie offline queue, vitest + e2e Playwright.

Pola untuk Tiska:
- `src/db/schema/purchase_requests.ts` (PR + item: requested/received qty desimal, snapshot nama & satuan, reject per item, status open/sebagian/selesai/batal, `whatsapp_sent_at`), `purchases.ts` (supplier, metode bayar, TOP & due date, status, `receipt_image_url(s)`, item → `inventory_movements`, link ke PR item), `suppliers.ts` (default TOP), `market_list.ts` (`supplier_ingredients`: harga, pack size, pack unit, is_primary), `stock-opname.ts` (sesi & baris: expected/actual desimal, unit cost snapshot, counted_by), `daily_market.ts` (topup/spend; saldo = akun buku besar 1103; nota multi-foto; reversal), `nota_archives.ts`, `push_subscriptions.ts`, `user_notification_subscriptions.ts`.
- UI: `PurchasingSection`, `PurchaseRequestsSection` (+ detail modal, kartu ringkas dengan progress), `CreatePurchaseFromPrModal` ("Tarik dari PR", split per supplier otomatis, partial), `TopTrackerView` (hutang dagang), `MarketListView`, `OpnameTab/CountView/ReviewView`, `DailyMarketSection`, `NotaArchiveSection`, `OperasionalChecklistSection`; mobile `/m/opname`, `/m/nota`, `/m/checklist`.
- `docs/Panduan-Gudang-Purchasing.html/.pdf` — contoh panduan pengguna gaya santai (pola onboarding Tiska).
- Konvensi: uang bigint rupiah bulat; kolom audit (created/updated/deleted_by) & soft delete; folder fitur `types/schemas/queries/actions` + `ApiResult`; server memvalidasi ulang harga & peran; `audit_logs`; nomor dokumen dengan advisory lock per hari WIB; `clientRefId` anti kirim-dobel; helper batas hari WIB; antrian offline retry hanya untuk galat sementara; partial unique index ("satu sesi aktif"); backup `pg_dump` mingguan; cron via GitHub Actions + `CRON_SECRET`.
Jangan disalin: POS/keranjang/void/refund, shift & setoran kasir, printer thermal, laporan penjualan per jam, investor/dividen.

⚠️ Ketiga repo publik. Mahakan berisi struktur investor/dividen/karyawan → sarankan private.

## 4. Bedanya Tiska vs referensi (ringkas)

PR lahir dari order event (bukan kasir); persetujuan & transfer oleh Finance; biaya belanja dialokasikan per event; saldo uang muka
mungkin per orang; peralatan keluar–kembali per event + sewaan vendor; dua dapur; kapasitas dapur/captain/driver/armada per tanggal.
