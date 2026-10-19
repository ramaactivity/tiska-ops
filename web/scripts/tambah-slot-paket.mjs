/**
 * Paket pilihan per kategori (D-082): buffet, coffee break, wedding — klien
 * memilih N menu dari tiap kategori ("Soup pilih 1", "Dessert pilih 2").
 *   packages.unit            satuan jual (pax/porsi/pcs); kosong = dari bentuk penyajian
 *   package_slots            kategori per paket: label, pick (0 = semua termasuk), extra (menu tambahan berbayar)
 *   package_slot_options     pilihan per kategori: nama, menu_id (opsional, untuk HPP), extra_price
 * Aditif. packages.kind 'choice' sudah diizinkan sejak awal.
 *
 *   node scripts/tambah-slot-paket.mjs && npm run db:tarik
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS unit VARCHAR(20)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS package_slots (
      id BIGSERIAL PRIMARY KEY,
      package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      label VARCHAR(100) NOT NULL,
      pick INTEGER NOT NULL DEFAULT 1 CHECK (pick >= 0),
      extra BOOLEAN NOT NULL DEFAULT false,
      note VARCHAR(255),
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS package_slots_package_idx ON package_slots (package_id, sort)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS package_slot_options (
      id BIGSERIAL PRIMARY KEY,
      slot_id BIGINT NOT NULL REFERENCES package_slots(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      menu_id BIGINT REFERENCES menus(id) ON DELETE SET NULL,
      extra_price NUMERIC(15,2) CHECK (extra_price IS NULL OR extra_price >= 0),
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS package_slot_options_slot_idx ON package_slot_options (slot_id, sort)`);
  for (const t of ["package_slots", "package_slot_options"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ packages.unit, package_slots, package_slot_options siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
