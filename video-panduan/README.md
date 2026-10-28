# Video panduan Tiska Ops

Video pelatihan per divisi, **direkam dari aplikasi asli** (bukan gambar tiruan), supaya orang baru bisa belajar sendiri
dari menu Panduan di aplikasi. Semua bahan sumber disimpan di sini; kalau aplikasi berubah, video cukup **direkam ulang
dengan satu perintah** (D-114).

## Komponen (bongkar-pasang)

| Berkas | Isi | Diubah kalau… |
|---|---|---|
| `episode/<nama>/naskah.mjs` | **Satu-satunya yang khusus per video**: judul, langkah — `poin` singkat di layar (+ `sub`), `narasi` lengkap yang diucapkan, elemen disorot/diketuk — dan ringkasan | isi video berubah |
| `episode/_templat/naskah.mjs` | Titik awal episode baru (salin foldernya) | — |
| `lib/pilih.mjs` | Cara menunjuk elemen: `tombol()`, `teks()`, `isian()`, `kolom()`, `tautan()`, `css()` | butuh cara tunjuk baru |
| `lib/demo.mjs` | "Panggung" data demo yang dipakai ulang (mis. `captainDiKloterDemo()`): akun dummy, siapkan/bersihkan, tanggal, nama fiktif | butuh situasi data baru |
| `lib/data.mjs` | Akses database (pakai `web/.env`) + pembuat akun dummy `ujitmp_vid*` | — |
| `lib/rekam.mjs` | Perekam: buka aplikasi, jalankan langkah, foto tiap keadaan, gulir halus 60 fps, auto-gulir ke elemen yang disorot | perilaku rekam |
| `lib/suara.mjs` | Narasi per langkah (suara AI atau berkas buatan sendiri) | ganti suara AI |
| `lib/ucapan.mjs` | Kamus ucapan suara AI: kata Inggris/singkatan ditulis sesuai bunyi ("invoice" → "invois", "PIC" → "pi ai si"); teks layar tidak berubah | ada kata yang terdengar aneh |
| `lib/komposer-hp.html` | Tampilan video **tegak 9:16** untuk tim HP: layar aplikasi besar, sorotan, jari, kalimat besar, ringkasan | gaya visual HP |
| `lib/komposer.html` | Tampilan 16:9 (sementara: HP di layar lebar; untuk tim kantor akan diganti jendela browser) | gaya visual laptop |
| `lib/render.mjs` | Render frame → MP4 (dari skill `explainer-default`, + supersampling `SS`) | — |
| `lib/sfx/` | Efek suara CC0 (lihat `lib/sfx/LISENSI.md`) | — |
| `buat.mjs` | Satu perintah: siapkan data → rekam → kembalikan data → narasi → jadwal → render → campur suara → ukur loudness | alur pembuatan |

## Cara membuat / merevisi video

1. Jalankan server lokal dengan **jam pura-pura** di tanggal data demo (data demo kirim Senin 19 Okt 2026):
   ```
   cd web && NODE_OPTIONS="--require $PWD/../video-panduan/lib/jam-palsu.cjs" JAM_PALSU=2026-10-19T02:40:00Z npx next dev -p 3100
   ```
2. Sekali saja: `cd video-panduan && npm i` dan `uv venv .venv && uv pip install --python .venv/bin/python edge-tts`.
3. Buat videonya:
   ```
   CHROME_BIN=<chromium playwright> node buat.mjs captain-02-jadwal-siap          # final 60 fps
   node buat.mjs captain-02-jadwal-siap --draf                                    # cepat 30 fps untuk dicek
   node buat.mjs captain-02-jadwal-siap --tanpa-rekam                             # hanya ubah narasi/tampilan
   ```
   Hasil: `keluaran/<nama>/<nama>-final.mp4` (tidak di-commit; unggah ke YouTube "Tidak publik").
4. Data demo selalu dikembalikan & akun dummy dihapus otomatis, juga kalau perekaman gagal di tengah.

## Mengganti suara (ElevenLabs / Magnific / rekaman sendiri)

Setiap pembuatan menulis `episode/<nama>/narasi.txt` (nomor + kalimat). Buat suaranya di layanan pilihan, simpan sebagai
`episode/<nama>/suara/01.mp3`, `02.mp3`, … lalu `node buat.mjs <nama> --tanpa-rekam`. Berkas di folder `suara/` selalu
dipakai lebih dulu daripada suara AI; panjang video otomatis menyesuaikan panjang tiap kalimat.
Suara AI sementara: Microsoft Edge neural `id-ID-GadisNeural`, sedikit diperlambat (jalur tidak resmi — bisa sewaktu-waktu
ditutup; berkas yang sudah jadi tetap aman di `cache/tts`).

## Musik & efek suara

- Musik: "Beautiful Dream" — Diego Nava (Mixkit #493), Mixkit Stock Music Free License (dicek 28 Okt 2026: boleh YouTube,
  media sosial, iklan online; **tidak** untuk TV/radio, CD/DVD, game). Diunduh ke `cache/` saat membuat, tidak di-commit.
- Efek suara: CC0 1.0 (`lib/sfx/LISENSI.md`). Narasi > efek > musik; musik otomatis mengecil saat narasi; target −16 LUFS,
  puncak di bawah −4 dBFS (diukur di MP4 akhir).

## Rencana episode (prioritas 28 Okt: owner & kantor dulu)

| Divisi | Episode | Status |
|---|---|---|
| Captain | 01 Pasang Tiska Ops di HP & masuk (wajah + PIN) | ⏳ |
| Captain | **02 Jadwal saya & tombol Siap** | ✅ pilot |
| Captain | 03 Berangkat, sudah sampai (foto bukti), selesai | ⏳ |
| Captain | 04 BAST: tanda tangan penerima | ⏳ |
| Captain | 05 Absen tim & DW | ⏳ |
| Captain | 06 Kalau tidak ada sinyal | ⏳ |
| Driver | 01 Masuk · 02 Jadwal & Siap · 03 Status kirim | ⏳ |
| Dapur | 01 Layar Dapur · 02 Resep & menu (kepala dapur) · 03 Kebutuhan bahan | ⏳ |
| Gudang | 01 Kebutuhan bahan → PR · 02 Belanja & foto nota · 03 Terima barang PO · 04 Stok & opname · 05 Peralatan | ⏳ |
| Kantor | Sales, Finance, Admin (16:9) | nanti |
| Owner | **01 Dashboard dari HP** ✅ · 02 Operasional Hari Ini · 03 Persetujuan harga · 04 Margin & rekap event · 05 Notifikasi HP | berjalan |
