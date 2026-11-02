# 17 — Program Loyalti, Database Customer, Rekanan & Vendor

Permintaan Rama 2 Nov 2026. Tiska Ops harus menangani pesanan dari yang paling kecil (perorangan beli satuan,
nasi box) sampai kelompok kecil (arisan, komunitas, intimate event) dan pesanan besar (perusahaan, organisasi,
pemerintahan; buffet, hampers, event besar) — dalam satu aplikasi.

| Tahap | Isi | Status |
|---|---|---|
| **A** | Mesin & halaman **Program Loyalti** Ikut Menu Pesta | ✅ dibangun & diuji 2 Nov (D-131) |
| **B** | **Database customer**: jenis & skala klien, kanal (event / retail), profil | ✅ dibangun & diuji 2 Nov (D-132) |
| **C** | **Rekanan pembawa klien** (EO, WO, MC, venue, dll.) + statistik + **Partner Fee** | ✅ dibangun & diuji 2 Nov (D-132) |
| **D** | **Vendor** kebutuhan (sewa mobil, alat makan, roti, bahan baku, venue, dll.) | rancangan — memperluas Supplier yang sudah ada |

## A. Program Loyalti (sudah jadi)

- **Ikut Menu Pesta → Program Loyalti.** Finance/owner membuat program; semua angka bebas diatur dan bisa
  diubah kapan saja (angka resminya belum ditentukan):
  jumlah pesanan untuk 1 hadiah · minimal belanja per pesanan (opsional) · harus terpenuhi dalam X hari
  (opsional) · hadiah (teks bebas: "Free 1 box Paket A", "Gratis ongkir", "Potongan Rp25.000") · hadiah
  berlaku Y hari sejak didapat (opsional) · mulai dihitung dari tanggal kirim tertentu. Program bisa dihentikan.
- **1 stempel = 1 pesanan Ikut Menu Pesta yang sudah LUNAS** (bukan sekadar dipesan — pesanan batal/belum
  bayar tidak dihitung). Tanggal = tanggal kirim program.
- Stempel genap → hadiah, **kartu kembali kosong** (reset). Stempel yang lewat batas waktu **gugur satu per satu**
  (jendela bergeser), jadi pelanggan tidak kehilangan semua stempel sekaligus. Hadiah lewat masa berlaku = hangus.
- Kartu tidak disimpan sebagai angka yang bisa melenceng — **dihitung ulang dari riwayat pesanan** setiap kali.
  Mengubah syarat = semua kartu dihitung ulang dengan aturan baru. Yang disimpan hanya pemakaian hadiah.
- Halaman program: kartu tiap pembeli (bulatan stempel, "2 dari 5 pesanan · lengkapi sebelum …"), saring
  **Punya hadiah / Kurang 1 pesanan / Hadiah hangus ≤ 7 hari / Semua**, **Chat WA** (draf ucapan + hadiah,
  admin yang menekan kirim), **Tandai dipakai** / **Batalkan**.
- Halaman pesanan program: chip "Loyalti 2/5" atau "🎁 Punya hadiah" + **Pakai hadiah di pesanan ini** →
  hadiah ditulis di catatan pesanan (terbaca dapur & pengantar).
- Halaman **pesanan saya** (link pembeli): kartu stempel + "Anda punya hadiah …, sebutkan ke admin".
- Belum: hadiah otomatis jadi baris Rp0 di invoice/dapur (sekarang lewat catatan pesanan); loyalti untuk pesanan
  event/corporate (aturannya bisa dipakai ulang — tinggal menambah sumber pesanan); notifikasi "hadiah hampir hangus".

## B. Database customer (sudah jadi — ringkasan D-132; "jenis pesanan" & "lama tidak pesan" belum)

Satu tabel customer untuk semua (pesanan dikenali lewat HP, data lama dipindah ke sini). Ditambah:
- **Jenis klien**: Perorangan · Kelompok / komunitas (arisan, pengajian, komunitas) · Perusahaan · Organisasi /
  yayasan / sekolah · Instansi pemerintah. Ditebak otomatis (nama berawalan PT/CV → Perusahaan, Dinas/Kementerian/
  Pemkot → Instansi; selain itu Perorangan), bisa diubah.
- **Kanal** (dihitung dari transaksi, tidak diketik): Event (quotation/invoice catering event) · Retail (Ikut Menu
  Pesta / produk saja) — satu customer bisa keduanya.
- **Profil 360°** di halaman customer: total pesanan & nilai belanja, pesanan pertama/terakhir, jenis pesanan
  (nasi box, buffet, hampers, …), kartu loyalti, piutang, rekanan yang membawanya, ulang tahun/hari jadi (opsional).
- Daftar Customer: tab per jenis + saring kanal, urut nilai belanja / terakhir pesan, "lama tidak pesan" untuk
  ditawari lagi. Impor Excel tetap jalan.

## C. Rekanan pembawa klien + Partner Fee (sudah jadi — lead bersumber Rekanan belum memilih rekanan)

- Menu **Rekanan**: nama, jenis (EO, WO, MC, Venue, Dekorasi, Fotografer/Videografer, Planner, Komunitas,
  Lainnya), PIC, HP, Instagram, rekening, **Partner Fee %** (bawaan 3,5% dari Angka Bisnis, bisa beda per rekanan), catatan.
- Customer & quotation punya isian **"Dibawa oleh rekanan"** (quotation mengikuti customer, bisa diganti per order).
  Lead bersumber "Rekanan" memilih rekanan yang sama.
- **Statistik per rekanan**: jumlah klien dibawa, jumlah order & event, omzet, nilai makanan & minuman, **Partner Fee
  terhutang / sudah dibayar**, order terakhir, peringkat rekanan teraktif.
- **Partner Fee** = % × nilai makanan & minuman (D-020; tanpa layanan, delivery, sewa alat, pajak), **siap dibayar
  setelah klien lunas** (jawaban Mas Reza, 13-PERTANYAAN-TERBUKA #14). Finance: daftar "Partner Fee siap dibayar" →
  Bayar + bukti → masuk biaya di laporan Margin event. Muncul juga di Pengingat Bayar.

## D. Vendor (rancangan)

- Memperluas **Pembelian → Supplier** yang sudah ada (tempo, rekening, PO, hutang) menjadi **Vendor**: kategori
  Bahan baku · Roti & kue · Sewa mobil · Sewa alat makan / perlengkapan · Venue · Dekorasi · Tenaga tambahan ·
  Percetakan & kemasan · Lainnya; plus PIC, HP, alamat, harga langganan/catatan, penilaian (tepat waktu, kualitas).
- Riwayat per vendor: PO, pembelian, sewa alat (Peralatan), hutang & pembayaran.
- Satu pihak bisa sekaligus **rekanan** (membawa klien) dan **vendor** (kita sewa venue-nya) — ditautkan, bukan diketik dua kali.
