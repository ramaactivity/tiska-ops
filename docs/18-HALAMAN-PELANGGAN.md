# 18 — Halaman Pelanggan (pesan online, lacak pesanan, kartu stempel) + Input order lama

Status: **KONSEP — menunggu persetujuan Rama** (10 Nov 2026). Belum ada kode.
Sumber: ide kasar Rama 10 Nov 2026 (pelanggan pesan lewat web app, dashboard sendiri ala GoFood/GrabFood,
tracking loyalti, notifikasi klaim hadiah, admin tetap bisa memproses pesanan, tombol WA pengingat) + permintaan
"input event/invoice lama dengan tanggal mundur supaya keuangan lengkap". Referensi tampilan: kartu stempel digital
gaya Onecup (lingkaran stempel, "3 lagi untuk hadiah", bilah progres) — dikirim Rama.

Prinsip dari Rama: **super sederhana** (kalau ribet, pelanggan malas), **pelanggan yang malas tetap dilayani admin**
lewat Tiska Ops, dan **halaman pelanggan tetap dibuatkan** untuk semua orang — mau dibuka atau tidak, terserah mereka.

## 1. Yang sudah ada dan dipakai ulang (bukan dibangun dari nol)

| Sudah ada | Dipakai untuk |
|---|---|
| Form pesan online per program `/pesan/<slug>` (D-119) | Langkah "Pesan" di halaman pelanggan, diisi otomatis |
| "Pesanan saya" `/pesanan/<token>` (D-120): rincian, status, kirim bukti transfer, kartu stempel | Kartu pesanan aktif & riwayat |
| Kartu stempel `kartuPelanggan` (D-131/134) + invoice lama `loyalty_pax` (10 Nov) | Kartu stempel digital |
| Status kirim driver + foto (D-117) | Progres "dalam perjalanan / sudah sampai" |
| Galeri foto menu R2 (D-124–126) | Foto menu di jadwal program |
| Tombol WA `tautanWa` (dikirim manual oleh admin, tidak ada pesan otomatis) | Semua pengingat |
| Push notifikasi tim (D-0xx) | Notifikasi ke admin saat pelanggan pesan / klaim hadiah |

## 2. Halaman pelanggan ("Halaman Saya")

**Masuk tanpa daftar, tanpa sandi.** Setiap customer otomatis punya **link pribadi** (token acak, tidak bisa ditebak),
mis. `…/saya/7f3a…`. Link dibuat sistem untuk semua customer (termasuk 61 customer hasil pindah data) — tidak ada
yang perlu "bikin akun". Admin cukup menekan **Kirim link ke WA** di halaman customer. Pelanggan bisa menyimpan
halaman ke layar HP (ikon Tiska) supaya terasa seperti aplikasi.
- Link bocor/ganti HP → admin tekan **Buat link baru** (link lama mati).
- Opsi nanti (bukan sekarang): masuk dengan nomor WA + kode. Ditunda karena menambah langkah.

Isi halaman (HP dulu, satu kolom, tombol besar):

1. **Kartu stempel** (paling atas, gaya referensi Onecup): 5 lingkaran, "2 pesanan lagi untuk hadiah · sebelum 29 Jan",
   bilah progres. Kalau hadiah tersedia → kartu berubah jadi **"Hadiah siap diklaim"** + tombol **Klaim** → pilih
   *Bonus 1 pax* atau *1 botol Serelli Tea Punch 500 ml* → tercatat, admin dapat notifikasi, hadiah otomatis menempel
   di pesanan berikutnya.
2. **Pesanan aktif** — progres ala GoFood:
   `Pesanan diterima → Dikonfirmasi admin → Dibayar → Dimasak (hari H) → Dalam perjalanan → Sampai (+ foto)`.
   Semua langkah diambil dari data yang sudah ada (konfirmasi, status invoice, kloter berangkat, lapor driver).
   Tombol: Kirim bukti transfer, Lihat invoice, Chat admin.
3. **Jadwal Ikut Menu Pesta** — program yang sedang dibuka: tanggal kirim, foto & isi tiap paket, harga, batas order
   (hitung mundur). Tombol **Pesan** → hanya memilih paket & jumlah pax; nama, WA, alamat terisi dari pesanan
   sebelumnya (bisa diubah). Satu layar, satu tombol kirim.
4. **Riwayat** — semua pesanan (termasuk invoice lama), total, status lunas, unduh invoice/kwitansi.
5. **Kontak admin** (WA) + S&K loyalti.

Tidak ditampilkan: HPP, margin, data customer lain. Halaman hanya membaca data milik pemegang link.

## 3. Sisi Tiska Ops (admin)

- **Halaman customer**: kartu "Halaman Saya" — salin link, **Kirim link ke WA**, Buat link baru, terakhir dibuka kapan.
- **Pesanan tetap bisa dicatat admin** (alur sekarang) → otomatis muncul di halaman pelanggan.
- **Data loyalti**: daftar "Hadiah siap diklaim", "Kurang 1 pesanan", "Hangus ≤ 7 hari" (sudah ada di Program Loyalti),
  ditambah **notifikasi HP ke admin** saat pelanggan mencapai 5 stempel (begitu pesanan ke-5 lunas) dan saat pelanggan
  menekan Klaim.
- **Tombol WA pengingat** (draf siap, admin yang menekan kirim — aturan "tidak ada pesan otomatis ke klien"):
  kirim link Halaman Saya · program baru dibuka · hadiah siap diklaim · kurang 1 pesanan lagi · hadiah hampir hangus ·
  pengingat bayar · pesanan sedang diantar.
- **Kirim ke banyak pembeli** (mis. program baru dibuka): daftar pembeli + tombol WA satu per satu (tanpa broadcast
  otomatis — risiko nomor WA admin diblokir).

## 4. Alur lengkap

```
Klien chat admin  ──►  admin kirim link Halaman Saya / link program (1 tombol WA)
        │
        ├─ Klien mau sendiri: buka link → lihat jadwal & menu → Pesan (pilih paket + pax) → kirim
        │                      → admin dapat notifikasi → Konfirmasi (draf WA rekening) → klien bayar & kirim bukti
        │
        └─ Klien malas: admin catat pesanan di Tiska Ops seperti sekarang  ─┐
                                                                            ▼
               Halaman Saya klien terisi otomatis: progres pesanan, riwayat, kartu stempel
                                                                            │
         Pesanan lunas → stempel +1 ── stempel ke-5 → notifikasi ke admin + kartu "Hadiah siap diklaim"
                                                       → admin tekan WA "hadiah siap" / klien klaim sendiri
                                                       → hadiah menempel di pesanan berikutnya → dapur & driver tahu
```

## 5. Input order lama (tanggal mundur) — supaya keuangan & stempel lengkap

Temuan 10 Nov:
- Form invoice, quotation, dan payment **sudah bisa diberi tanggal mundur**.
- **Cacat**: nomor dokumen diambil dari bulan *hari ini*, bukan bulan tanggal dokumen → invoice bertanggal Agustus
  bernomor `INV/TC/2611/…`. Perbaikan: nomor mengikuti bulan tanggal dokumen (`INV/TC/2608/001`).
- Mencatat satu order lama lewat alur normal = 4 langkah (quotation → setujui → invoice → payment). Terlalu panjang.

Usulan **"Input order lama"** (satu halaman, untuk order yang sudah selesai):
customer (pilih/baru) · tanggal acara · isi order (paket/menu × pax × harga, atau total saja) · PBJT ya/tidak ·
sudah dibayar (lunas/DP/belum) + tanggal & cara bayar · centang "Ikut Menu Pesta" (→ stempel loyalti).
Simpan = invoice (nomor sesuai bulan acara) + payment dalam satu transaksi; masuk Laporan Penjualan, Kartu Piutang,
dan kas di bulan yang benar. Event/kloter tidak dibuat (acaranya sudah lewat).
Banyak order sekaligus → **Impor Excel** dengan template (pola D-073), satu baris = satu order.

## 6. Tahapan (1–2 per sesi)

| Tahap | Isi | Bisa dicoba |
|---|---|---|
| 1 | Nomor ikut bulan tanggal dokumen + **Input order lama** (form) + Impor Excel order lama | Mas Reza memasukkan order Agustus–Oktober |
| 2 | **Halaman Saya** v1: link per customer, kartu stempel digital, pesanan aktif + progres, riwayat; kartu link + tombol WA di halaman customer | Admin kirim link ke 3 pelanggan |
| 3 | Pesan dari Halaman Saya (jadwal program, isian otomatis) + **Klaim hadiah** + notifikasi admin + tombol WA pengingat | Pelanggan pesan & klaim sendiri |
| 4 | (berikutnya) Event biasa: minta penawaran dari Halaman Saya → masuk Lead | — |

## 7. Pertanyaan untuk Rama

1. Masuk cukup dengan **link pribadi** (paling sederhana), atau perlu PIN/kode WA?
2. Order lama Agustus–Oktober tercatat di mana (Excel, catatan WA, buku)? Menentukan form vs impor Excel.
3. Alamat web: tetap `tiska-ops.vercel.app/saya/…`, atau domain sendiri yang lebih meyakinkan untuk pelanggan
   (mis. `pesan.tiskacatering.com` — perlu cek domain yang sudah dimiliki; kalau beli baru, biaya keputusan Rama).
