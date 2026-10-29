# 14 — Program "Ikut Pesen Menu Pesta" (Weekend / Weekday)

Status: **Tahap A–E sudah dibangun & diuji** (29 Okt 2026, D-115–D-120): usulan, cek HPP, keputusan, bahan flyer, pesanan + invoice + porsi dapur, pengiriman per alamat, laporan, form pesan online + QR, halaman "pesanan saya" + kirim bukti transfer.
Beda dengan konsep: bukti terima retail = foto per alamat (tanpa tanda tangan BAST).
Disusun dari ide kasar Rama + 3 flyer contoh (Agustus–September 2026). Jawaban tim ada di bagian 9 & 9b.
Beda dengan konsep: biaya kemasan diambil dari Angka Bisnis (satu angka per pax), bukan dari master bahan kemasan.

## 1. Inti program

Saat dapur memasak untuk pesanan besar (corporate / wedding / acara besar), Tiska membuka pesanan **retail kecil** untuk
menu yang sama: masak sekali, jual dua kali. Pembeli retail memilih **paket retail** (bukan menu event lengkap):

- **Nasi**: hanya nasi olahan dari menu acara (nasi daun jeruk, liwet, goreng, hainan, …). **Nasi putih tidak dimasukkan** ke paket
  retail — kalau acara induk memakai nasi putih, paketnya jadi lauk saja.
- **2 protein + 1 sayur** (+ pelengkap ringan: keripik kentang, lalapan & sambal).
- **Rp50.000 / pax belum termasuk PBJT** (pembeli membayar Rp55.000 per pax dengan PBJT 10%), minimal 4 pax,
  free delivery **area Bogor** (di luar Bogor harus dikonfirmasi Mba Ari dulu). Harga bisa berubah nanti → diatur di Angka Bisnis.
- Satu program biasanya punya **2–3 pilihan paket** (flyer: "the Menu" 1, 2, 3).
- Nama program mengikuti hari kirim: Sabtu/Minggu = **Weekend**, Senin–Jumat = **Weekday** (otomatis dari tanggal).

Kenapa menguntungkan: bahan dibeli dalam jumlah besar (lebih murah per porsi), dapur & gas sudah menyala, dan menunya
dikenalkan ke pasar retail yang nanti bisa jadi klien acara.

## 2. Alur dari awal sampai akhir

```
Acara besar disetujui (quotation/event sudah ada)
  └─① USULAN — Tiya tekan "Usulkan Ikut Menu Pesta" di halaman event
       pilih menu dari acara itu (nasi putih otomatis tidak ditawarkan) → susun 2–3 paket retail → batas order
  └─② CEK HPP — Pak Reza / owner buka halaman program
       sistem menampilkan HPP per pax, biaya kemasan, perkiraan ongkir, untung per pax di harga 50 rb, titik impas
       → Setujui  /  Kembalikan dengan catatan  /  Tolak dengan alasan
  └─③ DIBUKA — program "Ikut Pesen Menu Pesta Tiska Weekend · Minggu 6 Sep 2026" terbit
       tim sosmed mendapat "Bahan flyer" siap salin (menu, harga, minimal order, batas order, area, kontak admin)
  └─④ PESANAN MASUK — dua jalur: pembeli isi form online sendiri, ATAU chat admin (mis. Ida) lalu admin mencatat:
       nama, HP, alamat, paket × pax, jam terima, bayar
       sistem membuat customer + invoice retail otomatis (50 rb × pax + PBJT); total pax terlihat langsung
       alamat di luar Bogor → ditandai "perlu persetujuan Mba Ari"; pesanan setelah batas order → ditandai "telat"
  └─⑤ BATAS ORDER LEWAT — program ditutup; total pax per menu masuk ke kebutuhan dapur & daftar belanja (PR)
       bersama porsi acara utamanya, dan muncul di Layar Dapur / PO To Kitchen
  └─⑥ PENGIRIMAN — pesanan dikelompokkan per rute/area → kloter: driver, mobil, jam berangkat, urutan antar,
       surat jalan per pesanan; driver lapor "berangkat / sampai + foto" dari HP; admin & sales dapat notifikasi
  └─⑦ SELESAI & LAPORAN — berapa pesanan, pax per paket, omzet, HPP, kemasan, ongkos kirim nyata, untung bersih,
       pembeli baru vs langganan, area terbanyak; bisa dibandingkan antar program
```

## 3. Siapa melakukan apa

| Peran | Bisa |
|---|---|
| Tiya (= Tya / Septiana, akun `tya`) | Mengusulkan program dari acara besar, mengubah usulan selama belum disetujui (izin bisa diberikan ke akun lain lewat menu Izin) |
| Pak Reza (Finance), Owner | Melihat HPP & untung, **menyetujui / mengembalikan / menolak** |
| Admin (Ida) | Mencatat pesanan, status bayar, mengatur pengiriman |
| Mba Ari (Ibu Rita Ariyani, owner) | Menyetujui pengiriman ke luar Bogor; memutuskan nasib program kalau acara induk batal |
| Tim sosmed | Membaca "Bahan flyer" (tanpa HPP), menandai flyer sudah tayang |
| Dapur | Melihat total porsi per menu (tanpa harga) di Layar Dapur / PO To Kitchen |
| Driver | Jadwal antar di HP (Jadwal saya), alamat + Maps, telepon pembeli, lapor sampai + foto |

Aturan lama tetap berlaku: HPP & untung **hanya Owner & Finance**, disaring di server.

## 4. Data yang dicatat

**Program** (satu per acara induk + tanggal kirim)
- Acara induk (event/quotation), tanggal kirim, Weekend/Weekday (otomatis), nama program (otomatis, bisa diubah)
- Batas order (tanggal + jam), harga per pax (bawaan Rp50.000 belum PBJT, dari Angka Bisnis), minimal pax (bawaan 4),
  kuota maksimal pax (**opsional — sekarang tidak dipakai**, kosong = tanpa batas), area kirim (bawaan Bogor)
- Status: Usulan → Menunggu cek HPP → Disetujui (Dibuka) → Ditutup → Dikirim → Selesai · atau Ditolak/Dibatalkan (wajib alasan)
- Siapa mengusulkan, siapa menyetujui + kapan + untung saat disetujui (pola D-038)

**Paket retail** (2–3 per program)
- Isi: menu dipilih **dari menu acara induk**; nasi putih tidak ditawarkan; menu di luar acara boleh (mis. keripik kentang),
  ditandai "bukan masakan acara"
- Sistem memeriksa pola **2 protein + 1 sayur** dan **memperingatkan** kalau tidak sesuai, tanpa menolak
  (flyer 6 Sep paket 1 hanya punya 1 protein — keputusan tetap di pengusul & penyetuju)

**Pesanan retail** (banyak per program)
- Pembeli (customer baru otomatis, atau dicari dari yang sudah ada lewat nama/HP)
- Paket × pax (boleh beberapa paket dalam satu pesanan), alamat, link Maps, jam terima, catatan
- Asal pesanan (IG / WA / langganan / dari teman) — untuk tahu flyer mana yang bekerja
- Status bayar: **tidak wajib lunas sebelum kirim** — belum bayar / lunas transfer (+ bukti) / **bayar saat barang dikirim**
  (driver mencatat uang diterima di HP, lalu disetor ke Finance)
- Penanda: "telat" (masuk setelah batas order), "luar Bogor — menunggu Mba Ari" / "disetujui Mba Ari"
- Status kirim

## 4b. Form pesan online (jawaban Rama #10)

- Tiap program yang dibuka punya **link publik** (pola link pricelist `/pl/...`), mis. `tiska-ops.vercel.app/pesan/weekend-6-sep`,
  ditaruh di flyer (QR) / bio IG / dibagikan admin.
- Isi form: nama, nomor WA, alamat + titik Maps, paket × pax (minimal pax dicek), jam terima, catatan.
  Halaman menampilkan menu, harga (50 rb + PBJT), dan batas order; setelah batas order form tertutup dengan pesan
  "Hubungi admin" + tombol WA ke admin (admin tetap bisa mencatat pesanan telat). Alamat di luar Bogor tetap diterima
  dengan keterangan "ongkir & jadwal dikonfirmasi admin".
- Pesanan dari form masuk berstatus **"Baru — perlu dikonfirmasi"** ke daftar pesanan yang sama dengan pesanan admin
  (asal: "Form online"). Admin mengecek, lalu menghubungi pembeli lewat WA (tombol wa.me berisi draf konfirmasi + rekening —
  **admin sendiri yang menekan kirim**, tidak ada pesan otomatis).
- Customer dicocokkan lewat nomor WA supaya pembeli langganan tidak dobel.
- Penjaga: batas jumlah kiriman per nomor/jam (anti-spam), tanpa angka HPP di halaman publik, data pembeli hanya terlihat oleh kantor.
- Bukti transfer boleh diunggah pembeli di halaman "pesanan saya" (link unik per pesanan) — opsional, admin tetap bisa menandai lunas manual.

## 5. Cek HPP — angka yang dilihat Pak Reza

Per paket, per pax:

```
HPP menu        = jumlah HPP per porsi tiap menu (dari resep, sudah termasuk overhead 30%)
+ Kemasan       = box/thinwall, sendok, kantong (dari master bahan kemasan)
+ Ongkir/pax    = perkiraan biaya antar (bensin + fee driver per kloter) ÷ perkiraan pax
= Biaya per pax
Untung per pax  = Rp50.000 − biaya per pax        (PBJT dibayar pembeli di atas 50 rb, bukan pendapatan)
```

- Pertanyaan utama Pak Reza: **"apakah HPP masuk dengan harga 50 rb?"** — jawabannya tampil paling atas per paket.
- Ditampilkan juga **titik impas**: minimal berapa pax supaya program tidak rugi ongkir & kemasan.
- Tanda warna memakai batas untung minimum di Angka Bisnis (sekarang 30%). Di bawah batas = kuning + wajib persetujuan
  owner, **tidak diblokir** (aturan: sistem memperingatkan, keputusan milik owner).
- Menu yang HPP-nya belum lengkap (resep belum ada / status "perkiraan") ditandai jelas — angka tidak ditebak.
- **Porsi retail** bisa beda dari porsi buffet: tiap menu punya faktor porsi retail (bawaan 1×), diisi dapur sekali.

## 6. Pengiriman

Memakai mesin yang sudah ada (menu Pengiriman, kloter, surat jalan, Jadwal saya, status kirim + foto, notifikasi):

- Halaman program → tab **Pengiriman**: semua pesanan di peta/daftar, dikelompokkan per area.
  Admin membuat kloter (driver, mobil, jam berangkat) lalu menyeret/centang pesanan ke kloter; urutan antar bisa diatur.
- Peringatan bentrok kalau driver/mobil yang sama juga dijadwalkan di acara induk pada jam yang sama.
- **Satu surat jalan per pesanan** (ditandatangani penerima di HP driver, pola BAST) + rekap muatan per kloter.
- Pesanan "bayar saat kirim" tampil di HP driver dengan **jumlah yang harus ditagih**; driver mencatat uang diterima,
  Finance mengonfirmasi setoran. Pesanan belum bayar lain diberi tanda di daftar kirim (keputusan antar/tahan di admin).
- Pesanan luar Bogor tidak bisa masuk kloter sebelum disetujui Mba Ari.

## 7. Laporan

Per program:
- Jumlah pesanan & pax, pax per paket, area, sisa kuota
- Omzet, HPP, kemasan, ongkos kirim nyata (honor driver + bensin dari Daily Market), **untung bersih**, untung per pax
- Pembeli baru vs pembeli ulang, asal pesanan (IG/WA/…)

Ringkasan semua program:
- Tren per bulan, perbandingan Weekend vs Weekday, paket terlaris, program paling untung
- **Daftar pembeli retail** untuk ditawari program berikutnya — admin yang mengirim satu per satu lewat WA
  (tidak ada pesan otomatis ke klien)

Angka program ikut masuk Laporan Penjualan & Kartu Piutang yang sudah ada (invoice retail biasa), jadi tidak ada buku dobel.

## 8. Bahan flyer untuk tim sosmed

Tombol **Salin bahan flyer** menghasilkan teks persis dari data program (tanpa HPP):

```
Open Pre-Order — Ikut Pesen Menu Pesta Tiska Weekend
Pengiriman Minggu, 06 September 2026
the Menu 1: Nasi Daun Jeruk · Sate Daging Haas · Tumis Baby Buncis XO · Keripik Kentang
the Menu 2: Ayam Bakar Madu · Dori Asam Manis Saus Mangga · Tumis Baby Buncis XO
the Menu 3: Nasi Liwet Sunda · Empal/Gepuk · Pepes Tahu · Lalapan/Sambal
50K per pax (belum termasuk PBJT 10%) · Minimum order 4 pax · Free delivery area Bogor
Last order: Sabtu, 05 September 2026 jam 14.00 WIB
Pemesanan: Admin +62 813-8310-8103 (Ida)
```

Desain flyer tetap dibuat tim sosmed. Teks dari sistem mencegah angka/tanggal salah ketik
(di flyer contoh masih tertulis "MINUMUM ORDER"). Foto flyer final bisa diunggah ke program sebagai arsip.
Catatan: flyer lama menulis "50K per pax" dan "Jaksel & Bogor" tanpa keterangan pajak — dengan jawaban tim (PBJT tidak
termasuk, area Bogor), flyer berikutnya perlu menyebut "belum termasuk PBJT" supaya pembeli tidak kaget di invoice.

## 9. Jawaban tim (29 Okt 2026)

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Nasi | Nasi putih **tidak dimasukkan** ke paket; nasi olahan (nasi goreng, nasi hainan, dll.) ikut dijual |
| 2 | Harga | Selalu **Rp50.000** untuk saat ini; ke depan bisa berubah (→ Angka Bisnis) |
| 3 | PBJT | **Tidak termasuk** dalam 50 rb |
| 4 | Kuota maksimal | Belum ada (kolom opsional, kosong = tanpa batas) |
| 5 | Pengusul | **Tiya** mengusulkan menu; lalu dicek HPP-nya apakah masuk dengan harga jual 50 rb |
| 6 | Bayar | Tidak wajib lunas dulu, **boleh bayar saat barang dikirim** |
| 7 | Area | Untuk saat ini **Bogor**; di luar Bogor harus konfirmasi **Mba Ari** |
| 8 | Acara induk batal | Harus konfirmasi ke **Mba Ari** |
| 9 | Pesanan telat | Boleh, **diberi tanda** |
| 10 | Form online | Dua jalur: form online **dan** chat admin (Rama 28 Okt) |

## 9b. Pertanyaan susulan — semua terjawab 29 Okt

1. ✅ **"Mba Ari" = Ibu Rita Ariyani** (owner, akun `rita`) — dia yang menerima tombol "Setujui luar Bogor" &
   "Putuskan program saat acara batal" (Rama 29 Okt).
2. ✅ **Tiya = Tya = Septiana**, satu orang = akun `tya` (Rama 29 Okt). Izin "usulkan program" diberikan ke akun itu.
3. ✅ **Ongkir luar Bogor** setelah disetujui Mba Ari: **Delivery Fee per zona yang sudah ada** (Angka Bisnis), bisa diubah
   manual per pesanan (Rama 29 Okt, sesuai usulan).

## 10. Tahapan pembangunan (1–2 tahap per sesi)

| Tahap | Isi | Bisa dicoba |
|---|---|---|
| A | Program + paket + usulan dari halaman event + cek HPP & persetujuan + bahan flyer | Tiya mengusulkan, Pak Reza menyetujui |
| B | Pencatatan pesanan (customer & invoice retail otomatis, status bayar, kuota) + total porsi ke dapur & PR | Admin mencatat pesanan WA |
| C | Pengiriman: kloter per rute, urutan antar, surat jalan per pesanan, lapor driver | Driver mengantar dengan HP |
| D | Laporan per program & ringkasan + daftar pembeli retail | Owner melihat untung program |
| E | Form pesan online per program (link di flyer/bio IG) — masuk ke daftar pesanan yang sama | Pembeli pesan sendiri lewat link |
