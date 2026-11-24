/**
 * Daftar alat & kain gudang dari Tya (24 Nov 2026, "Daftar Alat-alat dan Kain.xlsx") → Peralatan (D-225).
 *
 *   node scripts/isi-alat-tya.mjs            coba dulu: tampilkan rencana, tidak menulis apa pun
 *   node scripts/isi-alat-tya.mjs --apply    tulis, satu transaksi
 *
 * Semua dicatat MILIK TISKA (source 'milik'), BUKAN disewakan ke klien (for_rent false) — daftar ini
 * isi gudang. Jumlah dibiarkan kosong (belum dihitung): Tya mengisinya lewat Hitung Awal di Peralatan.
 * Nama dirapikan dari salah ketik (Chaving → Chafing Dish, Coffe Earn → Coffee Urn, …); yang artinya
 * belum pasti tetap memakai nama asli dengan catatan untuk dicek. Alat yang sudah ada (Chafing Dish,
 * Napkin, Pitcher) dan nama yang sudah ada di tabel tidak ditambahkan lagi.
 * Butuh kategori dari scripts/tambah-kategori-alat.mjs.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const SUMBER = "Daftar gudang Tya, 24 Nov 2026";
const cek = (soal) => `${SUMBER}. Perlu dicek: ${soal}`;

// [nama rapi, kategori, satuan, catatan tambahan | null]   — nama asli di daftar Tya ada di komentar bila berubah.
const ALAT = [
  ["Chafing Dish Listrik", "Penghangat", "pc", null], // Chaving Dish Listrik
  ["Chafing Dish Tudung Rose Gold", "Penghangat", "pc", null], // Chaving Tudung Rose Gold
  ["Chafing Dish Gold Kecil Kaca Listrik", "Penghangat", "pc", null], // Chaving Gold Kecil Kaca Listrik
  ["Chafing Dish Kaca Bulat Besar", "Penghangat", "pc", null], // Chaving Kaca Bulat Besar
  ["Soup Tureen", "Penghangat", "pc", null],
  ["Food Warmer", "Penghangat", "pc", null],
  ["Pemanas Display Kambing", "Penghangat", "pc", null],
  ["Insert", "Penghangat", "pc", cek("wadah/insert chafing dish?")],
  ["Wadah Sendok", "Alat saji", "pc", null],
  ["Name Tag Menu", "Alat saji", "pc", null],
  ["Undakan Kayu", "Alat saji", "pc", null],
  ["Kotak Es Stainless", "Alat saji", "pc", null], // Kotak Stainless Ice
  ["Coffee Urn", "Alat saji", "pc", null], // Coffe Earn
  ["Decanter Coffee", "Alat saji", "pc", null], // Dicanter Coffe
  ["Milk Mug", "Alat saji", "pc", null],
  ["Acrylic Plate", "Alat saji", "pc", null], // Acrilic Plate
  ["Bowl Stainless", "Alat saji", "pc", null],
  ["Tray", "Alat saji", "pc", null],
  ["Tray Oval", "Alat saji", "pc", null], // Tray Ouval
  ["Jak Tray", "Alat saji", "pc", cek("jack tray / dudukan nampan?")],
  ["Bread Box", "Alat saji", "pc", null],
  ["Schall Stainless", "Alat saji", "pc", cek("arti nama")],
  ["Cintung", "Alat saji", "pc", cek("centong?")],
  ["Lap Poles", "Alat saji", "lembar", null], // kain
  ["Mangkok Condiment", "Piring & alat makan", "pc", null],
  ["Juicer", "Alat dapur", "pc", null],
  ["Water Boiler", "Alat dapur", "pc", null],
  ["Dandang", "Alat dapur", "pc", null],
  ["Dandang Kukus", "Alat dapur", "pc", null],
  ["Kompor", "Alat dapur", "pc", null],
  ["Talenan", "Alat dapur", "pc", null],
  ["Pisau", "Alat dapur", "pc", null],
  ["Microwave", "Alat dapur", "pc", null],
  ["Conveyor Toaster", "Alat dapur", "pc", null],
  ["Kain Tilem", "Alat dapur", "lembar", null], // kain
  ["Troli", "Angkut & simpan", "pc", null], // Troley
  ["Container", "Angkut & simpan", "pc", null],
  ["Cool Box", "Angkut & simpan", "pc", null],
  ["Thinwall", "Angkut & simpan", "pc", cek("wadah sekali pakai — barang habis pakai, bukan alat?")],
  ["Vas Bunga Piala", "Dekor & vas bunga", "pc", null],
  ["Vas Bunga", "Dekor & vas bunga", "pc", null],
  ["Bunga Sintetis Gantung", "Dekor & vas bunga", "pc", null],
  ["Pot Juntai", "Dekor & vas bunga", "pc", null],
  ["Rumput Sintetis", "Dekor & vas bunga", "pc", null], // Rumpuut Sintetis
  ["Sangkar", "Dekor & vas bunga", "pc", null],
  ["Barrel", "Dekor & vas bunga", "pc", null],
  ["Lampion", "Dekor & vas bunga", "pc", null],
  ["Lampu Sorot", "Dekor & vas bunga", "pc", null],
  ["Sketsel", "Meja, taplak & runner", "pc", null],
  ["Runner Meja", "Meja, taplak & runner", "lembar", null], // kain: Runner
  ["Cover Meja Tinggi", "Meja, taplak & runner", "lembar", null], // kain
  ["Cover Full Leigh", "Meja, taplak & runner", "lembar", cek("arti nama (cover meja menjuntai full length?)")], // kain
  ["Besi L Hitam", "Lainnya", "pc", null],
];
// Tidak ditambahkan karena sudah ada: Chafing Dish (#1), Napkin (#11), Pitcher (#13 Juice pitcher).

const apply = process.argv.includes("--apply");
for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  const ada = new Set((await klien.query("SELECT lower(trim(name)) n FROM equipment")).rows.map((r) => r.n));
  const kembar = new Set();
  const baru = ALAT.filter(([nama]) => {
    const k = nama.toLowerCase();
    if (ada.has(k) || kembar.has(k)) return false;
    kembar.add(k);
    return true;
  });
  const lewat = ALAT.length - baru.length;
  const perKategori = {};
  for (const [, k] of baru) perKategori[k] = (perKategori[k] ?? 0) + 1;
  console.log(`Rencana: ${baru.length} alat baru (milik Tiska, bukan sewa ke klien, jumlah belum dihitung); ${lewat} dilewati karena sudah ada.`);
  console.log(perKategori);
  for (const [nama, k, s, c] of baru) console.log(`  + ${nama} · ${k} · ${s}${c ? ` · ${c.replace(`${SUMBER}. `, "")}` : ""}`);

  if (!apply) {
    console.log("\n(coba dulu — tidak ada yang ditulis; jalankan dengan --apply)");
  } else {
    await klien.query("BEGIN");
    for (const [nama, kategori, satuan, catatan] of baru) {
      await klien.query(
        "INSERT INTO equipment (category, name, unit, notes, for_rent, source, active) VALUES ($1, $2, $3, $4, false, 'milik', true)",
        [kategori, nama, satuan, catatan ?? SUMBER],
      );
    }
    const jumlah = (await klien.query("SELECT count(*)::int n FROM equipment WHERE notes LIKE $1", [`${SUMBER}%`])).rows[0].n;
    if (jumlah < baru.length) throw new Error(`hanya ${jumlah} baris bertanda sumber, harusnya ≥ ${baru.length}`);
    await klien.query("COMMIT");
    console.log(`\n✅ ${baru.length} alat ditambahkan.`);
  }
} catch (galat) {
  if (apply) await klien.query("ROLLBACK").catch(() => {});
  throw galat;
} finally {
  await klien.end();
}
