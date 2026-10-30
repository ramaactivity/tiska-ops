# 15 — Foto Menu (galeri foto menu & paket)

Status: **Tahap A sudah dibangun & diuji** (30 Okt 2026, D-124). Tahap B & C belum. Keputusan Rama: hapus foto = admin & owner (Mas Bimo, Mbak Ari, Mas Reza, Rama); logo opsional; arsip Drive ±ratusan foto → unggah massal.

## 1. Masalah

Klien sering bertanya lewat chat: "Kak boleh lihat foto menu X?", "Ayam Bakar Taliwang itu kaya gimana?",
"Paket PR-06 isinya kaya apa?". Foto menu sekarang tersebar di Google Drive per folder dokumentasi event,
jadi admin harus menebak event mana yang pernah memakai menu itu, membuka folder satu per satu, lalu mengunduh.
Lama, dan foto bagus sering tidak ketemu.

## 2. Inti solusi

**Satu galeri foto yang menempel ke menu dapur** (D-122). Karena setiap menu sudah punya nama lain dan
pencarian toleran salah ketik, admin cukup mengetik nama yang ditulis klien ("ayam bakar madu", "sambel
kacang") dan langsung melihat semua fotonya, lalu mengirim ke WhatsApp dalam dua ketukan.

- Foto menempel ke **menu** (bukan ke nama). Nama lain dan menu yang digabung ikut menemukan foto yang sama.
- Foto juga bisa menempel ke **paket** (foto satu box lengkap, satu meja buffet).
- Setiap foto boleh diberi **bentuk sajian**: Box · Prasmanan / buffet · Stall · Plated · Lainnya, karena klien
  sering bertanya "kalau box-nya kaya gimana?".
- Satu foto per menu bisa ditandai **foto utama**: muncul pertama di pencarian dan dipakai di tempat lain.

## 3. Skenario pakai

| # | Siapa | Kejadian | Di aplikasi |
|---|---|---|---|
| 1 | Admin / sales di HP | Klien chat minta foto satu menu | **Foto Menu** → ketik nama (boleh salah ketik) → centang foto → **Kirim ke WA** (lembar bagikan HP berisi fotonya, kualitas utuh) |
| 2 | Admin di laptop | Sama, dari WhatsApp Web | Centang foto → **Unduh** (1 foto = JPG, beberapa = satu ZIP) |
| 3 | Admin | Klien tanya isi paket | Halaman **Paket** / **Quotation** → strip "Foto isi paket" → pilih semua → kirim |
| 4 | Admin | Klien minta banyak foto sekaligus | Pilih foto dari beberapa menu (keranjang) → **Salin link galeri** → satu link berisi foto-foto itu dengan logo Tiska, tanpa harga (tahap C) |
| 5 | Captain / dokumentasi | Selesai acara, foto masakan di HP | Halaman event atau **Unggah foto** → pilih event hari itu → foto → tandai menu (pilihan sudah dipersempit ke menu event itu) |
| 6 | Mas Reza / admin | Memindah arsip Google Drive | Laptop: seret satu folder Drive → semua foto tampil → tandai menu cepat (pilih beberapa foto sekaligus → satu menu); nama file/folder dipakai untuk menebak menunya |
| 7 | Admin / Kepala Dapur | Merapikan | Jadikan foto utama, sembunyikan foto jelek, pindah ke menu lain, ubah bentuk sajian, hapus |
| 8 | Mas Reza | Tahu menu mana yang belum punya foto | Daftar **"Menu laris tanpa foto"** (urut dari yang paling sering dijual) → jadi daftar tugas dokumentasi |
| 9 | Tim sosmed | Bahan flyer Ikut Menu Pesta | Halaman program → foto tiap paket siap unduh; form pesan online menampilkan foto menu (tahap C) |

## 4. Teknis (rekomendasi)

**Penyimpanan: Cloudflare R2**, bucket khusus Tiska Ops. Bukan Supabase Storage (kuota gratis per organisasi
pernah jebol karena media) dan bukan Google Drive (butuh Google Cloud + izin OAuth; kartu debit Bank Jago tidak
bisa dipakai billing Google).
- R2 gratis 10 GB dan **unduhan gratis** (penting: foto akan sering dikirim berulang).
- Foto dikecilkan di HP/browser sebelum diunggah: **maks 2048 px (±300–500 KB)** + **thumbnail 480 px (±40 KB)**.
  1.000 foto ≈ 0,5 GB.
- Unggah langsung dari browser ke R2 (tautan unggah sementara dari server), jadi tidak terkena batas ukuran Vercel.
- Alamat foto berupa kode acak yang tidak bisa ditebak; foto masakan bukan rahasia, jadi boleh dibuka lewat link
  (untuk link galeri klien). Foto yang disembunyikan tidak tampil di aplikasi maupun link galeri.

**Database** (aditif): tabel `menu_photos` — menu atau paket, kunci file asli & thumbnail, ukuran, bentuk sajian,
keterangan, event asal (opsional), foto utama, urutan, status tampil/disembunyikan, pengunggah, waktu.

**Google Drive:** tahap A memakai **unggah massal** dari laptop (folder Drive diunduh lalu diseret), dengan
penanda menu yang cepat. Sambungan langsung ke Google Drive (pilih folder di Drive, aplikasi menyalin) baru
dibuat kalau cara massal masih terlalu lambat — butuh proyek Google Cloud & persetujuan aplikasi dari Google.

**Akses** (TANPA harga di semua halaman foto):
- Lihat & kirim: semua peran kantor (owner, admin, sales, finance, bizdev) + Kepala Dapur.
- Unggah: kantor, Kepala Dapur, captain (dari event).
- Rapikan (foto utama, sembunyikan, pindah, tandai): semua yang boleh membuka Foto Menu. **Hapus permanen: admin & owner saja** (keputusan Rama 30 Okt).

## 5. Tahapan

| Tahap | Isi | Hasil |
|---|---|---|
| **A** | R2 + tabel; menu **Foto Menu**: cari (toleran salah ketik + nama lain), grid, unggah dari HP & laptop (banyak sekaligus), tandai menu/paket/bentuk sajian, foto utama, sembunyikan/pindah/hapus, **Kirim ke WA** / Unduh | Admin bisa langsung melayani permintaan foto |
| **B** | Unggah dari halaman event (menu dipersempit ke isi event), unggah massal arsip Drive dengan tebakan menu dari nama file/folder, strip foto di Paket & Quotation, daftar "menu laris tanpa foto" | Arsip Drive pindah, foto baru tidak tercecer lagi |
| **C** | Link galeri untuk klien, foto di form pesan online & bahan flyer Ikut Menu Pesta, (opsional) logo Tiska di foto yang diunduh | Kirim banyak foto lewat satu link; flyer & form lebih menjual |

## 6. Yang perlu disiapkan Rama

Bucket R2 baru untuk Tiska Ops (gratis): langkahnya di pesan Claude 30 Okt / HANDOVER. Kunci ditempel ke
`web/.env`, bukan di chat.

## 7. Pertanyaan terbuka

1. Siapa saja yang boleh **menghapus** foto? (rekomendasi: admin/owner, Mas Reza, Kepala Dapur; lainnya hanya sembunyikan)
2. Perlu **logo Tiska** di foto yang dikirim ke klien? (rekomendasi: opsional per kirim, tahap C)
3. Kira-kira berapa banyak foto di Google Drive yang mau dipindah? (menentukan perlu sambungan Drive langsung atau cukup unggah massal)
