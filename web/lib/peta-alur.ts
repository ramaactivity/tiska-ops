import type { KunciMenu } from "./navigasi";

/* ==========================================================================
   PETA ALUR TISKA OPS (D-104). Murni, tanpa angka bisnis.

   Kartu = satu langkah kerja di aplikasi, diletakkan di kisi (kolom × baris);
   garis = urutan kerjanya. Teksnya mengikuti fitur yang benar-benar ada —
   ubah di sini saat alurnya berubah, halaman & panduan membaca yang sama.
   ========================================================================== */

export type Sisi = "kiri" | "kanan" | "atas" | "bawah";

export type Langkah = {
  id: string;
  kolom: number;
  baris: number;
  ikon: string;
  judul: string;
  ringkas: string;
  rinci: string[];
  peran: string[];
  href: string;
  /** Kunci izin menu tujuannya; null = semua yang masuk boleh membuka. */
  kunci: KunciMenu | null;
};

export type Sambungan = { dari: string; ke: string; sisi: [Sisi, Sisi]; putus?: boolean; label?: string };

export type Alur = { id: string; ikon: string; judul: string; langkah: string[] };

export const LANGKAH: Langkah[] = [
  // Penjualan & uang
  { id: "lead", kolom: 0, baris: 0, ikon: "💬", judul: "Lead", ringkas: "Calon klien sejak chat pertama", peran: ["Sales", "BizDev"], href: "/lead", kunci: "lead",
    rinci: ["Catat sumber (WA/IG/TikTok/rekanan), tanggal acara, pax, budget.", "Tahap: tanya-tanya → quotation → DP → final → selesai / batal (wajib alasan).", "Jadwal follow-up supaya tidak ada yang lupa.", "Tombol Buat quotation mengisi customer & data acara otomatis."] },
  { id: "quotation", kolom: 1, baris: 0, ikon: "📝", judul: "Quotation", ringkas: "Penawaran harga ke klien", peran: ["Sales"], href: "/penawaran", kunci: "penawaran",
    rinci: ["Paket box, paket pilihan buffet/wedding, atau baris custom.", "Layanan perlengkapan, PBJT, Delivery Fee terisi dari Angka Bisnis.", "Pratinjau sebelum simpan, cetak PDF/JPG, S&K standar.", "Diubah setelah terkirim = revisi -R2, riwayat tersimpan."] },
  { id: "owner", kolom: 1, baris: 1, ikon: "✅", judul: "Persetujuan owner", ringkas: "Kalau untung di bawah batas", peran: ["Owner"], href: "/penawaran", kunci: "penawaran",
    rinci: ["Untung makanan dihitung dari HPP resep (harga bahan terbaru).", "Di bawah batas Angka Bisnis → pita \"Menunggu owner\".", "Owner menekan Setujui harga ini. Peringatan, bukan rem."] },
  { id: "disetujui", kolom: 2, baris: 0, ikon: "🤝", judul: "Disetujui klien", ringkas: "OK lewat WA / telepon + bukti", peran: ["Sales"], href: "/penawaran", kunci: "penawaran",
    rinci: ["Tandai disetujui: cara persetujuan, catatan, foto/PDF bukti.", "Ditolak wajib alasan.", "Dari sini: Buat invoice dan Buat event."] },
  { id: "invoice", kolom: 3, baris: 0, ikon: "🧾", judul: "Invoice", ringkas: "Tagihan + termin pembayaran", peran: ["Sales", "Finance"], href: "/tagihan", kunci: "tagihan",
    rinci: ["Isi tersalin persis dari quotation.", "Termin: booking fee → DP → pelunasan, status terlambat otomatis.", "Batal wajib alasan; nilai tidak boleh turun di bawah yang sudah dibayar."] },
  { id: "payment", kolom: 4, baris: 0, ikon: "💰", judul: "Payment & kwitansi", ringkas: "Uang masuk dari klien", peran: ["Finance"], href: "/pembayaran", kunci: "pembayaran",
    rinci: ["Satu transfer boleh menutup beberapa invoice.", "Bukti transfer, PPh 23 bila dipotong.", "Kwitansi KWT/TC/… dengan terbilang & tanda materai otomatis."] },
  { id: "piutang", kolom: 4, baris: 1, ikon: "📞", judul: "Kartu Piutang", ringkas: "Menagih yang lewat jatuh tempo", peran: ["Finance", "Sales"], href: "/laporan/piutang", kunci: "laporan-piutang",
    rinci: ["Urutan tagih: tagih sekarang → menunggu jawaban → segera jatuh tempo.", "Draf pesan WA siap kirim (dikirim sendiri, tidak otomatis).", "Catat janji bayar & pembayaran dari satu panel."] },

  // Persiapan & hari H
  { id: "event", kolom: 2, baris: 2, ikon: "📅", judul: "Event", ringkas: "Jadwal acara tanpa harga", peran: ["Sales", "Admin"], href: "/event", kunci: "event",
    rinci: ["Dibuat dari quotation disetujui; isi per hari/sesi tanpa harga.", "Batas ubah H-5 (buffet) / H-2 (box) pukul 17.00, perubahan sesudahnya = UPDATE ke-n.", "Info lokasi, Maps, PIC di lokasi, catatan untuk tim.", "Brief Konfirmasi New Order siap salin ke grup WA."] },
  { id: "kloter", kolom: 3, baris: 2, ikon: "🚐", judul: "Kloter & tim", ringkas: "Jam berangkat, orang, kendaraan", peran: ["Admin"], href: "/event", kunci: "event",
    rinci: ["Kloter = jam berangkat dari Julang.", "Captain, driver, anggota, DW, kendaraan, tugas khusus.", "Peringatan bila orang/kendaraan bentrok di event lain.", "Delivery Order per kloter siap cetak."] },
  { id: "brief", kolom: 4, baris: 2, ikon: "📲", judul: "Jadwal di HP tim", ringkas: "Notifikasi + Siap 👍", peran: ["Captain", "Driver"], href: "/beranda", kunci: null,
    rinci: ["Jadwal 7 hari di HP: jam besar, tujuan, order, tim, 🔊 Dengarkan.", "Notifikasi \"Besok berangkat …\" pukul 17.00.", "Tekan Siap 👍; captain bisa menandai anggota.", "Masuk cukup pilih wajah + PIN."] },
  { id: "dapur", kolom: 5, baris: 2, ikon: "👩‍🍳", judul: "Dapur masak", ringkas: "Layar Dapur di TV", peran: ["Kepala Dapur"], href: "/layar-dapur", kunci: "layar-dapur",
    rinci: ["TV per dapur: Dapur Masak / Pastry & Bersih.", "Hitung mundur jam angkut + pengumuman suara 60/30/15 menit.", "Status Dimasak → Packing → Siap angkut tampil di kantor.", "Jadwal persiapan dapur siap salin di Operasional Hari Ini."] },
  { id: "kirim", kolom: 6, baris: 2, ikon: "📦", judul: "Kirim & BAST", ringkas: "Berangkat → sampai → tanda tangan", peran: ["Captain", "Driver"], href: "/beranda", kunci: null,
    rinci: ["🚐 Berangkat → ✅ Sudah sampai (wajib foto) → 🏁 Selesai.", "BAST: penerima tanda tangan di HP, nomor BAST/TC/….", "Tetap jalan tanpa sinyal — terkirim sendiri saat sinyal kembali.", "Admin & sales pemegang event dapat notifikasi."] },
  { id: "ops", kolom: 4, baris: 3, ikon: "🛰️", judul: "Operasional Hari Ini", ringkas: "Owner memantau semua kloter", peran: ["Owner"], href: "/operasional", kunci: "operasional",
    rinci: ["Event hari ini & besok + progres 6 tahap per kloter.", "Peringatan: tanpa captain, belum Siap, telat berangkat.", "Ringkasan malam / pagi / sore siap kirim WA ke owner."] },
  { id: "batal", kolom: 1, baris: 3, ikon: "↩️", judul: "Pembatalan & refund", ringkas: "Refund menurut S&K Bag. X", peran: ["Sales", "Finance"], href: "/event", kunci: "event",
    rinci: ["Batalkan event: tanggal, siapa yang membatalkan, alasan.", "Refund otomatis dari uang yang sudah dibayar (H-90 100%, H-45 70%, H-30 50%).", "Finance tandai sudah ditransfer atau jadi deposit pesanan lain."] },

  // Bahan & pembelian
  { id: "kebutuhan", kolom: 2, baris: 3, ikon: "🥕", judul: "Kebutuhan Bahan", ringkas: "Dari event + resep", peran: ["Gudang", "Kepala Dapur"], href: "/kebutuhan-bahan", kunci: "kebutuhan-bahan",
    rinci: ["Total bahan per tanggal dari semua event, tanpa harga.", "Paket buffet pilihan terurai per menu.", "Menu yang belum punya resep ditandai \"belum bisa dihitung\"."] },
  { id: "pr", kolom: 2, baris: 4, ikon: "🛒", judul: "Belanja (PR)", ringkas: "Diajukan gudang, disetujui Finance", peran: ["Gudang", "Finance"], href: "/belanja", kunci: "belanja",
    rinci: ["Daftar belanja PR/TC/… dikurangi stok yang ada.", "Gudang ajukan → Finance setujui + dana, atau kembalikan.", "Gudang tidak melihat harga perkiraan."] },
  { id: "belanja", kolom: 3, baris: 4, ikon: "🧺", judul: "Belanja pasar", ringkas: "Uang muka + foto nota", peran: ["Gudang", "Finance"], href: "/uang-muka", kunci: "uang-muka",
    rinci: ["Finance kirim dana ke pemegang (Pak Sur).", "Catat belanja di HP: jumlah × harga, wajib foto nota.", "Saldo uang muka tidak boleh minus."] },
  { id: "po", kolom: 3, baris: 5, ikon: "🏭", judul: "PO supplier & hutang", ringkas: "Pembelian tempo", peran: ["Finance", "Gudang"], href: "/po", kunci: "po",
    rinci: ["PO/TC/… → salin pesan WA supplier → dipesan.", "Terima barang (boleh sebagian) + foto surat jalan.", "Hutang jatuh tempo = tanggal terima + tempo → Finance bayar."] },
  { id: "stok", kolom: 4, baris: 4, ikon: "📦", judul: "Stok & opname", ringkas: "Masuk, pakai, hitung bulanan", peran: ["Gudang", "Finance"], href: "/stok", kunci: "stok",
    rinci: ["Masuk otomatis dari nota & penerimaan PO.", "Keluar dari Catat pemakaian, waste, koreksi.", "Opname bulanan dari HP, selisih > 5% wajib alasan, Finance finalkan."] },
  { id: "harga", kolom: 5, baris: 5, ikon: "🏷️", judul: "Harga bahan & HPP", ringkas: "Ikut nota otomatis", peran: ["Finance", "Owner"], href: "/bahan", kunci: "bahan",
    rinci: ["Harga dari nota & PO jadi harga bahan terbaru.", "HPP resep, menu, paket, dan penanda untung quotation ikut berubah.", "Kenaikan > 20% diperingatkan di Bahan & Dashboard."] },

  // Setelah acara
  { id: "absen", kolom: 6, baris: 3, ikon: "🧑‍🤝‍🧑", judul: "Absen & honor", ringkas: "Captain → Finance", peran: ["Captain", "Finance"], href: "/honor", kunci: "honor",
    rinci: ["Captain catat hadir, jam, DW di HP (tanpa angka fee).", "Finance kunci fee dari tarif → tandai dibayar + bukti."] },
  { id: "alat", kolom: 7, baris: 3, ikon: "🍽️", judul: "Peralatan kembali", ringkas: "Keluar–kembali per event", peran: ["Gudang"], href: "/peralatan", kunci: "peralatan",
    rinci: ["Bawa keluar → kembali; rusak/hilang dicatat.", "Alat milik vs sewa vendor, peringatan bila kurang.", "Nilai ganti rugi ke klien terhitung."] },
  { id: "rekap", kolom: 6, baris: 4, ikon: "📊", judul: "Rekap event", ringkas: "Biaya nyata per acara", peran: ["Finance", "Owner"], href: "/event", kunci: "event",
    rinci: ["Bahan dari nota/PO, honor terkunci, sewa alat vendor.", "Dibandingkan dengan perkiraan HPP quotation.", "Finance setujui & kirim biaya ke Margin."] },
  { id: "margin", kolom: 6, baris: 5, ikon: "📈", judul: "Margin", ringkas: "Untung per event", peran: ["Owner", "Finance"], href: "/laporan/margin", kunci: "laporan-margin",
    rinci: ["Untung nyata (dari rekap) terpisah dari perkiraan.", "Owner mengunci rekap yang sudah benar."] },
];

export const SAMBUNGAN: Sambungan[] = [
  { dari: "lead", ke: "quotation", sisi: ["kanan", "kiri"] },
  { dari: "quotation", ke: "disetujui", sisi: ["kanan", "kiri"] },
  { dari: "quotation", ke: "owner", sisi: ["bawah", "atas"], putus: true, label: "untung < batas" },
  { dari: "owner", ke: "disetujui", sisi: ["kanan", "kiri"], putus: true },
  { dari: "disetujui", ke: "invoice", sisi: ["kanan", "kiri"] },
  { dari: "invoice", ke: "payment", sisi: ["kanan", "kiri"] },
  { dari: "invoice", ke: "piutang", sisi: ["bawah", "atas"], putus: true, label: "lewat jatuh tempo" },
  { dari: "disetujui", ke: "event", sisi: ["bawah", "atas"], label: "Buat event" },
  { dari: "event", ke: "kloter", sisi: ["kanan", "kiri"] },
  { dari: "kloter", ke: "brief", sisi: ["kanan", "kiri"] },
  { dari: "brief", ke: "dapur", sisi: ["kanan", "kiri"] },
  { dari: "dapur", ke: "kirim", sisi: ["kanan", "kiri"] },
  { dari: "event", ke: "batal", sisi: ["kiri", "atas"], putus: true, label: "klien batal" },
  { dari: "event", ke: "kebutuhan", sisi: ["bawah", "atas"] },
  { dari: "brief", ke: "ops", sisi: ["bawah", "atas"], putus: true, label: "dipantau" },
  { dari: "kirim", ke: "absen", sisi: ["bawah", "atas"] },
  { dari: "kirim", ke: "alat", sisi: ["kanan", "atas"] },
  { dari: "kebutuhan", ke: "pr", sisi: ["bawah", "atas"] },
  { dari: "pr", ke: "belanja", sisi: ["kanan", "kiri"] },
  { dari: "belanja", ke: "stok", sisi: ["kanan", "kiri"] },
  { dari: "pr", ke: "po", sisi: ["bawah", "kiri"] },
  { dari: "po", ke: "stok", sisi: ["atas", "bawah"] },
  { dari: "po", ke: "harga", sisi: ["kanan", "kiri"], putus: true, label: "harga dari nota & PO" },
  { dari: "absen", ke: "rekap", sisi: ["bawah", "atas"] },
  { dari: "alat", ke: "rekap", sisi: ["bawah", "kanan"] },
  { dari: "rekap", ke: "margin", sisi: ["bawah", "atas"] },
];

export const ALUR: Alur[] = [
  { id: "penjualan", ikon: "💼", judul: "Penjualan & uang", langkah: ["lead", "quotation", "owner", "disetujui", "invoice", "payment", "piutang"] },
  { id: "persiapan", ikon: "📅", judul: "Persiapan acara", langkah: ["event", "kloter", "brief", "dapur", "ops"] },
  { id: "hari-h", ikon: "🚐", judul: "Hari H & pengiriman", langkah: ["brief", "dapur", "kirim", "ops"] },
  { id: "bahan", ikon: "🥕", judul: "Bahan & pembelian", langkah: ["kebutuhan", "pr", "belanja", "po", "stok", "harga"] },
  { id: "setelah", ikon: "📊", judul: "Setelah acara", langkah: ["kirim", "absen", "alat", "rekap", "margin"] },
  { id: "batal", ikon: "↩️", judul: "Pembatalan", langkah: ["event", "batal"] },
];

/* ---------- Tata letak & garis ---------- */

export const KARTU = { lebar: 212, tinggi: 104, kolom: 252, baris: 156, tepi: 32 };
export const UKURAN = {
  lebar: KARTU.tepi * 2 + (Math.max(...LANGKAH.map((l) => l.kolom)) + 1) * KARTU.kolom - (KARTU.kolom - KARTU.lebar),
  tinggi: KARTU.tepi * 2 + (Math.max(...LANGKAH.map((l) => l.baris)) + 1) * KARTU.baris - (KARTU.baris - KARTU.tinggi),
};

export const posisi = (l: Pick<Langkah, "kolom" | "baris">) => ({ x: KARTU.tepi + l.kolom * KARTU.kolom, y: KARTU.tepi + l.baris * KARTU.baris });

type Titik = { x: number; y: number };

function jangkar(l: Langkah, sisi: Sisi): Titik {
  const { x, y } = posisi(l);
  if (sisi === "kiri") return { x, y: y + KARTU.tinggi / 2 };
  if (sisi === "kanan") return { x: x + KARTU.lebar, y: y + KARTU.tinggi / 2 };
  if (sisi === "atas") return { x: x + KARTU.lebar / 2, y };
  return { x: x + KARTU.lebar / 2, y: y + KARTU.tinggi };
}

const mendatar = (s: Sisi) => s === "kiri" || s === "kanan";

/** Titik-titik garis siku antara dua kartu menurut sisi keluar & masuknya. */
export function titikGaris(a: Langkah, b: Langkah, [s1, s2]: [Sisi, Sisi]): Titik[] {
  const p = jangkar(a, s1);
  const q = jangkar(b, s2);
  if (mendatar(s1) && mendatar(s2)) {
    if (p.y === q.y) return [p, q];
    const mx = (p.x + q.x) / 2;
    return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
  }
  if (!mendatar(s1) && !mendatar(s2)) {
    if (p.x === q.x) return [p, q];
    const my = (p.y + q.y) / 2;
    return [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
  }
  return mendatar(s1) ? [p, { x: q.x, y: p.y }, q] : [p, { x: p.x, y: q.y }, q];
}

/** Path SVG dengan sudut membulat (radius r). */
export function pathSiku(t: Titik[], r = 12): string {
  let d = `M ${t[0].x} ${t[0].y}`;
  for (let i = 1; i < t.length - 1; i++) {
    const [a, b, c] = [t[i - 1], t[i], t[i + 1]];
    const r1 = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const masuk = { x: b.x - Math.sign(b.x - a.x) * r1, y: b.y - Math.sign(b.y - a.y) * r1 };
    const keluar = { x: b.x + Math.sign(c.x - b.x) * r1, y: b.y + Math.sign(c.y - b.y) * r1 };
    d += ` L ${masuk.x} ${masuk.y} Q ${b.x} ${b.y} ${keluar.x} ${keluar.y}`;
  }
  const z = t[t.length - 1];
  return `${d} L ${z.x} ${z.y}`;
}

/** Tempat label garis: tengah ruas paling tengah. */
export function tengahGaris(t: Titik[]): Titik {
  const i = Math.floor((t.length - 1) / 2);
  return { x: (t[i].x + t[i + 1].x) / 2, y: (t[i].y + t[i + 1].y) / 2 };
}
