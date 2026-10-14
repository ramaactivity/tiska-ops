@web/AGENTS.md

# Tiska Ops — aturan proyek untuk Claude Code

Proyek: sistem ERP + CRM + operasional Tiska Catering (PT. Tiska Cipta Imaji, Bogor), dibangun dengan meng-upgrade
**Aplikasi Penjualan TC** (`web/`, sedang dipakai owner & sales). Pemilik proyek: **Rama (Ramadan Saputra)**, Business
Development, vibecoder non-teknis.

## Wajib dibaca di awal setiap sesi
1. `git log --oneline -20` + `git status` (cek sesi paralel).
2. `HANDOVER.md` (status terakhir & langkah berikutnya).
3. `docs/00-KONTEKS-LENGKAP.md` (seluruh konteks) → dokumen topik yang relevan di `docs/`.
4. `docs/DECISIONS.md` sebelum mengubah arah apa pun.
5. Sebelum menulis kode Next: baca `node_modules/next/dist/docs/` (versi ini beda dari data latih) dan `web/CLAUDE.md`.
6. Sebelum menulis UI: `DESIGN.md` + `MOBILE.md`.

## Cara bicara ke Rama
Bahasa Indonesia santai (lu/gua), kalimat utuh, tanpa jargon (jelaskan istilah teknis sekali). Pisahkan **"yang udah gua
kerjain"** vs **"yang perlu lu kerjain"** (langkah manual: situs → halaman → tombol → apa yang ditempel). 1–2 milestone per
sesi. Laporan ✅/⏳/❌. Kegagalan disebut terang-terangan. Kode, commit, komentar ditulis normal.

## Otonomi
- Terima beres: jalankan sendiri terminal, install, migrasi, commit, push, deploy. Commit+push+deploy setelah terverifikasi = izin tetap (cek akun di `deploy.md`/`accounts.md` dulu).
- **Tanya dulu**: migrasi destruktif (DROP/TRUNCATE/rename/NOT NULL di data lama/mass UPDATE-DELETE), `push --force`, `reset --hard`, memindah/menghapus aplikasi Laravel lama, dan **mengirim pesan apa pun ke klien/orang luar**.
- Skrip pengubah data: DRY-RUN → periksa sendiri (jumlah baris, nominal, cocok dengan sumber) → `--apply` satu transaksi → laporkan. Izin tetap dari Rama (15 Okt 2026): tidak perlu menunggu "jalankan". Migrasi destruktif tetap tanya.
- Jangan suruh Rama copy-paste SQL. "Lanjut"/AFK = putuskan sesuai rekomendasi, catat di `docs/DECISIONS.md`.
- Keputusan uang/bisnis milik Rama/owner: sistem boleh mendeteksi & memperingatkan, jangan bikin rem otomatis baru tanpa setuju.

## Repo ini vs aplikasi lama (D-023, D-024)
- Repo ini (`ramaactivity/tiska-ops`) = salinan `web/` aplikasi lama + DB Supabase baru. Repo `cateringtiska/Aplikasi-Penjualan-TC` **jangan diubah** (hanya dibaca); aplikasi lama tetap dipakai owner & sales sampai Tiska Ops menggantikannya.
- Jangan merusak alur quotation/invoice/pembayaran/laporan warisan — data lama akan dipindah ke sini. Semua perubahan skema **aditif**.
- Backup (`web/scripts/cadangkan.mjs`) sebelum perubahan berisiko. Deploy perubahan dokumen di luar jam kerja sibuk.
- Dokumen lama harus menghasilkan **angka yang sama persis** setelah perubahan mesin hitung (tes regresi).
- `DATABASE_URL` (pooler 6543) untuk aplikasi; `DIRECT_DATABASE_URL` (5432) hanya untuk CLI/skrip. Akhiran `&uselibpqcompat=true` wajib untuk Prisma. Lihat `web/.env.example`.

## Git (sesi paralel)
Jangan `git add -A` / `.` / folder. Stage file sendiri, baca `git status` utuh & `git diff --cached`. Jangan stash/revert/format
kerjaan sesi lain. `git fetch` sebelum push. Gaya commit `<type>(<area>): <ringkas> — <kenapa>`. Jangan amend yang sudah di-push.

## Selesai berarti
`tsc --noEmit` + lint file sendiri + `next build` + vitest hijau; verifikasi lewat halaman asli + screenshot desktop & HP;
angka dicek ulang ke DB; saklar fitur dipastikan nyala; skrip sementara dihapus; `HANDOVER.md` & `DECISIONS.md` diperbarui.

## Aturan bisnis yang tidak boleh dilanggar
- **HPP, harga beli, untung/margin hanya Owner & Accounting** — strip di server, jangan hanya disembunyikan di UI. Tim lapangan/dapur tidak melihat harga apa pun.
- Satu rumus satu tempat (`lib/hitung/*`): halaman, PDF, brief, Hermes, laporan memakai fungsi yang sama.
- Angka (pajak, layanan perlengkapan, delivery fee, termin, batas untung, overhead) dari tabel pengaturan, bukan hard-code. Rujukan: `docs/02-ATURAN-BISNIS.md`.
- Istilah: "Layanan Penyediaan Perlengkapan Buffet & Stall" (bukan service charge), "Delivery Fee", "PBJT", "Partner Fee" (bukan komisi rekanan/vendor).
- Uang: rupiah bulat di tampilan, angka tabular.

## UI
Bersih, modern, lembut, **sans-serif** (Inter / Plus Jakarta Sans), tombol pill, kartu rounded-2xl bayangan lembut, aksen pastel.
**Dilarang kontrol native browser** (`confirm/alert`, `<select>` native, `<input type=color>`, `<textarea>` polos). Satu alur
jelas; halaman penuh lebih baik dari modal bertumpuk. Animasi lembut ≥0,8 s, tanpa kilatan warna. Halaman tim: ikuti
`docs/08-TIM-PWA-LAYAR-DAPUR.md` (pengguna 50+, literasi rendah: ikon, suara, tombol besar, tanpa mengetik).

## Tulisan ke klien (Hermes, template pesan)
Gaya admin manusia di HP: kalimat pendek, "Kak" secukupnya, emoji maks 1, maks 2 pertanyaan per pesan, balas seluruh konteks
sekaligus. Dilarang: "selamat menikmati", "semoga …", "sehat & sukses selalu", "kontak kami selalu terbuka", pujian pembuka,
kata seru gaya AI. Fakta hanya dari data/wiki resmi. **Tidak ada pesan ke klien tanpa persetujuan.**

## Deploy
Web: push → GitHub Actions → Vercel CLI (`VERCEL_TOKEN`, `vercel pull` → `rm -rf .git` → `vercel deploy --prod`), satu jalur saja.
VPS (Hermes/worker): skrip deploy sendiri; PUSH ≠ DEPLOY; verifikasi lewat perilaku/log; jangan restart saat klien chat;
rsync kecualikan folder sesi WA. Migrasi DB sebelum deploy kode yang membutuhkannya. Detail & akun: `deploy.md`, `accounts.md`.
