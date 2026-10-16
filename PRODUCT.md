# PRODUCT.md — Tiska Ops

## Register
product

## Product purpose
Tiska Ops adalah sistem kerja internal Tiska Catering (PT. Tiska Cipta Imaji, Bogor): quotation → invoice →
payment → piutang, event & penugasan tim, dapur, dan laporan. Menggantikan kebiasaan Excel + chat WhatsApp
yang tercecer, dengan angka yang selalu sama di semua permukaan (layar, cetak, laporan).

## Users
- **Sales & F&B planner** (kantor, laptop & HP): membuat quotation cepat sambil chat dengan klien. Bukan orang IT.
- **Finance & accounting**: invoice, pembayaran, kartu piutang, margin. Teliti soal angka.
- **Owner (≈55 tahun)**: menyetujui harga, menyunting S&K, memantau operasional. Butuh huruf besar, alur jelas,
  tidak boleh "jelimet". Patokan Rama: "bos 55 tahun tidak boleh sampai kesulitan mengisi".
- **Tim lapangan & dapur (banyak 50+, literasi rendah)**: HP & TV dapur; ikon, suara, tombol besar, tanpa mengetik.

## Brand personality
Bersih, modern, lembut, tenang. Sans-serif (Inter + JetBrains Mono untuk angka). Indigo `#3b4fa8` + netral
hangat + status pastel. Terasa seperti alat kerja yang dirancang, bukan dirakit.

## Anti-references
- "AI slop": hanya bagus di mata robot, padat label kecil huruf kapital, teks bertumpuk, kartu di dalam kartu.
- Tampilan "jadul 2010", kaku, monoton.
- Kontrol bawaan browser (`<select>`, date/time native, `alert/confirm`, textarea polos tanpa gaya).
- Form yang menampilkan semua isian sekaligus tanpa urutan; angka yang tidak bisa dicocokkan pembacanya.

## Strategic principles
1. **Satu alur jelas dari atas ke bawah.** Urutan pengisian mengikuti cara orang berpikir saat membuat penawaran.
2. **Yang wajib terlihat, yang jarang dipakai disembunyikan** sampai dibutuhkan (progressive disclosure).
3. **Label dengan bahasa sehari-hari** + istilah resmi Tiska (Layanan Penyediaan Perlengkapan Buffet & Stall,
   PBJT, Delivery Fee, Partner Fee). Satu kalimat bantuan, bukan paragraf.
4. **Angka selalu bisa dicocokkan**: rumus terlihat (Jumlah × Harga = Nilai), rupiah bulat, angka tabular.
5. **Tidak ada rem otomatis atas keputusan bisnis**: sistem memperingatkan, manusia memutuskan.

## Accessibility
Teks utama ≥15px (16px di HP), target sentuh ≥40px (≥44px di HP tim), kontras cukup untuk mata 50+,
tidak mengandalkan warna saja, animasi lembut ≥0,8 s tanpa kilatan.
