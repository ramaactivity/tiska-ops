# Alur isian quotation & invoice — jalan tengah kebiasaan tim & solusi aplikasi (rancangan, 18 Nov 2026)

Permintaan Rama: pelajari QUO/TC/2611/006 (diisi Mbak Rakhma) dan dokumen lain, lalu petakan alur pengisian yang lebih
efektif & efisien.

Prinsip (Rama, 18 Nov): **jalan tengah antara kebiasaan mereka dan solusi terbaik dari kita.** Kebutuhan tim (yang harus
tampil di dokumen klien, lembar dapur, laporan) jadi dasar rancangan, dan kebiasaan yang baik dipertahankan — bahasa & label
mereka sendiri, format judul "ready to serve" / "[DAY n] Hari, tanggal", layanan nominal tetap. Cara manual yang membuat
data kacau (catatan sebagai baris menu, alat sebagai menu, layanan di Biaya tambahan, tanggal diketik tangan) **tidak
dipertahankan**: tim tetap belajar alur baru, dan aplikasi mengarahkan — saat cara lama dipakai, aplikasi menunjukkan
tempatnya dan memindahkan isinya sekali ketuk.

Akar masalah (Rama): **form isian & bagiannya belum lengkap, jadi mau tidak mau semuanya diinput di Menu** — alat,
catatan, bonus, layanan, waktu saji. Data di bawah membenarkannya; rancangan §3 melengkapi tempat-tempat itu.

Sumber data: 31 quotation (24 Agu – 18 Nov 2026; Rita 14, Mbak Rakhma 12, Mas Reza 5) dan 94 invoice (30 Jun – 17 Nov;
Mas Reza 62, Mbak Rakhma 28, Rita 7) di DB produksi. Skrip analisis sekali pakai, tidak disimpan.

## 1. Bedah QUO/TC/2611/006 (Media Event CIMB Niaga x Batavia, 65 tamu)

| # | Yang diisi | Artinya | Seharusnya mendarat di |
|---|---|---|---|
| 1 | COFFEE BREAK DUPLO · 65 pax × 70.000 + 5 isi menu | menu paket | Menu ✓ |
| 2 | ANEKA STALL - SELAT SOLO · 65 pax × 40.000 | menu | Menu ✓ |
| 3 | REFRESHMENT · 1 × 550.000 + Iced Serelli Punch | minuman | Menu ✓ |
| 4 | ADDITIONAL: SET BUNGA RANGKAI · 385.000, isi "Dekor bunga simple di stall", "2 rangkai bunga simple untuk pedestal" | dekor (S&K Tiska bag. V menggolongkan vas bunga sebagai sewa peralatan) | Sewa alat & dekor, isi → catatan |
| 5 | Skirting Hitam · compliment · Qty 1 × **Pax 2** pcs · nilai 50.000 (diisi asal), isi "2 Meja (uk P 180 × L 70 × T 75 cm)" | alat, jumlah ditulis di kolom Pax, isi dipakai sebagai keterangan | Sewa alat: Qty 2, compliment, catatan |
| 6 | Centerpiece · compliment · Pax 2 · 25.000, isi "Untuk di Meja Ceremony dan Registrasi" | alat/dekor + keterangan | Sewa alat: Qty 2, compliment, catatan |
| 7 | Infused Water · compliment · 65 pax · 0 | minuman gratis — dapur tetap membuat | Menu compliment ✓ |
| 8 | NOTED: 65 pax → dibagi 2 area [55 umum – 10 VIP] | catatan operasional (porsi per area) | Baris keterangan: tercetak di tempatnya, ke lembar dapur, bukan menu |
| 9 | Biaya tambahan "Layanan Service Penyediaan dan Peralatan Buffet" 2.500.000 | layanan = minimum Jadetabek di S&K | Layanan (cara tim: nominal + keterangan sendiri) |

Akibat bila dibiarkan: baris 4, 5, 6, 8 ikut menjadi "menu" di event → layar dapur, kebutuhan bahan, dan PO to Kitchen
menampilkan "Skirting Hitam" atau "NOTED: …" sebagai hidangan. Baris 4–6 juga otomatis kena PBJT + layanan karena
diketik sebagai menu (bawaan baris menu), padahal invoice lain menagih sewa alat tanpa pajak.

## 2. Pola yang berulang di semua dokumen

| Pola | Bukti | Masalahnya |
|---|---|---|
| Layanan diketik sebagai **Biaya tambahan** berlabel bebas | 23 dari 31 quotation, 22 invoice; kolom Layanan (persen + minimum per zona) dipakai **0** quotation, 3 invoice | Bagian Layanan tidak terpakai tapi tetap harus dilewati; label panjang diketik ulang tiap dokumen; laporan tidak mengenali layanan |
| Alat & dekor diketik sebagai menu / isi paket | 3 baris di quotation (semua di QUO 832), 6 baris di 4 invoice (gelas goblet ×3, sewa meja stall, peralatan makan standar, piring disposable) + sebagai isi paket (round table VIP, taplak monogram) | Masuk dapur sebagai menu; pajaknya tidak seragam |
| **Pajak sewa alat** | Invoice (Mas Reza & Mbak Rakhma): 6 dari 6 baris sewa alat **tanpa pajak & tanpa layanan**. QUO 832: PBJT + layanan (terbawa bawaan menu). Aturan tertulis D-015 (Mas Reza): **PPN 11%**. Belum ada satu dokumen pun memakai PPN | Aturan tertulis ≠ praktik |
| Catatan diketik sebagai baris | "NOTED: …", "BONUS: Es Dawet Ireng = 50 pax", "Menu dari Luar > Disediakan Klien/EO" | Tercetak sebagai judul kelompok bernomor; masuk dapur sebagai menu |
| Bonus diketik sebagai teks, bukan centang compliment | "BONUS: …", "TOTAL BONUS", "BONUS : MORNING COFFEE-TEA SNACK" | Jumlahnya tersembunyi di nama ("= 50 pax"), dapur tidak dapat angka |
| Jumlah barang ditulis di kolom Pax | 18 baris quotation, 32 invoice (Qty 1 × Pax 2 pcs, Qty 1 × Pax 26 box) | Untuk box masih wajar; untuk alat membingungkan |
| Isi paket dipakai sebagai keterangan | "2 Meja (uk …)", "Untuk di Meja Ceremony …", "(Completed with Fresh Lemon …)" | Sudah terjawab: Catatan di bawah menu (D-208) |
| Judul kelompok = waktu saji / hari / area, ditulis tangan | "BREAKFAST [07.00 WIB ready to serve]", "MEAL ARRANGEMENT [DAY-1] DINNER; Sabtu, 24 Oktober 2026 19.00 WIB ready to serve", "RESEPSI @Hotel NOVOTEL [Minggu, 15 November 2026]" | Tiga format berbeda (Mbak Rakhma, Rita, Mas Reza), diketik ulang tiap baris; fitur Sesi (D-187) tidak dipakai |
| Pesanan berhari-hari diketik per hari | INV/TC/2611/023: 13 baris "[DAY 9] Minggu, 15 November 2026 - Lunch & Dinner Box", isi beda tiap hari; INV-2026-0071 (Rita) "DAY-1 [Sabtu, 7 Nov 2026] …"; Mas Reza "Day 1 - LUNCH BUFFET [Nusantara]" | Nomor hari & tanggal diketik manual tiap baris |

## 3. Rancangan: kebutuhan → yang dipertahankan → yang kita arahkan

| Kebutuhan | Kebiasaan yang dipertahankan | Yang kita arahkan (mekanisme aplikasi) |
|---|---|---|
| Alat & dekor ikut ditagih, dapur/tim tahu yang disiapkan | Nama alat ditulis sendiri, compliment, keterangan ukuran/penempatan ("2 meja uk …", "untuk meja ceremony") | Langkah **Sewa alat** (sudah ada): pilih dari daftar Peralatan, Qty (bukan Pax), catatan di bawah alat. **A.** Ketik alat di kotak Tambah menu → saran "Alat sewa" langsung masuk ke Sewa alat; nama bebas berbau alat/dekor → tombol "Masukkan ke Sewa alat". **B.** "Pindah ke Sewa alat" di tiap baris menu (Qty × Pax → Qty, isi → catatan). **F.** Alat tulis sendiri → "Simpan ke daftar alat" (seperti Daftarkan ke menu), katalog tumbuh dari pemakaian. |
| Catatan operasional ("65 pax dibagi 2 area"), permintaan khusus ke dapur ("sayur lebih empuk") | Ditulis bebas dengan kalimat mereka | **C.** Dua tempat catatan di langkah terakhir: *untuk klien* (tercetak di quotation/invoice) dan *untuk dapur & tim* (hanya di PO to Kitchen) — data: catatan dapur pernah tercetak di invoice klien. Baris menu berawalan "NOTED/NOTE/CATATAN/KET" → tombol "Pindahkan ke catatan" (sekali ketuk, teksnya ikut). |
| Bonus untuk klien | Kata "Bonus" | **E.** Centang compliment (sudah ada) + jumlah di kolomnya. Baris berawalan "BONUS/FREE" → tombol "Jadikan compliment" (centang otomatis, awalan dibuang, "= 50 pax" pindah ke kolom Pax) — dapur dapat angkanya. |
| Biaya layanan perlengkapan | Nominal tetap (umumnya minimum di S&K) dengan keterangan versi mereka, tercetak persis | **D.** Bagian **Layanan** diubah mengikuti itu: *nominal + keterangan*, pilihan cepat dari label & angka yang paling sering dipakai + minimum S&K (Bogor Rp1.500.000, Jadetabek Rp2.500.000, set menu Rp2.000.000); hitung dari persen jadi opsi. Ketik "Layanan…/Service…" di Biaya tambahan → tombol "Pindahkan ke Layanan". Langkah Layanan & Biaya tambahan digabung (6 langkah). |
| Waktu saji & pesanan berhari-hari, dapur tahu jamnya | Format judul "BREAKFAST [07.00 WIB ready to serve]", "[DAY 9] Minggu, 15 November 2026 - Lunch & Dinner Box" | **G.** Judul dibuat aplikasi dari pilihan cepat (Breakfast · Coffee break · Lunch · Dinner · Stall + jam; Hari ke-n + tanggal dari tanggal acara) dalam SATU format baku (sekarang ada tiga). **H.** "Salin ke hari berikutnya": nomor hari +1, tanggal berikutnya, qty & harga ikut, isi dikosongkan (menu tiap hari beda). |
| Pajak sewa alat yang benar | — (praktik tidak seragam) | Satu pilihan per dokumen di langkah Sewa alat (Tanpa pajak · PPN 11% · PBJT 10%), bawaannya sesuai jawaban Mas Reza (lihat §4). |

Arahan selalu berbentuk **tombol di tempat kejadian** (bukan larangan/galat): tim tetap bisa menyimpan, tapi satu ketukan
merapikannya — mereka belajar alur baru sambil bekerja. Ringkasan langkah form sesudahnya: Customer · Acara · Menu &
harga · Sewa alat · Layanan, pajak & biaya lain · S&K & catatan.

Sudah jalan (18 Nov): tahap 1 A+B + saklar PPN sewa alat (D-211), tahap 2 Catatan untuk dapur & tim (D-212), data lama dipindah tanpa mengubah angka (D-213, D-214), tahap 3 layanan nominal + keterangan & langkah digabung (D-215), layanan dokumen lama dipindah (D-216), tahap 4 Salin ke hari berikutnya + judul sesi bergaya tim (D-217), tahap 5 Simpan ke daftar alat (D-218); langkah Sewa alat sendiri di navigasi (D-209), catatan di bawah menu (D-208), nilai compliment tidak
tercetak (D-208), compliment di kotak Tambah (D-197), Pakai lagi (D-202).

## 4. Keputusan yang dibutuhkan (milik Rama / atasan / Mas Reza)

1. **Pajak sewa alat**: ikut praktik invoice (tanpa pajak), aturan D-015 (PPN 11%), atau PBJT seperti QUO 832? Usulan:
   satu pilihan per dokumen di langkah Sewa alat (Tanpa pajak · PPN 11% · PBJT 10%), bawaannya sesuai jawaban Mas Reza.
2. **QUO/TC/2611/006**: dirapikan ke format baru (baris 4–6 ke Sewa alat, baris 8 jadi keterangan) atau dibiarkan?
   Angkanya berubah hanya bila pajak sewa alatnya berubah (bunga 385.000: PBJT 38.500 → tanpa pajak 0 / PPN 42.350).
3. Urutan kerja. Usulan: (1) A + B + pilihan pajak sewa alat — langsung membereskan kasus QUO 832; (2) C + E catatan & bonus; (3) D layanan + gabung langkah; (4) G + H judul & hari berikutnya; (5) F simpan ke daftar alat.
