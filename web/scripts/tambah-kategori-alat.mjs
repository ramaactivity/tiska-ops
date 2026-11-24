/**
 * Kategori peralatan "Alat dapur" & "Angkut & simpan" (D-225, daftar gudang Tya 24 Nov 2026).
 *
 *   node scripts/tambah-kategori-alat.mjs
 *
 * Melebarkan CHECK equipment.category — daftar lama tetap sah, tidak ada baris yang berubah.
 * Daftar di bawah HARUS sama dengan KATEGORI_ALAT di lib/hitung/peralatan.ts.
 * Aman dijalankan berulang kali.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const KATEGORI = [
  "Penghangat",
  "Piring & alat makan",
  "Gelas",
  "Alat saji",
  "Meja, taplak & runner",
  "Kursi",
  "Dekor & vas bunga",
  "Napkin & placemat",
  "Pitcher",
  "Alat dapur",
  "Angkut & simpan",
  "Lainnya",
];

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  const daftar = KATEGORI.map((k) => `'${k.replace(/'/g, "''")}'`).join(", ");
  await klien.query("ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_category_check");
  await klien.query(`ALTER TABLE equipment ADD CONSTRAINT equipment_category_check CHECK (category IN (${daftar}))`);
  await klien.query("COMMIT");
  console.log(`✅ kategori peralatan: ${KATEGORI.length} (tambah Alat dapur, Angkut & simpan)`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
