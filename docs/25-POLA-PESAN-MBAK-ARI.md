# 25 — Pola pesan Mbak Ari di grup tim & peluang di dashboard

Status: analisis 27 Nov 2026 dari tangkapan layar grup **"NEW Tim Captain TISKA"** + jadwal yang ditempel Rama. Rama memilih urutan rekomendasi: **#1 Jadwal Tim ✅ D-243**, **#2 Tugaskan driver ✅ D-244**, **#3 Persiapan H-n ✅ D-245**. Rama 27 Nov: masih tahap mempelajari kebutuhan Mbak Ari — dikenalkan setelah matang. Kelanjutan `docs/23` §2 dan `docs/24`.

## 1. Jenis pesan yang berulang

| # | Pesan | Contoh | Isi | Sudah ada di aplikasi? |
|---|---|---|---|---|
| 1 | 🛎️ **KONFIRMASI NEW ORDER** (Admin / Mbak Rakhma) + gambar PO to Kitchen | Ibu Mila 27 Nov, Ibu Rethy | pemesan, HP, tanggal, **waktu acara + jenis jam** ("11.00 - Tiba di lokasi"), alamat, catatan u/ driver ("taruh di box abu2 teras depan") | Brief grup tim di Event (format Konfirmasi). **Celah:** tanggal/jam sering hanya diketik di WA (Ibu Mila: PO "Tanggal Acara: -") |
| 2 | 📌 **JADWAL PERSIAPAN MASAK + PACKING** (acara besar) | WISUDA UNPAK 25 Nov | sesi masak, batch nata bertarget, kloter + muatan | ✅ Jadwal Masak per pesanan (D-239) |
| 3 | **JADWAL PERSIAPAN ORDER BESOK** (pesanan kecil digabung) | 21, 22, 27 Nov | daftar pesanan, Sesi Masak-1/-2, nata bergiliran **per ±100 box/jam** ("100 Box pertama", "95 Box ke-2"), daftar masak bersama bertotal ("Zuppa Soup = 80", "Kambing Guling 1 ekor"), "siap delivery brkt dr Julang" / "ready to PICK-UP", catatan miring 👉🏻 | ✅ Jadwal gabungan (D-242), belum: pecah batch per 100 box & Sesi Masak-2 bertotal |
| 4 | ⚙️ **JADWAL LOADING SET UP / SERVICE [EVENT] @tempat** (H-1 & hari H) | UNPAK 24 & 25 Nov, Mandiri x BMW 21 Nov | tanggal, **[KLOTER-n] jam berangkat dr Julang**, PIC Sales TC, **Tim** bernomor (Pak Agil-PP, Yoga (PIC), Vikri…), pesan untuk Tim Driver PP, **Catatan Perlengkapan Peralatan** (warna taplak + jumlah, display kambing guling, lampu sorot, seragam), kloter tambahan (drop lauk + antar pesanan lain), barang titipan ("rangkaian bunga bisa diambil 04.00-05.00") | Sebagian: Event → Tim & kendaraan (kloter, penugasan + kendaraan, bentrok), Peralatan event, Honor & DW. **Data produksi: 0 kloter, 0 penugasan** — tim belum memakainya, semua diketik di WA |
| 5 | 📣 **To: Tim Bapak-Bapak / Perihal: Persiapan Acara X [H-6]/[H-3]** | UNPAK | daftar tugas persiapan (rapikan ruang nata, susun meja alur nata, tim DW estafet), **target harian** ("lipat box 19 Nov = 791 … 22 Nov = 1.500 · Total 3.791"), jadwal bantu tim ibu-ibu bikin kue (23-24 Nov), ‼️ UPDATE target | Belum ada |
| 6 | 🚚 **Delivery order [pelanggan]: [driver]** | Ibu Rethy: Pak Mul, 09.00 berangkat dari Julang, "minta minuman less sugar" | driver, jam berangkat, pesan khusus | Pengiriman + Delivery order PDF; driver belum pernah ditugaskan lewat aplikasi |
| 7 | Laporan lapangan | "Pesanan ibu Ina sudah sampai" + foto | status tiba + bukti | Halaman Tim (driver tekan Berangkat/Tiba + foto, `kloter_tracking`) — belum dipakai |

Pola umum: **satu acara = 4–6 pesan** (konfirmasi → persiapan H-n → loading H-1 → jadwal masak → service hari H →
laporan), sering **diedit larut malam** ("Edited 22:28"), dan banyak pesanan **hanya ada di WA** (21 Nov: Fitria
@Outentika & Ibu Ingrid-BMW tidak ada di aplikasi; 27 Nov: TekMet; Ibu Mila tanpa tanggal).

Angka yang bisa langsung dipakai mesin (M2): **nata ±100 box/jam** per tim (SPH 21 Nov: 06.00-07.00 = 100 box,
07.00-08.00 = 95 box) — cocok dengan patokan D-242 (30 mnt per ±50 porsi).

## 2. Peluang (diurutkan menurut dampak untuk Mbak Ari)

1. **Jadwal Tim: Loading set-up & Service** (pesan #4) — di Event → Tim & kendaraan: kloter + jam berangkat, tim
   (pilih nama dari daftar akun **atau ketik nama DW/freelance**, peran PIC/PP/Captain), PIC sales, catatan
   perlengkapan (dari Peralatan event + warna taplak), titipan. Tombol **Salin ke WA** format Mbak Ari persis.
   Bonus: penugasan yang sama otomatis jadi dasar **Honor & DW** (D-091) dan **bentrok jadwal** antar acara.
2. **Tugaskan driver dari Pengiriman** (pesan #6): pilih driver + jam berangkat + pesan khusus → Salin WA
   "🚚 Delivery order …"; driver menerima tugas di HP (halaman Tim) dan tekan **Tiba + foto** → dashboard & admin
   tahu tanpa menunggu chat (pesan #7).
3. **Persiapan acara besar H-n** (pesan #5): daftar tugas per hari untuk tim (Bapak-bapak / Ibu-ibu / DW) + **target
   harian** (lipat box, kue) dengan angka tercapai yang diisi dari HP; TV dapur menampilkan "Target hari ini 750 box ·
   tercapai 520"; ‼️ UPDATE = ubah target, semua melihat versi terbaru.
4. **Jadwal masak makin mirip Mbak Ari** (#3): pecah nata besar per ±100 box ("100 Box pertama / ke-2"), Sesi Masak-2
   untuk pesanan siang/sore dengan **daftar masak bertotal** ("Zuppa Soup = 80").
5. **Kelengkapan pesanan besok** (#1): pesanan harus masuk aplikasi dulu, WA keluar dari aplikasi. Papan Jadwal Masak
   sudah memperingatkan invoice tanpa tanggal (D-242); berikutnya pengingat sore "besok ada X pesanan di aplikasi —
   cocokkan dengan grup" untuk Mbak Ari.
