# 10 — Hermes Agent, WhatsApp & Wiki Tiska (Obsidian / LLM wiki)

## 1. Komponen

- **Hermes Agent** (Nous Research, open-source MIT; github.com/NousResearch/hermes-agent; docs hermes-agent.nousresearch.com/docs).
  Agen dengan memori, skill, otomasi terjadwal, gateway multi-platform (Telegram, Discord, Slack, WhatsApp, Signal, email).
  Install `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash`;
  `hermes model`, `hermes whatsapp` (pairing QR), `hermes gateway setup/start/install`, `hermes doctor`. Docker: `nousresearch/hermes-agent`.
  WhatsApp memakai bridge **Baileys** (emulasi WhatsApp Web → "perangkat tertaut"); default menolak semua pesan masuk →
  atur allowlist/`dm_policy`. Ada plugin pihak ketiga (mis. chatlytics-hermes) — evaluasi bila perlu.
- **Tiska Ops API** untuk Hermes (token per peran): baca jadwal/event, status order, ketersediaan tanggal, pricelist aktif,
  buat/ubah lead, buat draf pesan, antre kirim brief (`bot_commands`), ringkasan owner. Kolom 🔒 hanya untuk token owner/accounting.
- **Wiki Tiska** di Obsidian (vault markdown; bisa disinkron ke repo/VPS) = pengetahuan **naratif**: FAQ, S&K, SOP,
  gaya bahasa admin, cara menangani situasi. **Angka (harga, jadwal, status) tidak disimpan di wiki** — selalu dari API.
- **VPS** (bukan Vercel): Hermes + worker WA + cron + backup harian DB → R2. Deploy VPS lewat skrip sendiri (PUSH ≠ DEPLOY);
  jangan restart saat klien sedang chat; rsync kecualikan folder auth/sesi WA.
- Pola antrian dari Tetra Ops: aplikasi menulis `bot_commands` (`send-grup-crew:{pesan}` dst.), bot mem-poll; brief idempoten
  dengan kunci unik; bot memanggil API dengan Bearer token (`src/lib/bot-auth.ts`); dokumen `WHATSAPP_BOT_AVAILABILITY_*.md`.

## 2. Nomor & jalur WhatsApp

- Pilihan tim: nomor **Admin Utama 0813-8310-8103** (tercantum di website & semua pricelist; di website tertulis atas nama Rita Ariyani).
- Rekomendasi: **uji coba di nomor kedua** beberapa minggu → pindah ke nomor utama setelah stabil, atau gunakan jalur resmi untuk nomor utama. WA di HP admin tetap bisa dipakai bersamaan (perangkat tertaut).
- Mitigasi blokir (jalur tidak resmi): tanpa broadcast massal, tidak memulai chat ke nomor asing, jeda balasan wajar, volume wajar, HP utama tetap aktif.
- Jalur resmi (WhatsApp Business Platform) per 1 Okt 2026 Indonesia: per pesan — service/utility ±Rp356,65, marketing ±Rp586,33, +PPN 11%, 1.000 pesan service gratis per nomor per bulan; template wajib untuk pesan pertama; tidak bisa membaca chat lama. Estimasi ±Rp500–700 rb/bulan + biaya BSP (mis. Qontak, SleekFlow, ChatMaxima $19/bln flat). Arsitektur dibuat agar ganti "colokan" saja.

## 3. Tugas untuk klien

1. Sapa & jawab FAQ (fakta dari wiki + API): minimum 25 pax/box, area Jabodetabek, dapur Bogor aman ke Jakarta (1–2 jam),
   batas pemesanan (H-30/H-14/H-3), pajak (PBJT 10%), layanan perlengkapan buffet & stall, delivery fee, test food (bisa diantar),
   menu vegetarian & custom, live cooking, fine dining, durasi layanan.
2. **Pertanyaan paling sering: minta pricelist** → tanya dulu jenis acara (wedding/kantor/keluarga/…) & lokasi (Bogor/Jakarta)
   → kirim PDF versi aktif yang sesuai dari Pustaka → catat di CRM (pricelist_sends).
3. Kumpulkan data lead: nama, jenis acara, tanggal, lokasi, jumlah pax, bentuk layanan, sumber (langsung/WO), budget bila ada.
4. Cek ketersediaan tanggal (kapasitas dapur/tim) — jawaban konservatif, konfirmasi admin untuk tanggal padat.
5. Follow-up klien yang belum membalas (draf → admin).

**Serah ke admin** (jawaban tim): **komplain, pesanan dadakan, paket rumit** — daftar final menunggu konfirmasi Mbak Rita/"Mbak Ari".
Usulan tambahan: minta invoice/dokumen resmi, nego harga/diskon, klien minta bicara dengan orang, AI ragu/di luar wiki,
klien VIP/rekanan. Admin menerima notifikasi berisi ringkasan + data terkumpul.

## 4. Tugas internal

Kirim brief & update ke grup (dari `bot_commands`), kabar status ("✅ sudah sampai"), pengingat (berangkat, belum konfirmasi,
pembayaran jatuh tempo — ke admin, bukan ke klien), ringkasan owner (malam/pagi/sore), laporan mingguan, tanya data
("event minggu ini?", "omzet bulan ini?" — hanya owner/accounting untuk angka keuangan), WA pribadi + pesan suara ke anggota tim
yang tidak memakai PWA.

## 5. Gaya bahasa

- Ikuti aturan tulisan ke klien di `CLAUDE.md` (gaya admin manusia; kalimat pendek; "Kak" secukupnya; emoji maks 1; maks 2 pertanyaan; tanpa frasa AI: "selamat menikmati", "semoga…", "sehat & sukses selalu", "Wah, seru nih", pujian pembuka).
- Sumber: **histori chat admin sejak 2022**. Cara: ekspor chat per klien dari HP admin (chat → ⋮ → Lainnya → Ekspor chat, tanpa media) → olah **sampel ratusan chat beragam** (wedding, korporat, box, komplain, nego) → rangkum ke halaman wiki "Gaya bahasa admin", "Jawaban FAQ asli", "Cara menolak nego", "Cara follow-up".
- Data chat = data pribadi klien → simpan di VPS/penyimpanan privat, bukan repo publik; anonimkan nomor saat dirangkum.
- Belajar berkelanjutan: selisih draf Hermes vs pesan yang benar-benar dikirim admin → dikumpulkan → perbaikan halaman gaya.
- Model: bot ke klien pakai model berkualitas; agen internal boleh model murah. Uji pakai model murah dulu.

## 6. Penerapan bertahap (D-010)

| Tahap | Lingkup | Syarat naik tahap |
|---|---|---|
| 1 Internal | Brief ke grup, tanya data, ringkasan owner | Brief tepat & tidak dobel 2 minggu |
| 2 Draf + persetujuan | Hermes menulis draf balasan klien; admin tap Kirim/edit | Tingkat edit admin rendah; tidak ada fakta salah |
| 3 Otomatis bertahap | Kategori aman (sapaan, FAQ, kirim pricelist) dibuka atas keputusan owner | Evaluasi berkala; harga khusus & dokumen tetap lewat admin |
Tidak ada pesan ke klien/orang luar tanpa izin (aturan Rama).

## 7. Struktur vault Wiki Tiska (usulan)

```
wiki-tiska/
  00-index.md
  profil/        sejarah, layanan (11), area, sertifikasi, kontak resmi
  faq/           pemesanan, menu & rasa, hospitality & live cooking, biaya & ketentuan (dari website + S&K)
  sk/            syarat & ketentuan per jenis layanan (sinkron dengan terms_templates)
  sop/           serah ke admin, kirim pricelist, tanggal padat, pesanan dadakan, komplain
  gaya-bahasa/   gaya admin, contoh balasan nyata (anonim), kata terlarang
  pricelist/     PETA saja (pricelist mana untuk segmen/lokasi apa) — tanpa angka harga
  internal/      cara baca brief, istilah dapur (nata, estafet, kloter), lokasi (Julang)
```
Sumber awal FAQ: website tiskacatering.com (bagian FAQ) + S&K + jawaban tim.

## 8. Keamanan

Token API per peran; rate limit; log semua pesan keluar; tombol darurat "Hermes diam" (owner/admin); tidak pernah menyebut HPP/harga beli;
tidak mengarang harga/jam/fasilitas (hanya dari API/wiki); jaga sesi WA (folder auth tidak ikut deploy/rsync, backup aman).
