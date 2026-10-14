# deploy.md — Tiska Ops (DRAFT — lengkapi di Fase 0.1)

⚠️ Semua isian "TBD" wajib ditanyakan ke Rama, jangan ditebak.

## Akun
| Layanan | Akun / org | Catatan |
|---|---|---|
| GitHub | `ramaactivity/tiska-ops` (**private**) — repo Tiska Ops (D-023) | repo lama `cateringtiska/Aplikasi-Penjualan-TC` tidak disentuh (akses kita hanya baca). Arsip: `ramaactivity/tiska-ops-arsip` (private) |
| Vercel | TBD (akun/team mana? project id?) | Hobby = non-komersial → Pro saat produksi |
| Supabase (ERP) | akun **catering.tiska@gmail.com**, project ref `wbqjduapfdlontbwmprr` (baru, kosong) | terpisah dari Supabase website & dari DB aplikasi lama. Region pooler: TBD (lihat `web/.env`) |
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
