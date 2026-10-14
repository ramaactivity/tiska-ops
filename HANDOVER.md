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

## Langkah berikutnya (Fase 0, `docs/04-ROADMAP.md`)
1. **0.1 Audit & backup**: clone repo, baca `web/` (CLAUDE.md, AGENTS.md, schema, lib, scripts, workflow), tanya Rama akun
   GitHub/Vercel/Supabase yang dipakai → tulis `deploy.md` & `accounts.md`, jalankan backup, laporkan kondisi (tes, build).
2. **0.2 Rapikan repo**: rencana memindah Laravel lama (tanya dulu), taruh paket dokumen ini, cek workflow deploy.
3. **0.3 Fondasi peran & pengaturan**.

## Catatan untuk sesi berikutnya
- Repo basis & referensi publik → ingatkan Rama menjadikan private.
- Lampiran besar (PDF pricelist 81 MB) jangan di-commit; simpan di penyimpanan privat, catat lokasinya di sini.
- Brief WA asli & aturan format: `docs/07-BRIEF-TEMPLATES.md` — generator wajib dites terhadap contoh asli.
