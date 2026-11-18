# DESIGN — Tiska Ops

Sumber kebenaran visual. Kalau `web/` sudah punya sistem desain/komponen, **pakai yang ada** dan sesuaikan dokumen ini.

## Karakter
Bersih, modern, lembut, hangat (catering premium sejak 1980), tidak kaku, tidak "jadul 2010", tidak terlihat seperti template AI.

## Fondasi — Sistem Desain v2 (D-059, dari Claude Design "TISKA OPS DESIGN REFERENCE")
Referensi visual: repo `tiska-ops-arsip` → `lampiran/desain/tiska-ops-design-reference-v2/` (buka `Tiska Ops shadcn.dc.html` di browser). Halaman fondasi: **Kartu Piutang**.
- Font: **Inter** (teks) + **JetBrains Mono** (semua angka rupiah, nomor dokumen, jam, jumlah). Tidak pernah serif. Root 16px.
- Warna (token di `web/app/globals.css`): aksen **indigo** `--primary #3b4fa8`, judul `--primary-strong #1f2a5c`, latar panel
  `#fbfbfd`, netral bernuansa biru (`--muted-foreground #626578`, `--subtle-foreground #8a8da0`, `--border #e6e7ef`).
  Latar kerangka & panel statistik = gradasi `--shell` / `--hero` (indigo muda → krem). Warna status HANYA untuk uang & pekerjaan
  yang perlu ditindak: `tempo` (merah, lewat jatuh tempo), `perhatian` (kuning, perlu ditindak), `lunas` (hijau), `info` (biru muda).
- Skala: judul halaman 30/700 + ikon 30px; deskripsi 15px maks 760px; label seksi 12/600 uppercase; angka kartu mono 24–26/700;
  teks baris 15px; padding halaman 28px; radius kartu 14px, panel statistik 18px, tombol/input 10px, chip 999px. Tombol 40px, input 40px.
- Ikon: lucide (padanan Material Symbols di desain), stroke 1.75.
- Logo Tiska: file resmi utuh (`web/public/brand/`). Emas di latar terang, hitam untuk dokumen, putih di latar gelap. Jangan dirakit.

## Komponen reusable (pakai ini — jangan bikin salinan)
- Kerangka: `components/kerangka-aplikasi.tsx` (sidebar berikon, kelompok bisa dilipat, aktif = kartu putih, bisa diciutkan,
  breadcrumb; HP = bilah atas + laci).
- Halaman: `components/halaman.tsx` → `Halaman`, `KepalaHalaman` (ikon, jumlah, aksi), `StripRingkasan`, `BingkaiTabel`, `Th`, `Td`,
  `Pil`, `KeadaanKosong`, `RingkasanTabel`, `BagianForm` (kartu form: judul+penjelasan kiri, isian kanan; `lebar` untuk tabel).
- Tabel: kepala kolom yang bisa diurutkan `components/th-urut.tsx` (`ThUrut`, `?urut=`) + `lib/urut.ts` (`bacaUrut`, `urutkan`).
- Form panjang: ringkasan/aksi menempel di kanan (lg+), bilah bawah di HP. Tata letak di dalam kartu memakai container query
  (`@container`, `@3xl:`), bukan lebar layar — kolom kiri menyempit saat panel kanan tampil.
- Avatar orang: `components/avatar-orang.tsx` (Notionists via `/avatar`, `users.avatar`), pemilih `components/pilih-avatar.tsx`.
- Daftar poin bernomor (S&K): `app/(aplikasi)/syarat/editor-syarat.tsx` — satu poin satu kotak, nomor otomatis, Enter = poin baru,
  tempel banyak baris = dipecah, simpan otomatis. Pola ini dipakai untuk teks bernomor lain bila perlu.
- Statistik: `components/kartu-angka.tsx` → `PapanAngka` (wadah gradasi) + `KartuAngka` (`nada` netral/perhatian/info, `ikon`, `href`).
  Maksimal SATU kartu kuning per panel, dan hanya bila angkanya memang perlu ditindak (> 0).
- Tab: `components/saring-status.tsx` (garis bawah, jumlah kecil). Chip status: `components/lencana-status.tsx` (`ChipStatus`).
- Kontrol (semua custom, tanpa kontrol bawaan browser): `PilihCari` (combobox cari), `PilihanChip` (pilihan pendek/pill),
  `PilihTanggal` (kalender, lompat bulan/tahun, Hari ini/Hapus), `PilihJam` + `PilihRentangJam` (kolom jam & menit, bisa diketik),
  `ui/popover`, `ui/dialog`, `ui/sheet`, `ui/checkbox`, `ui/dropdown-menu`, `sonner` (toast). Semua mendukung form biasa (`name`).

## Komponen & aturan
- **Tidak ada kontrol native browser satu pun** (select, dropdown, kalender, jam, confirm/alert, color): pakai komponen di atas.
- Satu alur jelas end-to-end; halaman penuh > modal bertumpuk. Quotation Builder = halaman penuh dua kolom (isi | ringkasan & penanda).
- Status sebagai pill berwarna (Draft, Menunggu owner, Terkirim, Disetujui, DP, Lunas, Dimasak, Packing, Siap, Berangkat, Tiba).
- Tampilan exception-based: ringkasan di atas, detail di bawah; peringatan kuning/merah hanya bila perlu tindakan.
- Bahasa UI sehari-hari ("Untung per porsi", "Harga ini terlalu mepet", "Perlu dilengkapi").
- Animasi halus satu warna ≥0,8 s; hormati `prefers-reduced-motion`; tanpa kilatan warna jenuh.
- **Popup (dialog)** — patokan Rama 18 Nov 2026: tinggi maks. = tinggi layar − 6rem (jarak ≥ 3rem atas & bawah; sudah bawaan `ui/dialog`, isi lebih panjang digulir di dalam popup — jangan ditimpa dengan `max-h` lain yang lebih tinggi). Lebar menyesuaikan isi tapi **condong melebar**: form dengan banyak isian dibuat lebar (mis. 768–880px) dengan isian berdampingan dua kolom supaya popup pendek, bukan sempit memanjang ke bawah. Contoh acuan: popup Customer baru. HP tetap lembar dari bawah.

## Dokumen PDF
Halaman cetak (`app/(cetak)/layout.tsx`): kertas ukuran asli di kiri + panel kendali menempel di kanan (Cetak, gambar, ukuran isi). Pilihan khusus dokumen masuk panel lewat `SlotPanelCetak` (`components/panel-cetak.tsx`), jangan di atas kertas.
Tiru tata letak dokumen Tiska yang ada (lihat `docs/06-DOKUMEN-QUOTATION.md`), tetapi lebih rapi: S&K terbaca, label otomatis,
kop resmi, blok rekening, tanda tangan.

## Halaman tim & layar dapur
Lihat `MOBILE.md` dan `docs/08-TIM-PWA-LAYAR-DAPUR.md`. Layar dapur: tema gelap khusus TV (kontras tinggi, angka besar, font
condensed untuk papan jadwal, aksen emas) — contoh di `lampiran/lainnya/demo-layar-dapur.html`.
