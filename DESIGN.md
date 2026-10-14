# DESIGN — Tiska Ops

Sumber kebenaran visual. Kalau `web/` sudah punya sistem desain/komponen, **pakai yang ada** dan sesuaikan dokumen ini.

## Karakter
Bersih, modern, lembut, hangat (catering premium sejak 1980), tidak kaku, tidak "jadul 2010", tidak terlihat seperti template AI.

## Fondasi
- Font: **Plus Jakarta Sans** (judul & UI) / **Inter** (angka & tabel), fallback system-ui. **Tidak pernah serif.**
- Angka uang & tabel: `font-variant-numeric: tabular-nums`; rupiah tanpa desimal (`Rp1.250.000`).
- Warna: netral sedikit hangat; aksen utama hijau tua lembut (identitas kerja Tiska Ops di proposal: `#2f6b4f` / `#1f4d38`),
  aksen sekunder emas lembut untuk sentuhan Tiska (`#d9b56c`), aksen pastel untuk kategori (sage `#e7f1eb`, peach `#fcebdd`,
  lavender `#ece8f7`, sky `#e2eef8`, butter `#fbf3d6`, rose `#fbe5e7`). Warna semantik terpisah: hijau aman, kuning perhatian,
  merah kritis — dipakai untuk status (untung, telat, bentrok), bukan dekorasi.
- Bentuk: kartu `rounded-2xl` bayangan lembut; tombol & chip **pill**; border tipis netral.
- Logo Tiska: pakai file resmi utuh, jangan dirakit ulang. File resmi terbaru (dengan ®) di `web/public/brand/`
  (`tiska-logo-{landscape|portrait}-{emas|hitam|putih}.png`, 2000×2000 transparan, ada ruang kosong di sekelilingnya).
  Emas = ornamen tosca muda + tulisan emas (latar terang); hitam = dokumen/PDF; putih = latar gelap (layar dapur).
  Versi lama tanpa ® & versi kartu sponsorship hanya di repo arsip (`lampiran/logo/`).
  ⚠️ Warna asli logo = **emas + tosca muda**, bukan hijau tua di atas. Selaraskan palet aksen saat Fase UI pertama (catat di DECISIONS).

## Komponen & aturan
- Tidak ada kontrol native browser: dialog konfirmasi custom + toast (`sonner`), select/combobox custom, textarea custom (rich), color picker custom.
- Satu alur jelas end-to-end; halaman penuh > modal bertumpuk. Quotation Builder = halaman penuh dua kolom (isi | ringkasan & penanda).
- Status sebagai pill berwarna (Draft, Menunggu owner, Terkirim, Disetujui, DP, Lunas, Dimasak, Packing, Siap, Berangkat, Tiba).
- Tampilan exception-based: ringkasan di atas, detail di bawah; peringatan kuning/merah hanya bila perlu tindakan.
- Bahasa UI sehari-hari ("Untung per porsi", "Harga ini terlalu mepet", "Perlu dilengkapi").
- Animasi halus satu warna ≥0,8 s; hormati `prefers-reduced-motion`; tanpa kilatan warna jenuh.

## Dokumen PDF
Tiru tata letak dokumen Tiska yang ada (lihat `docs/06-DOKUMEN-QUOTATION.md`), tetapi lebih rapi: S&K terbaca, label otomatis,
kop resmi, blok rekening, tanda tangan.

## Halaman tim & layar dapur
Lihat `MOBILE.md` dan `docs/08-TIM-PWA-LAYAR-DAPUR.md`. Layar dapur: tema gelap khusus TV (kontras tinggi, angka besar, font
condensed untuk papan jadwal, aksen emas) — contoh di `lampiran/lainnya/demo-layar-dapur.html`.
