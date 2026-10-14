# 08 — Halaman Tim (PWA), Tracking, Bukti Kirim, Layar Dapur

## 1. Pengguna & kondisi nyata

- Tim lapangan, dapur, driver, gudang: banyak **usia 50+**, **gaptek**, sebagian **tidak lulus SD / tidak sekolah** (tidak lancar membaca).
- HP: banyak Android lama/murah, memori penuh. Sinyal lemah di basement/lift venue.
- Aplikasi harus bisa dipakai **tanpa membaca panjang dan tanpa mengetik**.

## 2. Keputusan teknis

- **PWA dulu** (D-011): ±1–3 MB, tanpa Play Store, auto-update, offline untuk brief hari ini. Native hanya bila PWA terbukti kurang (notifikasi tidak andal / butuh lokasi latar).
- Service worker: push + cache brief/tugas hari ini (Tetra Ops hanya push; Tiska perlu offline juga). Mahakan memakai Serwist (`next build --webpack`) — pilih pendekatan setelah cek kompatibilitas Next 16 di repo.
- Push: `web-push` + VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), tabel `push_subscriptions` (pola Tetra Ops `src/lib/push/web-push.ts`).
- iPhone: push hanya bila **ditambahkan ke Layar Utama** & iOS ≥16.4. Android hemat baterai (Xiaomi/Oppo/Vivo) bisa menunda → panduan pengecualian saat pemasangan.
- Login: admin memasangkan sekali; sesi panjang. Login ulang = **pilih foto wajah + PIN 4–6 angka** (bukan email/password).
- Antrian offline untuk aksi (status, foto) dengan `client_ref_id` anti-dobel (pola Mahakan).

## 3. Prinsip desain untuk tim (aturan utama, bukan tambahan)

1. **Gambar & warna dulu**: ikon yang sudah dikenal dari grup WA (⏰ jam, 📍 alamat, 🍱 order, 👉🏻 tugas, 🌻 bunga, 🚐 mobil), foto menu/kendaraan/wajah rekan. Angka penting besar (**05.00**, **56 BOX**).
2. **🔊 Dengarkan** di setiap brief/tugas: Text-to-Speech bahasa Indonesia (Web Speech API, `lang=id-ID`; suara bawaan HP). Teks untuk suara ditulis terpisah agar alami ("Jumat, dua Oktober. Berangkat jam lima pagi dari Julang. Kamu bawa Grand Max.").
3. **Satu layar, satu hal**: beranda menjawab *hari ini ke mana, jam berapa, bawa apa*. Tombol ≥ 48px, maks 2–3 tombol per layar, tanpa menu bertingkat, tanpa istilah asing.
4. **Tanpa mengetik**: semua aksi tombol (Siap 👍, Berangkat, Sudah sampai, Selesai); kendala = 🎤 rekam suara / 📷 foto.
5. **Notifikasi jelas**: bunyi khas Tiska; diulang bila belum "Siap"; captain diberi tahu bila anggota belum konfirmasi.
6. **Jaring pengaman**: yang belum bisa pakai aplikasi tetap dapat jadwal via WA pribadi dari Hermes (bisa pesan suara); captain boleh konfirmasi atas nama anggota.
7. Ikuti `DESIGN.md` & `MOBILE.md` (480px kolom, bottom nav, input ≥16px, safe-area). Animasi lembut, tanpa kilatan.
8. **Tanpa harga apa pun** di halaman tim.

Validasi: uji dengan 3–5 orang asli (captain, dapur, driver) sebelum rilis; pemasangan didampingi; panduan video 30 detik bersuara; rilis bertahap (captain → dapur → semua).

## 4. Beranda per peran

| Peran | Isi |
|---|---|
| Captain | Tugas hari ini & besok, kloter + jam berangkat, tim yang dipimpin (foto), PIC klien + tombol telepon, alamat + Maps, perlengkapan, checklist hari-H (berangkat, setup, serving, clear-up, alat kembali), catat DW, BAST tanda tangan klien |
| Dapur Masak / Pastry | Jadwal persiapan dapurnya, sesi masak, menu + jumlah + kemasan, resep & takaran, catatan khusus ("besarin dikit", "box coklat"), tombol Dimasak/Packing/Siap |
| Kepala Dapur | Kedua dapur + edit jam sesi masak + lengkapi resep |
| Driver | Jadwal antar & tugas non-event, kendaraan, alamat + Maps, tombol Berangkat/Sampai (kamera) |
| Gudang & Purchasing | Daftar belanja (PR), catat belanja (Daily Market), terima barang, alat keluar–kembali, opname |
| Semua | Absen, jadwal, pengumuman, profil |

## 5. Tracking order

Status per order/kloter: `dimasak` (dapur) → `packing` (dapur) → `siap` (dapur) → `berangkat` (driver) → `tiba` (driver, foto) /
`diambil` (admin/dapur, foto) → `dokumen_diterima` (foto tanda terima invoice). Status tersebar realtime ke HP admin, captain,
sales, layar dapur. Peringatan: 15 menit sebelum berangkat belum "siap" → merah di TV + notifikasi admin.
Opsional (izin admin): link pelacakan untuk klien ("Pesanan sedang dikirim, perkiraan tiba 10.30").

## 6. Bukti kirim (proof of delivery)

Tombol **✅ Sudah sampai** → kamera → foto penerima/pesanan. Otomatis: jam, lokasi (bila diizinkan), driver. Nama penerima via
🎤 suara (opsional). Foto dikompres di HP; disimpan offline & terkirim saat ada sinyal. Dampak: status order berubah,
notifikasi admin & sales ("✅ Lasagna (Mesi/Amelia SIG) sampai 09.28 · Pak Agus" + foto), invoice "diterima klien" → jatuh tempo
piutang, bukti bila komplain, rekap ketepatan waktu, posting otomatis ke grup WA selama transisi. Kabar ke **klien** hanya
bila dinyalakan per order / disetujui admin.

## 7. Layar Dapur (TV + speaker)

Demo: `lampiran/lainnya/demo-layar-dapur.html` (MVP visual, data contoh, waktu dipercepat, suara via speechSynthesis).
Isi: header "Dapur Tiska" + jam besar + tanggal; kartu order hari ini (urut jam berangkat; isi & jumlah besar; hitung mundur;
stepper Dimasak → Packing → Siap → Berangkat → Tiba; merah bila mepet); papan "Jadwal angkut" ala bandara (jam, order, armada,
status chip); "Pengumuman terakhir"; ticker pengumuman berjalan; overlay **Panggilan dapur** ala loket (ding-dong + teks besar + suara).
Pengumuman otomatis (contoh): mulai masak; 15 menit lagi nata & packing; armada berangkat 15 menit lagi — bawa ke area muat;
pesanan diambil klien 15 menit lagi — siapkan pesanan & invoice; sudah berangkat.
Per dapur (Masak / Pastry) bila dua TV. Tanpa harga. Mode kiosk layar penuh, wake lock, auto-reconnect, realtime (Supabase realtime / polling).
**Nyala/mati otomatis**: nyala 30 menit sebelum sesi masak pertama, mati 30 menit setelah order terakhir berangkat; tidak menyala
bila tidak ada order. Cara: smart plug Wi-Fi (TV di-set "power on saat listrik masuk") dan/atau TV box Android + HDMI-CEC; speaker
lewat smart plug. Perlu data: merek/tipe TV, Wi-Fi dapur. Suara: bawaan TV box (Google TTS id) → opsi suara AI natural / rekaman
suara orang Tiska untuk kalimat baku. Status MVP: "keep dulu, disempurnakan nanti".

## 8. Fee DW (oleh captain)

Captain: "+ Tambah DW" (nama, HP, peran: waiter/clear-up/kitchen; pilih dari daftar DW lama) → hadir/tidak + jam datang–pulang →
"Kirim ke Finance". Fee dari tabel tarif (karyawan vs freelance, angka belum ada) + catatan; angka akhir dikunci Pak Reza →
transfer → "Sudah ditransfer" + bukti → (opsional) kabar WA ke DW. Fee = biaya event. DW tidak perlu login.
