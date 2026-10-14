# deploy.md — Tiska Ops (DRAFT — lengkapi di Fase 0.1)

⚠️ Semua isian "TBD" wajib ditanyakan ke Rama, jangan ditebak.

## Akun
| Layanan | Akun / org | Catatan |
|---|---|---|
| GitHub | `ramaactivity/tiska-ops` (**private**) — repo Tiska Ops (D-023) | repo lama `cateringtiska/Aplikasi-Penjualan-TC` tidak disentuh (akses kita hanya baca). Arsip: `ramaactivity/tiska-ops-arsip` (private) |
| Vercel | akun catering.tiska@gmail.com (`cateringtiska-3541`), team **Tiska** `team_iBFZ2sZ2LdT7rvxNwRbkgZqJ` (slug `tiska1`), plan Hobby. Project **`tiska-ops`** `prj_oKgnzc2ug6vAqHeDjoJTeinx0SP2` → https://tiska-ops.vercel.app · Root Directory `web`, Node 24.x, region fungsi **sin1** (dekat DB), Vercel Authentication **mati** (app punya login sendiri), tidak di-link ke Git. Env produksi: AUTH_SECRET, DATABASE_URL, DIRECT_DATABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_URL (diisi via REST API, panjang dicek) | Team yang sama berisi `penjualan-tc` (aplikasi lama, Git integration ke repo cateringtiska) — **jangan disentuh**. Hobby = non-komersial → Pro saat produksi |
| Supabase (ERP) | akun **catering.tiska@gmail.com**, project "Tiska Ops" ref `wbqjduapfdlontbwmprr`, region Singapore, host pooler `aws-0-ap-southeast-1.pooler.supabase.com` | terpisah dari Supabase website & dari DB aplikasi lama. Personal Access Token di `web/.env` (`SUPABASE_ACCESS_TOKEN`) untuk Management API |
| Cloudflare R2 | TBD | PDF pricelist, foto bukti kirim, backup DB |
| VPS (Hermes) | TBD (penyedia, IP, user) | Hermes, worker WA, cron, backup |
| WhatsApp | uji: TBD nomor kedua · produksi: 0813-8310-8103 | Baileys via Hermes |

## Alur web
`git push` ke branch produksi → `.github/workflows/deploy.yml`: checkout → `npm i -g vercel@latest` →
`vercel pull --yes --environment=production` → `rm -rf .git` → `vercel deploy --prod` (bukan `--prebuilt`), env `VERCEL_ORG_ID`
& `VERCEL_PROJECT_ID` inline, `concurrency` cancel-in-progress. Root Directory project Vercel = `web/` (cek setting yang ada).
Setelah push: `gh run watch`, cek URL live. Native Git integration jangan disambung.
Workflow yang ada: hanya `jaga-supabase-aktif.yml` (disalin dari repo lama; butuh secret `SUPABASE_DB_URL` di repo ini). `deploy.yml` belum ada — dibuat setelah akun & project Vercel ditentukan.

## Database
DB baru disiapkan dari nol dengan: `npx prisma db push` → `node scripts/siapkan-db-baru.mjs` (RLS + REVOKE anon + CHECK warisan Laravel)
→ `tambah-izin-peran.mjs` → `tambah-peran-cost.mjs` → `tambah-peran-tiska.mjs` (harus SETELAH peran-cost) → `selaraskan-kategori-biaya.mjs`
→ `tambah-pengaturan-bisnis.mjs`. Lalu storage: `siapkan-penyimpanan.mjs` (bucket publik `perusahaan` untuk logo) + `amankan-tanda-tangan.mjs` (bucket tertutup
`tanda-tangan`). Akun admin pertama: `buat-admin.mjs "Ramadan Saputra" rama`. Sudah dijalankan 14 Okt 2026.
Migrasi aditif lewat skrip `web/scripts/*.mjs` (pola repo) atau mekanisme yang diputuskan di DECISIONS. Jalankan migrasi
sebelum deploy kode yang membutuhkannya. Backup sebelum perubahan berisiko (`web/scripts/cadangkan.mjs`).
Supabase gratis dijeda bila 7 hari tanpa aktivitas → workflow `jaga-supabase-aktif.yml` (secret `SUPABASE_DB_URL`).

## VPS
Skrip deploy terpisah (rsync tanpa folder sesi WA), restart di luar jam chat, verifikasi lewat log/string versi.

## Troubleshooting (isi saat terjadi)
| Gejala | Penyebab | Solusi |
|---|---|---|
| "commit email could not be matched" | Vercel Hobby | `rm -rf .git` sebelum deploy |
| `EMAXCONNSESSION` | aplikasi memakai port 5432 | aplikasi wajib `DATABASE_URL` 6543 |
| "self-signed certificate in certificate chain" | Prisma + sslmode | tambah `&uselibpqcompat=true` |
