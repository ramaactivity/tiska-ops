# Riset komponen UI dari ekosistem shadcn (18 Nov 2026)

Permintaan Rama: cari komponen reusable dari penyedia sejenis shadcn/ui yang bagus (bukan basic, bukan AI slop),
tetap disesuaikan dengan kebutuhan Tiska Ops. Hasilnya: tidak ada pustaka luar yang dipasang — lihat bagian terakhir.

## Fakta aplikasi
- shadcn style `base-nova` di atas **Base UI** (`@base-ui/react` ^1.8, prop `render`, bukan `asChild`), Tailwind v4, React 19.
- Belum terpasang: TanStack Table, react-day-picker, dnd-kit, motion, recharts, cmdk.
- Sudah punya sendiri (jangan didobel): `SaringStatus` (tab saringan + jumlah), `PilihCari` (combobox), `PilihDropdown`,
  `PilihTanggal`, `PilihJam`, `Pencarian`, pencarian global di header ("Cari data…" + `/`), `KeadaanKosong`, `KartuAngka`,
  tab Riwayat di detail event, unggah file di ±15 tempat.

## Sumber yang cocok (MIT, mendukung Base UI)
- **Dice UI** (diceui.com) — Data Table (saringan + urut multi-kolom + pilih kolom + bilah aksi massal, status di URL lewat nuqs),
  Mask Input (mata uang), Stepper, Timeline, File Upload, Stat, Kanban.
- **ReUI** gratis (reui.io) — Data Grid + Filters (lebih berat, ada `i18n`), Date Selector (periode bulan/kuartal/tahun;
  `maxYear` bawaan 2026 → wajib diisi), Event Calendar (bulan/minggu/hari/agenda). Blok Pro berbayar — lewati.
- **shadcn resmi** — Field, Input Group (awalan "Rp", akhiran "porsi"), Empty, Combobox `multiple` + chips, Calendar range + preset.
- **coss ui** (eks Origin UI) — kualitas tertinggi, murni Base UI; ambil satuan saja (Number Field, Command) karena membawa
  button/input/label sendiri. Origin UI versi lama = Radix, jangan.
- **Base UI langsung** — `NumberField` dengan `locale="id-ID"` + `format` IDR (sudah terpasang, tanpa pustaka baru).

## Hindari
Magic UI, Aceternity (lisensi bukan MIT), Cult UI, React Bits, latar/teks beranimasi (efek landing page, bukan ERP);
Kibo UI, Tremor, OpenStatus table (Radix — `asChild` rusak di Base UI); Park/Ark UI (mesin primitif lain);
kit liquid-glass/neumorphism; grid KPI template (dashboard-01, dashboardblocks); `native-select` shadcn (melanggar aturan
tanpa kontrol native).

## Aturan memasang
1. `npx shadcn@latest add <item> --dry-run` dulu; pasang **tanpa** `--overwrite`, jawab "No" bila diminta menimpa
   `components/ui/*` (sudah disesuaikan DESIGN.md).
2. Satu mesin tabel (Dice **atau** ReUI) dan satu mesin kalender saja.
3. Cek impor `cn` (beberapa item memakai paket npm `cn`; kita pakai `@/lib/utils`), terjemahkan label Inggris,
   warnai ulang dengan token DESIGN.md.
4. Uang: angka di DOM bukan `type=number`; uji tampilan IDR (tanpa desimal) dan regresi hitungan invoice.

## Usulan urutan & hasilnya (disetujui Rama 18 Nov)
1. ✅ D-192 — **Isian rupiah** satu komponen (`components/isian-rupiah`, di atas `ui/input`; NumberField Base UI tidak dipakai
   karena hanya merapikan saat kotak ditinggalkan) untuk Payment, Invoice/Quotation, Pembelian — tanpa pustaka baru.
2. ✅ D-193 — **Preset rentang tanggal** (Hari ini · Minggu ini · Bulan ini · Bulan lalu · pilih sendiri) di halaman Laporan,
   dikembangkan dari `PilihTanggal` (tanpa react-day-picker).
3. ❌→✅ D-196 — **Uji coba Dice Data Table di satu daftar** (Payment): TIDAK dipasang setelah simulasi (42 file, 13 pustaka termasuk kalender kedua & dnd-kit, menimpa 5 komponen inti). Saringan periode/cara bayar + centang & cetak kwitansi dibangun dari komponen sendiri. Pertimbangkan lagi hanya untuk daftar ribuan baris yang butuh paginasi server / kolom yang bisa diatur.
4. Nanti bila dibutuhkan: Timeline untuk Riwayat, File Upload seragam (bukti transfer, foto menu), Event Calendar untuk jadwal.
