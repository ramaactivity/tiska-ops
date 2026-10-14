# 07 — Brief ke Grup Tim (format asli + template sistem)

Grup WA saat ini: **"NEW Tim Captain TISKA"** dan **"NEW Tim Kitchen TISKA"**. Pengirim: Mbak Rita (owner), Admin Tiska
(Mbak Ariz/Rakhma). Screenshot: `lampiran/screenshot-wa/brief-01..10.png`, konfirmasi driver `konfirmasi-driver-01..03.png`.

Prinsip generator brief:
- **Format sama persis** dengan kebiasaan sekarang (emoji, `*tebal*` WA, garis pemisah, urutan blok) — tim tidak perlu adaptasi.
- Data dari event; teks bebas (mis. "Mbaa… nitiiip dimasak gurih enak muantaaaaaap yaa 😉") = field `catatan_personal` opsional.
- Brief tim **tidak pernah** memuat harga apa pun. Lembar dapur pengganti screenshot quotation yang dicoret.
- Satu entitas = satu cerita: angka sama di brief, aplikasi, layar dapur.
- Idempoten: kunci `(event, jenis, versi)` mencegah kirim dobel. Update = "‼️ UPDATE ke-n" berisi **perubahan saja**, merujuk brief asli.
- Pratinjau → edit → kirim (via `bot_commands` → Hermes/worker WA) → log + tombol "Siap 👍" di PWA.
- Nomor HP klien di contoh di bawah disamarkan.

---

## 1. 🛎 Konfirmasi New Order (Kitchen + Captain)

Contoh asli (box, multi-hari):
```
🛎 *KONFIRMASI NEW ORDER: TISKA CATERING*

*Nama Pemesan:* bapak Eris Riswan
*HP:* 0811-xxxx-1970
*Hari/Tanggal Acara:* Minggu, 04 Oktober 2026
*Waktu Kirim:* 10.30 WIB - *Tiba Di Lokasi*
*Alamat Lokasi kirim:*
*PONDOK INDAH GOLF BALLROOM*
JALAN METRO PONDOK INDAH - JAKARTA SELATAN
-------------------------------
*ORDER:* *DAY* 1️⃣

*Mbaa... nitiiip dimasak gurih enak muantaaaaaap yaa* 😉

*Pukul 10.30 - Tiba dilokasi*
🍱 *BASIC LUNCH BOX - IKAN DORI SAMBAL MATAH* = *56 BOX* --> *PAKAI BOX COKLAT*
Menu:
1. Nasi Putih
2. Ikan dori sambel matah
3. Bakwan sayur
4. Lalapan

*Pukul 15.30 - Tiba dilokasi*
🍱 *BASIC LUNCH BOX - AYAM PANGGANG* = *125 BOX* --> *PAKAI BOX COKLAT*
Menu:
1. Nasi Putih
2. Ayam panggang
3. Sambal terasi
4. Lalapan
```
Contoh asli (multi item, PIC, kemasan & vendor luar):
```
🛎️ *KONFIRMASI NEW ORDER @TISKA CATERING*

*Nama Pemesan:* Ibu Usi
*PIC:* Ibu Tinne (ex. Mesco)
*HP:* 0877-xxxx-3022
*Acara:* Kajian Rutin Senin
*Hari/ Tanggal Kirim:* Senin, 5 Oktober 2026
*Waktu Kirim:* 06.00 WIB brkt dr Julang
*Alamat Kirim:*
MT. Riyadhul Jannah
Mesjid Nurul Wathon
Pakansari, Cibinong
-----------------------------
*ORDER:*
🥐 *SNACK BOX (Coklat) 12x12 = 750 box* 👉🏻 tempel sticker logo T kecil
1. Arem-arem kentang-wortel 👉🏻 spt kemarin
2. Roti Coklat (besarin dikit) 👉🏻 dr MEY Bakery

🍱 *PREFERRED LUNCH BOX 26x20 [PR-15]; Nasi Krengsengan Daging = 75 box*
1. Nasi Gurih
2. Krengsengan Daging Sapi
3. Telur Pindang
4. Sambal Gr. Ati-Kentang
5. Sayur Acar Kuning
6. Emping
7. Sambal Terasi
8. Peach Puding (cup pasar)
9. Es Teh Sereh 120ml
```
Contoh asli (workshop multi-hari, CB/LB, pax per hari):
```
🛎️ *KONFIRMASI NEW ORDER @TISKA CATERING*

*Nama Pemesan:* Ibu Lucya Yamin (CIFOR)
*HP:* 0812-xxxx-940
*Acara:* 4 hari Workshop
*Hari/ Tanggal Acara:*
📆 Senin, 5 Okt 2026
📆 Selasa, 6 Okt 2026
📆 Rabu, 7 Okt 2026
📆 Jumat, 9 Okt 2026
*Waktu Acara:* 2x Coffee Break (CB) + 1x Lunch Break (LB)
⏰ 08.30-09.00 Morning CB
⏰ 12.00-13.00 Lunch Break
⏰ 14.30-15.00 Afternoon CB
*Alamat Lokasi Acara:*
Kantor HQ CIFOR, Bogor
1. Coffee Break 👉🏻 depan Rg. Amazon
2. Lunch Break 👉🏻 Cafetaria
-----------------------------
*ORDER: sesuai Tabel Menu*
👉🏻 menyusul

📆 Senin, 5 Okt 2026
👥 45 pax Regular
👥 3 pax Vegetarian
—————————————
📆 Selasa, Rabu & Jumat, 6,7 & 9 Okt 2026
👥 35 pax Regular
👥 3 pax Vegetarian
```
Contoh asli (diambil klien, pilihan menu):
```
🛎️ KONFIRMASI NEW ORDER @TISKA CATERING

ORDER an: Ibu Elsa (Pocari Sweat)
HP: 0821-xxxx-0886
Hari/Tanggal Ambil: Rabu, 14 Oktober 2026
Waktu Ambil: 10.00 WIB
Alamat Ambil:
TISKA Catering
————————————
ORDER:
🍱 PREFERRED LUNCH BOX 26x20 [PR-23]; Nasi Sate Udang Bakar Madu = 12 box
👉🏻 pilihan:
8. Peach puding (cup pasar)
9. Es Lemon Tea 120ml
```
(Kartu PR-23: Nasi Putih, Sate Udang Bakar Madu, Daging Lada Hitam, Dori Tar-tar, Sapo Tahu, Bakwan Jagung, Kerupuk, Buah/Puding*, Es Lemon Tea/Es Teh Sereh*. `*` = pilihan klien.)
Varian: "KONFIRMASI NEW [Repeat] ORDER" untuk repeat order (mis. Say Hello, Lasagna Personal 10 loyang). Alamat ambil bisa "OUTENTIKA by Tiska Catering" (⚠️ tanyakan).

**Template sistem** — field: judul (+[Repeat]), pemesan, PIC, HP, acara, hari/tanggal (atau daftar tanggal), mode waktu
(`Tiba di lokasi` / `brkt dr Julang` / `Ambil`), alamat (+ titik di venue), pembatas, per hari (`DAY n` keycap emoji) →
per jadwal (`Pukul HH.MM - Tiba dilokasi`) → item: emoji kategori (🍱 box, 🥐 snack, 🍲 buffet…), NAMA PAKET [kode]; hero = qty unit
--> kemasan/catatan, daftar menu bernomor, pilihan `*`, catatan vendor; pax regular/vegetarian per hari; catatan personal.

## 2. 📋 Pre-info Order (Kitchen) — sebelum final
```
PRE-INFO ORDER: Event TELKOM LANDMARK - JKT
📆 Kamis, 15 Okt 2026
⏰ [KLOTER-1] 07.00 WIB: Snack Box tiba di lokasi
⏰ [KLOTER-2] 11.00 WIB: Buffet & Stall ready to serve
📝 Detail info lainnya = tbc
```
+ gambar quotation yang harganya dicoret manual → **diganti lampiran "lembar dapur" tanpa harga** (sudah ada di aplikasi: `components/dokumen-dapur.tsx`).

## 3. ‼️ Update order (balasan ke brief asli)
```
‼️ Ibu Fanny tambah order:
🥗 Asinan Buah (homemade) = 30 pax 👉🏻 utk di Rg. VIP
```
```
‼️ Update Info Pengurangan Menu BSI sbb [penggunaan alat tlg disesuaikan]:
1. Roti Unyil (Rasa coklat) = 50 pcs 👉🏻 jadi ✅
2. Ikan Balita yg kosong; tidak usah ada pengganti
```
```
‼️ 🚐 [Update]Delivery order Ibu Mesi/ Amelia SIG: Pak Agil & Agus…
```
**Template sistem**: `‼️ *UPDATE ke-<n>* — <nama event>` + daftar perubahan (tambah/kurang/ganti/stok kosong/ubah jam/ubah tim), catatan alat yang perlu disesuaikan, rujukan brief asli. Di aplikasi, bagian yang berubah ditandai kuning.

## 4. ⚙️ Jadwal Tim Service [H] (Captain)
```
⚙️ *JADWAL TIM SERVICE [H]: IBU MAHYA-BSI Pajajaran*

📆 *Jumat, 2 Oktober 2026*
*PIC EO:* Luthfi/ Diah (Dimensio EO)
⏰ *[KLOTER-1] 05.00 WIB berangkat dr Julang* sekalian bawa menu Breakfast/ Sarapan + Snack Plating (Roti Unyil & Pastel)
💁🏻‍♂️ *Tim:*
1. Pak Nung (Luxio) 👉🏻 ambil bunga
2. Pak Agil (Grand Max) pp
3. Yoga (PIC)
4. Pak asep
5. Pak Sukir
6. Pak Agus
7. Vikri
8. Pak Daud (Steward - itung alat piring2 dan sendok )
———————————————
⏰ *[KLOTER-2] 06.00 WIB berangkat dr Julang* 👉🏻 spy dpt lift keatas; sbelum karyawan masuk
💁🏻‍♂️ *Tim Delivery Lauk:* Pak Agil
-----------------------------
🌻 *Rangkaian bunga Buffet = 1 set 👉🏻 bisa diambil jam 06.00 pagi*
```
```
⚙️ *[Update] JADWAL SET UP & SERVICE [IBU FANNY-SICC]*

📆 *Sabtu, 3 Okt 2026*
⏰ *[KLOTER-1] 06.00 WIB berangkat dr Julang*
*PIC SICC:* Mba Rini
📱 0896-xxxx-0400
💁🏻‍♂️ *Tim Set-up:*
1. Pak Mul (Luxio) 👉🏻 ambil bunga
2. Pak nung (Grand max) pp
3. Pak sukir (PIC)
4. Yoga
5. Pak asep
6. Pak Iwan
7. Vikri
8. Pak Agus ( Steward - itung alat piring2 dan sendok )

📌 *Catatan Perlengkapan Alat Pemanas VIP:* pake pemanas listrik tembaga bulat
——————————————-
⏰ *[KLOTER-2] 09.00 WIB berangkat dr Julang*
💁🏻‍♂️ *Tim Delivery Lauk:* Pak nung
-----------------------------
🌻 Rangkaian bunga buffet = 1 set (1 set bekas BSI masih bisa dipake) 👉🏻 bisa diambil jam 06.00 pagi
```
Field: klien-event, tanggal, PIC klien/EO + HP, kloter (jam berangkat dari Julang, apa yang dibawa, alasan jam), tim
(nama + kendaraan + peran: PIC, steward, delivery lauk, tugas khusus), catatan perlengkapan, bunga (jumlah, reuse, jam ambil).

## 5. 👩🏻‍🍳 Jadwal Persiapan Order Besok (Kitchen)
```
*JADWAL PERSIAPAN ORDER BESOK:*
📆 *Jumat, 2 Oktober 2026*
1. Ibu Mahya-BSI Pajajaran
2. Say Hello
---------------------------
👩🏻‍🍳👨🏻‍🍳 *Sesi Masak BSI:*
⏰*03.00-04.30:* Estafet siap masak + matang
⏰*04.30-05.00:* Nata + packing menu Sarapan + Snack Plating
⏰ *05.00:* Siap brkt dr Julang
------------------
👩🏻‍🍳👨🏻‍🍳 *Sesi Masak Menu Brunch BSI:*
⏰*03.00-05.30:* Estafet siap masak + matang
⏰*05.30-06.00:* Nata + packing menu Nasi Liwet Sunda
⏰ *06.00:* Siap brkt dr Julang
------------------
👩🏻‍🍳👨🏻‍🍳 *Sesi Masak Say Hello:*
⏰*06.00-09.00:* Estafet siap masak + matang + packing
⏰ *09.00:* Siap brkt dr Julang
```
```
JADWAL PERSIAPAN ORDER BESOK:
📆 Rabu, 14 Oktober 2026
1. Mba Reka-Telkomsat
2. Mba Elsa-Pocari
---------------------------
👩🏻‍🍳👨🏻‍🍳 Sesi Masak-1; Mba Reka Telkomsat:
⏰04.30-06.30: Estafet siap masak + matang
⏰06.30-07.00: Nata + packing Doclang & Tampah
⏰ 07.00: Siap brkt dr Julang
---------------------------
👩🏻‍🍳👨🏻‍🍳 Sesi Masak-2; Pocari:
⏰07.00-09.30: Estafet siap masak + matang
⏰ 09.30-10.00: Siap nata & packing 12 box
⏰ 10.00: Ready to pick-up + Invoice
```
Dibuat otomatis tiap sore dari event besok, **per dapur** (Masak/Pastry), jam dihitung mundur dari jam berangkat
(packing ±30 menit; durasi masak default per jenis — patokan belum ada, Kepala Dapur menyesuaikan).

## 6. 📌 Tugas driver di luar event (Captain)
```
📌 *Jadwal Pak Mul @<tag> besok:*
📆 Jumat, 2 Oktober 2026
⏰ 09.30 WIB brkt dr Julang
🚗 Antar keluarga owner ke Kelapa Gading
```

## 7. ✅ Konfirmasi driver (dari lapangan → kini via tombol PWA)
Contoh caption di grup: "Pesanan Pocari sweet sudah diambil", "Invoice telkomsat sudah diterima....", "Pesanan sudah diterima...",
"Lunch box sudah sampai", "Lasagna sudah sampai" + foto penerima (security/staf klien). Sistem: tombol → kamera → otomatis
posting ke grup "✅ <item> sudah sampai · <jam> · <driver>" + foto selama masa transisi.

## 8. Pesan pin grup
"📣 PENGUMUMAN KEBIJAKAN BARU PER OKTOBER 2026 Perihal: Penyamaan Penggunaan Rekening…" → fitur Pengumuman (PWA + ticker layar dapur).
