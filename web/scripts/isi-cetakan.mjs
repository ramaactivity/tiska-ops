/**
 * Isi katalog Cetakan dari 14 desain Canva Rama (D-182). Gambar = ekspor JPG Canva (diunduh Claude ke folder lokal).
 *
 *   node scripts/isi-cetakan.mjs <folder-gambar>            # DRY-RUN: tampilkan rencana
 *   node scripts/isi-cetakan.mjs <folder-gambar> --apply    # unggah gambar ke R2 + tulis DB (satu transaksi)
 *
 * Aman diulang: cetakan dikenali dari canva_design_id, varian dari (item_id, name); yang sudah ada dilewati.
 * Harga per A3 dari nota Oke Print (docs/19 "Alur & harga Oke Print").
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { AwsClient } from "aws4fetch";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const folder = process.argv[2];
const terapkan = process.argv.includes("--apply");
if (!folder || !existsSync(folder)) throw new Error("Folder gambar tidak ditemukan.");

const BW = "BW Carton";
const CG = "Sticker Chromo glossy";
// [canva id, shortlink, nama, grup, jenis, lebar mm, tinggi mm, bentuk, bahan, finishing, isi/A3, harga/A3, asal harga, judul chat, ukuran chat, catatan, varian[[nama, halaman]]]
const DATA = [
  ["DAG-d7OxKs0", "ttnkhmu0qzxndug", "Nama Menu Kecil", "nama_menu", "pesanan", 110, 66, "persegi", BW, "Potong", 12, 8500, "Nota Oke Print 26245 & 29653", "Nama Menu 11x6,6cm", "11x6.6 cm", "Satu nama menu dicetak 1 pcs (atau sesuai jumlah set). Huruf: Grand Cru M.", []],
  ["DAG9nMtVBY8", "g5c50xfcj7a57vy", "Nama Menu IKEA 10×15", "nama_menu", "pesanan", 100, 150, "persegi", BW, "Potong pas ukuran", 4, 8500, "Nota Oke Print 28270", "Nama Menu 10x15cm", "10x15 cm", null, []],
  ["DAHAhpoJ-gA", "645pd4h21k9nc08", "Nama Menu Wide 10×29", "nama_menu", "pesanan", 290, 100, "persegi", BW, "Potong pas ukuran", 4, null, null, "Nama Menu Wide 10x29cm", "10x29 cm", "Bahan belum pernah tercatat di chat — cek sebelum pesan.", []],
  ["DAHIA-klWpA", "pye7bgqzml4m5sm", "Kartu Ucapan Square 8×8", "kartu_ucapan", "pesanan", 80, 80, "persegi", null, "Potong pas ukuran", 15, null, null, "Kartu Ucapan 8x8cm", "8x8 cm", null, []],
  ["DAHIBWnIJy0", "7d9ydp24d84hqrh", "Kartu Ucapan Landscape 9×5,5", "kartu_ucapan", "pesanan", 90, 55, "persegi", null, "Potong pas ukuran", 21, null, null, "Kartu Ucapan 9x5,5cm", "9x5.5 cm", null, []],
  ["DAHEE_9WMQI", "pl10fesh37j345g", "Kartu Ucapan 7×11", "kartu_ucapan", "pesanan", 70, 110, "persegi", null, "Potong pas ukuran", 12, null, null, "Kartu Ucapan 7x11cm", "7x11 cm", null, []],
  ["DAHDD0vdUxE", "8w7gy3ty7y1c0x3", "Kartu Ucapan Hampers (internal)", "kartu_ucapan", "pesanan", null, null, "persegi", null, null, null, null, null, null, null, "Desain internal untuk hampers; ukuran cetak belum tercatat.", []],
  ["DAG_BHBl6CM", "9t0novkj3tdigjj", "Stiker Bulat 7 cm", "stiker", "stok", 70, 70, "lingkaran", CG, "Half Cut potong jadi circle lingkaran bukan persegi", 20, 16000, "Nota Oke Print 29271 (10 A3 = 9 bayar + 1 gratis)", "Sticker Tiska Besar 7x7cm", "Diameter 7 cm", null, [["Logo Tiska", 1], ["Keripik Kentang", 2], ["Lasagna", 3]]],
  ["DAG9nKBSz9s", "59ye6k5q6yqk0ty", "Stiker Kecil 4 cm", "stiker", "stok", 40, 40, "lingkaran", CG, "Half Cut", 54, null, null, "Sticker Kecil 4x4cm", "4x4 cm", null, [["Susu Jahe", 1], ["Wedang Ronde", 2], ["Bandrek", 3], ["Sari Kedondong", 4], ["Thai Milk Tea", 5], ["Lasagna", 6], ["Es Dawet Ireng", 7], ["Sayur Asem", 8], ["Sayur Lodeh", 9], ["Tombo Kesel", 10], ["Serelli Tea", 11], ["Juice Sirna", 12], ["Sari Honje", 13], ["Vla Pudding", 14]]],
  ["DAHZeZCOb4g", "4r86ubvatp0rzto", "Label Minuman Kecil 8×5", "label", "stok", 80, 50, "persegi", CG, "Potong", 24, 7800, "Nota Oke Print 26973 (Rp 203.000 / 26 A3)", "Sticker Minuman Landscape 8x5cm", "8x5 cm", null, [["Es Dawet Ireng", 1], ["Serelli Tea Punch", 2], ["Guava Juice", 3], ["Sari Kedondong", 4], ["Sari Honje Kecombrang", 5], ["Wedang Jahe Sereh Lemon", 6], ["Juice Sirna Sirsak-Nanas", 7]]],
  ["DAHYcLi-YtA", "f3znu0d02thbex4", "Label Minuman Besar 10×15", "label", "stok", 100, 150, "persegi", CG, "Half Cut potong", 4, 9000, "Nota Oke Print 12891", "Sticker Minuman 10x15cm", "10x15 cm", null, [["Es Dawet Ireng", 1], ["Serelli Tea Punch", 2]]],
  ["DAHZeI1Q0JI", "p81a803xd40a4lm", "Label Landscape 15×10", "label", "stok", 150, 100, "persegi", CG, "Potong", 4, 7800, "Nota Oke Print 26973 (Rp 203.000 / 26 A3)", "Sticker Landscape 10x15cm", "10x15 cm", null, [["Serelli Tea Punch — keterangan", 1], ["Serelli Tea Punch — depan", 2], ["Keripik Kentang (English)", 3], ["Keripik Kentang (Indonesia)", 4]]],
  ["DAHGC0qCXa4", "fhoruv0dobr41z8", "Sleeve Tiska 9×48", "sleeve", "stok", 90, 480, "persegi", null, null, null, null, null, "Sleeve Tiska 9x48cm", "9x48 cm", "Lebih panjang dari A3 (42 cm) — tanyakan ukuran kertas ke percetakan.", []],
  ["DAG9zqASLlo", "cfkec39welepa7s", "Form Serah Terima", "dokumen", "stok", 176, 125, "persegi", null, null, 4, null, null, "Form Serah Terima Tiska", null, "Ukuran dibaca dari desain Canva (±17,6 × 12,5 cm) — cek sebelum pesan.", []],
];

const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();

const r2 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
const dasar = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`;
async function unggah(berkas) {
  const jalur = join(folder, berkas);
  if (!existsSync(jalur)) return null;
  const kunci = `cetakan/${berkas.replace(/\.jpg$/, "")}-${Date.now().toString(36)}.jpg`;
  if (!terapkan) return `(akan diunggah) ${kunci}`;
  const r = await r2.fetch(`${dasar}/${kunci}`, { method: "PUT", body: readFileSync(jalur), headers: { "content-type": "image/jpeg" } });
  if (!r.ok) throw new Error(`Unggah ${berkas} gagal: ${r.status}`);
  return kunci;
}

const rencana = [];
await db.query("BEGIN");
try {
  let oke = (await db.query(`SELECT id FROM suppliers WHERE name ILIKE 'oke print%' ORDER BY id LIMIT 1`)).rows[0];
  if (!oke) {
    rencana.push("+ vendor Oke Print Mancur (cetak_kemasan, 6285100726688)");
    oke = (await db.query(`INSERT INTO suppliers (name, category, phone, notes, active) VALUES ('Oke Print Mancur', 'cetak_kemasan', '6285100726688', 'Percetakan langganan cetakan Tiska. Bayar dulu baru cetak; transfer BCA min. Rp 10.000.', true) RETURNING id`)).rows[0];
  } else rencana.push(`= vendor Oke Print sudah ada (id ${oke.id})`);

  for (const [i, d] of DATA.entries()) {
    const [canva, pendek, nama, grup, jenis, lebar, tinggi, bentuk, bahan, finishing, isi, harga, asal, judul, ukuran, catatan, varian] = d;
    const ada = (await db.query(`SELECT id FROM print_items WHERE canva_design_id = $1`, [canva])).rows[0];
    let idItem = ada?.id;
    if (ada) rencana.push(`= ${nama} sudah ada`);
    else {
      const gambar = await unggah(`${canva}-1.jpg`);
      rencana.push(`+ ${nama} (${grup}, ${lebar ?? "?"}×${tinggi ?? "?"} mm, ${harga ? `Rp ${harga}/A3` : "harga ?"}, gambar ${gambar ? "ada" : "TIDAK ADA"})`);
      idItem = (
        await db.query(
          `INSERT INTO print_items (name, grup, kind, width_mm, height_mm, shape, material, finishing, pcs_per_sheet, price_per_sheet, price_note, chat_label, size_text, supplier_id, canva_design_id, canva_url, thumbnail_key, notes, sort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
          [nama, grup, jenis, lebar, tinggi, bentuk, bahan, finishing, isi, harga, asal, judul, ukuran, oke.id, canva, `https://canva.link/${pendek}`, terapkan ? gambar : null, catatan, (i + 1) * 10],
        )
      ).rows[0].id;
    }
    for (const [j, [namaV, hal]] of varian.entries()) {
      const adaV = (await db.query(`SELECT 1 FROM print_item_variants WHERE item_id = $1 AND name = $2`, [idItem, namaV])).rowCount;
      if (adaV) continue;
      const g = await unggah(`${canva}-${hal}.jpg`);
      rencana.push(`    + varian ${namaV} (hal. ${hal}, gambar ${g ? "ada" : "TIDAK ADA"})`);
      await db.query(`INSERT INTO print_item_variants (item_id, name, canva_page, thumbnail_key, sort) VALUES ($1,$2,$3,$4,$5)`, [idItem, namaV, hal, terapkan ? g : null, (j + 1) * 10]);
    }
  }
  console.log(rencana.join("\n"));
  if (terapkan) {
    await db.query("COMMIT");
    console.log("✅ diterapkan");
  } else {
    await db.query("ROLLBACK");
    console.log("— DRY-RUN, tidak ada yang ditulis. Tambah --apply untuk menerapkan.");
  }
} catch (galat) {
  await db.query("ROLLBACK");
  throw galat;
} finally {
  await db.end();
}
