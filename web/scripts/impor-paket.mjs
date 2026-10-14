/**
 * Impor paket box BS-1..24 & PR-01..20 dari data/paket_box_hpp.csv
 * (sumber "BS-PR terbaru" = "HPP Basic Style, Lunch Box, Preferred Lunch Box
 * (TERBARU).xlsx"). Premium Nusantara & International Taste menyusul setelah
 * sheet yang berlaku dikonfirmasi (harga antar-sheet bertentangan).
 *
 *   node scripts/impor-paket.mjs            # DRY-RUN
 *   node scripts/impor-paket.mjs --apply    # satu transaksi
 *
 * - Baris "Box Tiska ..., Alat Makan & Mika" BUKAN isi paket: ia biaya bentuk
 *   penyajian (service_forms.packaging_cost), supaya paket yang sama bisa
 *   dihitung sebagai buffet tanpa biaya box.
 * - Item lain → menus (satu nama satu menu), terhubung ke resep bila namanya
 *   sama persis dengan TEPAT SATU resep.
 * - HPP item disimpan sebagai hpp_snapshot; dicocokkan: Σ item + biaya kemasan
 *   = __TOTAL_HPP__ di file, per paket.
 * - Harga jual = harga di judul sheet. PR-12: judul 78.500 vs baris harga jual
 *   88.500 → dipakai 78.500 (default 13-PERTANYAAN #3), selisih dicatat.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

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

const rapi = (s) => s.replace(/\s+/g, " ").trim();
const kunciNama = (s) => rapi(s).toLowerCase();

/* ---------- Bentuk penyajian ---------- */
const BENTUK = [
  { code: "box_reguler", name: "Box reguler", sort: 1 },
  { code: "box_sedang", name: "Box sedang", sort: 2 },
  { code: "box_premium", name: "Box premium", sort: 3 },
  { code: "snack_box", name: "Snack box", sort: 4 },
  { code: "buffet", name: "Buffet", sort: 5 },
  { code: "stall", name: "Stall / gubukan", sort: 6 },
  { code: "plated", name: "Plated / set menu", sort: 7 },
  { code: "tumpeng", name: "Tumpeng", sort: 8 },
  { code: "tampah", name: "Tampah", sort: 9 },
  { code: "hampers", name: "Hampers", sort: 10 },
];
function bentukDariBox(nama) {
  const n = nama.toLowerCase();
  // Harus baris kemasan ("Box Tiska ..., Alat Makan & Mika"), bukan item yang
  // kebetulan bernama "premium" seperti "Buah (Jeruk Medan Premium)".
  if (!n.startsWith("box") || !/(alat makan|mika)/.test(n)) return null;
  if (n.includes("premium")) return "box_premium";
  if (n.includes("sedang")) return "box_sedang";
  if (n.includes("reguler")) return "box_reguler";
  return null;
}

/* ---------- Rencana ---------- */
const csv = bacaCsv("../data/paket_box_hpp.csv").filter((r) => r.sumber === "BS-PR terbaru");
const resep = bacaCsv("../data/resep_ringkas.csv");
const resepPerNama = new Map();
for (const r of resep) {
  const k = kunciNama(r.nama_menu);
  resepPerNama.set(k, [...(resepPerNama.get(k) ?? []), r.kode_menu]);
}

const paket = new Map();
for (const r of csv) {
  if (!paket.has(r.kode_paket)) paket.set(r.kode_paket, { code: r.kode_paket, sheet: r.sheet, judul: Number(r.harga_di_judul), baris: [] });
  paket.get(r.kode_paket).baris.push(r);
}

const biayaKemasan = new Map(); // code bentuk -> Set(biaya)
const menu = new Map(); // kunci -> { name, resep }
const rencana = [];
const peringatan = [];
for (const p of paket.values()) {
  const items = p.baris.filter((b) => !b.item.startsWith("__"));
  const total = Number(p.baris.find((b) => b.item === "__TOTAL_HPP__")?.hpp_item);
  const jual = Number(p.baris.find((b) => b.item === "__HARGA_JUAL__")?.hpp_item);
  const box = items.filter((b) => bentukDariBox(b.item));
  if (box.length !== 1) throw new Error(`${p.code}: baris box tidak tepat satu`);
  const bentuk = bentukDariBox(box[0].item);
  biayaKemasan.set(bentuk, new Set([...(biayaKemasan.get(bentuk) ?? []), Number(box[0].hpp_item)]));
  const isi = items.filter((b) => b !== box[0]).map((b, i) => {
    const k = kunciNama(b.item);
    if (!menu.has(k)) {
      const cocok = resepPerNama.get(k) ?? [];
      menu.set(k, { name: rapi(b.item), resep: cocok.length === 1 ? cocok[0] : null });
    }
    return { menu: k, sort: i + 1, hpp: Number(b.hpp_item), pilihan: b.item.includes("*") };
  });
  const hero = isi.find((x) => !/^(nasi putih|lontong)/i.test(menu.get(x.menu).name)) ?? isi[0];
  if (jual !== p.judul) peringatan.push(`${p.code}: harga di judul sheet ${p.judul} ≠ baris harga jual ${jual} → dipakai ${p.judul}`);
  rencana.push({
    code: p.code,
    name: menu.get(hero.menu).name,
    line: p.code.startsWith("BS") ? "Basic Style Lunch Box" : "Preferred Lunch Box",
    price: p.judul,
    bentuk,
    biayaBox: Number(box[0].hpp_item),
    isi,
    total,
    notes: jual !== p.judul ? `Harga jual di file ${jual.toLocaleString("id-ID")}, judul sheet ${p.judul.toLocaleString("id-ID")} — konfirmasi ke sales.` : null,
  });
}
for (const [b, set] of biayaKemasan) if (set.size > 1) peringatan.push(`biaya ${b} beda-beda antar paket: ${[...set].join(", ")}`);

let cocok = 0;
const meleset = [];
for (const p of rencana) {
  const hitung = p.isi.reduce((s, x) => s + x.hpp, 0) + p.biayaBox;
  if (Math.abs(hitung - p.total) <= 0.01) cocok++;
  else meleset.push(`${p.code}: file ${p.total.toFixed(2)} · hitung ${hitung.toFixed(2)}`);
}
const bs15 = rencana.find((p) => p.code === "BS-15");
const terhubung = [...menu.values()].filter((m) => m.resep).length;

console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — rencana impor paket`);
console.log(`  bentuk penyajian : ${BENTUK.length} (biaya kemasan: ${[...biayaKemasan].map(([b, s]) => `${b} ${[...s].join("/")}`).join(", ")})`);
console.log(`  paket            : ${rencana.length} (BS ${rencana.filter((p) => p.code.startsWith("BS")).length}, PR ${rencana.filter((p) => p.code.startsWith("PR")).length})`);
console.log(`  isi paket        : ${rencana.reduce((s, p) => s + p.isi.length, 0)} baris`);
console.log(`  menu             : ${menu.size} (terhubung resep: ${terhubung}, belum: ${menu.size - terhubung})`);
console.log(`  HPP paket = file : ${cocok}/${rencana.length} · BS-15 ${bs15 && (bs15.isi.reduce((s, x) => s + x.hpp, 0) + bs15.biayaBox).toFixed(2)}`);
for (const m of meleset) console.log(`    ✗ ${m}`);
for (const w of peringatan) console.log(`  ⚠ ${w}`);
console.log(`  contoh nama paket: ${rencana.slice(0, 6).map((p) => `${p.code} "${p.name}"`).join(" · ")}`);

if (!APPLY) {
  console.log("\nTidak ada yang ditulis. Jalankan dengan --apply untuk menyimpan.");
  process.exit(0);
}

/* ---------- Tulis ---------- */
const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
const { rows: isiDb } = await klien.query(`SELECT (SELECT count(*) FROM packages)::int AS p, (SELECT count(*) FROM menus)::int AS m`);
if (isiDb[0].p || isiDb[0].m) throw new Error(`Tabel sudah berisi (paket ${isiDb[0].p}, menu ${isiDb[0].m}). Dibatalkan.`);

await klien.query("BEGIN");
try {
  const idBentuk = new Map();
  for (const b of BENTUK) {
    const biaya = biayaKemasan.get(b.code);
    const { rows } = await klien.query(
      `INSERT INTO service_forms (code, name, packaging_cost, sort, created_at, updated_at)
       VALUES ($1,$2,$3,$4, now(), now())
       ON CONFLICT (code) DO UPDATE SET packaging_cost = COALESCE(EXCLUDED.packaging_cost, service_forms.packaging_cost)
       RETURNING id`,
      [b.code, b.name, biaya ? Math.max(...biaya) : null, b.sort],
    );
    idBentuk.set(b.code, rows[0].id);
  }
  const { rows: rs } = await klien.query(`SELECT id, code FROM recipes`);
  const idResep = new Map(rs.map((r) => [r.code, r.id]));
  const idMenu = new Map();
  for (const [k, m] of menu) {
    const { rows } = await klien.query(
      `INSERT INTO menus (name, recipe_id, created_at, updated_at) VALUES ($1,$2, now(), now()) RETURNING id`,
      [m.name, m.resep ? idResep.get(m.resep) : null],
    );
    idMenu.set(k, rows[0].id);
  }
  for (const p of rencana) {
    const { rows } = await klien.query(
      `INSERT INTO packages (code, name, line, kind, price, service_form_id, status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,'fixed',$4,$5,'aktif',$6, now(), now()) RETURNING id`,
      [p.code, p.name, p.line, p.price, idBentuk.get(p.bentuk), p.notes],
    );
    for (const x of p.isi) {
      await klien.query(
        `INSERT INTO package_items (package_id, menu_id, qty, sort, note, hpp_snapshot, created_at, updated_at)
         VALUES ($1,$2,1,$3,$4,$5, now(), now())`,
        [rows[0].id, idMenu.get(x.menu), x.sort, x.pilihan ? "pilihan klien" : null, x.hpp],
      );
    }
  }
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

const { rows: cek } = await klien.query(`
  SELECT p.code, (COALESCE(SUM(i.hpp_snapshot),0) + COALESCE(f.packaging_cost,0))::float8 AS hpp
    FROM packages p LEFT JOIN package_items i ON i.package_id = p.id LEFT JOIN service_forms f ON f.id = p.service_form_id
   GROUP BY p.code, f.packaging_cost`);
const cocokDb = cek.filter((c) => Math.abs(c.hpp - rencana.find((p) => p.code === c.code).total) <= 0.01).length;
const { rows: jml } = await klien.query(`SELECT (SELECT count(*) FROM service_forms)::int f, (SELECT count(*) FROM menus)::int m, (SELECT count(*) FROM packages)::int p, (SELECT count(*) FROM package_items)::int i`);
console.log(`\nTersimpan: ${JSON.stringify(jml[0])} · HPP paket di DB = file: ${cocokDb}/${rencana.length}`);
await klien.end();
