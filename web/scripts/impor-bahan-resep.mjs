/**
 * Impor bahan, harga, dan resep dari data/bahan.csv + data/resep.csv
 * (diekstrak dari "HPP Makanan - BOM.xlsx", lihat repo arsip
 * tools/ekstrak_resep_bom.py).
 *
 *   node scripts/impor-bahan-resep.mjs            # DRY-RUN: rencana + pemeriksaan, tidak menulis
 *   node scripts/impor-bahan-resep.mjs --apply    # menulis, SATU transaksi
 *
 * Aturan:
 * - Bahan & resep dikenali dari KODE, bukan nama ("Tumis Kacang Panjang" ada dua).
 * - Harga hanya di ingredient_prices (satu sumber). Biaya resep dihitung ulang
 *   dari harga bahan, lalu dicocokkan ke total Excel per resep.
 * - Baris resep yang kodenya tidak ada di daftar bahan dibuatkan bahan
 *   PENGGANTI (is_placeholder, status "lengkapi") supaya resepnya utuh dan
 *   masuk antrian "perlu dilengkapi". Baris tanpa kode, nama, dan biaya
 *   dilewati (sisa di Excel).
 * - --apply menolak jalan kalau tabel bahan/resep sudah berisi (tidak dobel).
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

/** CSV sederhana yang paham tanda kutip (nama bahan bisa memuat koma). */
function bacaCsv(berkas) {
  const teks = readFileSync(berkas, "utf8");
  const baris = [];
  let kolom = [], sel = "", kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === ",") { kolom.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && teks[i + 1] === "\n") i++;
      kolom.push(sel); baris.push(kolom); kolom = []; sel = "";
    } else sel += c;
  }
  if (sel || kolom.length) { kolom.push(sel); baris.push(kolom); }
  const [kepala, ...isi] = baris.filter((b) => b.length > 1 || b[0] !== "");
  return isi.map((b) => Object.fromEntries(kepala.map((k, i) => [k, (b[i] ?? "").trim()])));
}

const angka = (s) => (s === "" || s == null ? null : Number(s));
const kosongJadiNull = (s) => (s === "" ? null : s);

const STATUS = { OK: "ok", "Lengkapi harga/konversi": "lengkapi", "Cek konversi": "cek_konversi" };
const SUMBER = { Beli: "beli", "Produksi Internal": "produksi_internal" };

/* ---------- Rencana ---------- */

const bahanCsv = bacaCsv("../data/bahan.csv");
const resepCsv = bacaCsv("../data/resep.csv");
const ringkasCsv = bacaCsv("../data/resep_ringkas.csv");

const bahan = new Map(); // code -> { ...ingredient, harga }
for (const b of bahanCsv) {
  if (!STATUS[b.status_data] || !SUMBER[b.sumber]) throw new Error(`Status/sumber tak dikenal di ${b.kode}`);
  bahan.set(b.kode, {
    code: b.kode, category: b.kategori, name: b.nama, brand: kosongJadiNull(b.merk), variant: kosongJadiNull(b.jenis),
    purchase_qty: angka(b.kemasan_qty), purchase_unit: kosongJadiNull(b.kemasan_satuan),
    usage_unit: kosongJadiNull(b.satuan_resep), usage_qty_per_pack: angka(b.isi_per_kemasan_satuan_resep),
    source: SUMBER[b.sumber], status: STATUS[b.status_data], is_placeholder: false, notes: kosongJadiNull(b.catatan),
    harga: b.harga_per_satuan_resep === "" ? null : {
      price_per_pack: angka(b.harga_dipakai), price_per_usage_unit: Number(b.harga_per_satuan_resep),
      source_note: `HPP Makanan - BOM.xlsx · harga lama ${b.harga_beli_lama || "-"} · terakhir ${b.harga_pembelian_terakhir || "-"}`,
    },
  });
}

const KODE_SAH = /^[A-Za-z]+-\d+$/;
const pengganti = new Map(); // kunci -> code
let urutImp = 0;
function bahanPengganti(x) {
  // Tanpa kode sah: satu pengganti per NAMA ("Bumbu Gulai (Jadi)" muncul
  // dengan kode "-" dan kode kosong — itu bahan yang sama).
  const kunci = KODE_SAH.test(x.kode_bahan) ? x.kode_bahan : (x.nama_bahan || x.kode_bahan).toLowerCase();
  if (pengganti.has(kunci)) return pengganti.get(kunci);
  const code = KODE_SAH.test(x.kode_bahan) ? x.kode_bahan : `IMP-${String(++urutImp).padStart(3, "0")}`;
  const harga = angka(x.harga_per_satuan);
  bahan.set(code, {
    code, category: "Lainnya", name: x.nama_bahan || `(kode "${x.kode_bahan}" tidak ada di daftar bahan)`,
    brand: null, variant: null, purchase_qty: null, purchase_unit: null, usage_unit: kosongJadiNull(x.satuan),
    usage_qty_per_pack: null, source: "beli", status: "lengkapi", is_placeholder: true,
    notes: `Dibuat saat impor dari resep ${x.kode_menu}: kode di Excel "${x.kode_bahan}", nama "${x.nama_bahan}".`,
    harga: harga ? { price_per_pack: null, price_per_usage_unit: harga, source_note: `harga dari baris resep ${x.kode_menu} (tanpa kode bahan)` } : null,
  });
  pengganti.set(kunci, code);
  return code;
}

const resep = new Map();
for (const r of ringkasCsv) {
  resep.set(r.kode_menu, {
    code: r.kode_menu, name: r.nama_menu, sheet: r.sheet, portions_per_batch: angka(r.porsi_per_resep),
    status: r.porsi_per_resep === "" ? "belum_ada" : "perkiraan", total_excel: Number(r.total_biaya_bahan_batch || 0), baris: [],
  });
}

let dilewati = 0, qtyKosong = 0;
for (const x of resepCsv) {
  const r = resep.get(x.kode_menu);
  if (!r) throw new Error(`Resep ${x.kode_menu} tidak ada di resep_ringkas.csv`);
  // Tanpa kode, tanpa nama, tanpa biaya = baris sisa di Excel (kadang ada qty-nya saja).
  if (!x.kode_bahan && !x.nama_bahan && !Number(x.biaya || 0)) { dilewati++; continue; }
  const code = bahan.has(x.kode_bahan) && !bahan.get(x.kode_bahan).is_placeholder ? x.kode_bahan : bahanPengganti(x);
  const qty = angka(x.qty_per_resep);
  if (!qty) qtyKosong++;
  r.baris.push({ code, qty_per_batch: qty ?? 0, usage_unit: kosongJadiNull(x.satuan), sort: r.baris.length + 1,
    note: qty ? null : "qty kosong/0 di Excel" });
}

/* ---------- Pemeriksaan: biaya dihitung ulang vs total Excel ---------- */

let cocok = 0;
const meleset = [];
for (const r of resep.values()) {
  const hitung = r.baris.reduce((s, b) => s + b.qty_per_batch * (bahan.get(b.code).harga?.price_per_usage_unit ?? 0), 0);
  if (Math.abs(hitung - r.total_excel) <= 0.01) cocok++;
  else meleset.push(`${r.code} ${r.name}: Excel ${r.total_excel.toFixed(2)} · hitung ulang ${hitung.toFixed(2)}`);
}

const semuaBahan = [...bahan.values()];
const jumlahBaris = [...resep.values()].reduce((s, r) => s + r.baris.length, 0);
console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — rencana impor`);
console.log(`  bahan        : ${semuaBahan.length} (${bahanCsv.length} dari daftar + ${pengganti.size} pengganti)`);
console.log(`  harga bahan  : ${semuaBahan.filter((b) => b.harga).length} (tanpa harga: ${semuaBahan.filter((b) => !b.harga).length})`);
console.log(`  status bahan : ${JSON.stringify(Object.fromEntries(["ok", "lengkapi", "cek_konversi"].map((s) => [s, semuaBahan.filter((b) => b.status === s).length])))}`);
console.log(`  resep        : ${resep.size} (belum_ada: ${[...resep.values()].filter((r) => r.status === "belum_ada").length})`);
console.log(`  baris resep  : ${jumlahBaris} (baris kosong dilewati: ${dilewati}, qty kosong/0: ${qtyKosong})`);
console.log(`  pengganti    : ${[...pengganti.values()].map((c) => `${c} "${bahan.get(c).name}"`).join(" · ")}`);
console.log(`  biaya resep = total Excel: ${cocok}/${resep.size}`);
for (const m of meleset) console.log(`    ✗ ${m}`);

if (!APPLY) {
  console.log("\nTidak ada yang ditulis. Jalankan dengan --apply untuk menyimpan.");
  process.exit(0);
}

/* ---------- Tulis, satu transaksi ---------- */

const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const { rows: isi } = await klien.query(
  `SELECT (SELECT count(*) FROM ingredients)::int AS b, (SELECT count(*) FROM recipes)::int AS r`,
);
if (isi[0].b || isi[0].r) throw new Error(`Tabel sudah berisi (bahan ${isi[0].b}, resep ${isi[0].r}). Impor dibatalkan.`);

await klien.query("BEGIN");
try {
  const idBahan = new Map();
  for (const b of semuaBahan) {
    const { rows } = await klien.query(
      `INSERT INTO ingredients (code, category, name, brand, variant, purchase_qty, purchase_unit, usage_unit,
         usage_qty_per_pack, source, status, is_placeholder, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), now()) RETURNING id`,
      [b.code, b.category, b.name, b.brand, b.variant, b.purchase_qty, b.purchase_unit, b.usage_unit,
        b.usage_qty_per_pack, b.source, b.status, b.is_placeholder, b.notes],
    );
    idBahan.set(b.code, rows[0].id);
    if (b.harga) {
      await klien.query(
        `INSERT INTO ingredient_prices (ingredient_id, price_per_pack, price_per_usage_unit, source, source_note, effective_at, created_at)
         VALUES ($1,$2,$3,'impor',$4, now(), now())`,
        [rows[0].id, b.harga.price_per_pack, b.harga.price_per_usage_unit, b.harga.source_note],
      );
    }
  }
  for (const r of resep.values()) {
    const { rows } = await klien.query(
      `INSERT INTO recipes (code, name, sheet, portions_per_batch, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, now(), now()) RETURNING id`,
      [r.code, r.name, r.sheet, r.portions_per_batch, r.status],
    );
    for (const l of r.baris) {
      await klien.query(
        `INSERT INTO recipe_lines (recipe_id, ingredient_id, qty_per_batch, usage_unit, sort, note, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6, now(), now())`,
        [rows[0].id, idBahan.get(l.code), l.qty_per_batch, l.usage_unit, l.sort, l.note],
      );
    }
  }
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

/* ---------- Dibaca ulang dari database, bukan dianggap berhasil ---------- */

const { rows: hasil } = await klien.query(`
  SELECT (SELECT count(*) FROM ingredients)::int AS bahan,
         (SELECT count(*) FROM ingredient_prices)::int AS harga,
         (SELECT count(*) FROM recipes)::int AS resep,
         (SELECT count(*) FROM recipe_lines)::int AS baris`);
const { rows: biaya } = await klien.query(`
  SELECT r.code, COALESCE(SUM(l.qty_per_batch * p.price_per_usage_unit), 0)::float8 AS total
    FROM recipes r
    LEFT JOIN recipe_lines l ON l.recipe_id = r.id
    LEFT JOIN LATERAL (SELECT price_per_usage_unit FROM ingredient_prices ip
                        WHERE ip.ingredient_id = l.ingredient_id ORDER BY effective_at DESC, id DESC LIMIT 1) p ON true
   GROUP BY r.code`);
const cocokDb = biaya.filter((b) => Math.abs(b.total - resep.get(b.code).total_excel) <= 0.01).length;
console.log(`\nTersimpan: ${JSON.stringify(hasil[0])} · biaya resep di DB = total Excel: ${cocokDb}/${resep.size}`);
await klien.end();
