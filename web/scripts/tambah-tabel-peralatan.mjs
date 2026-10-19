/**
 * Gudang tahap 3 — peralatan (Fase 3.8c, D-089).
 *
 *   node scripts/tambah-tabel-peralatan.mjs && npm run db:tarik
 *
 * equipment: master alat milik sendiri. owned_qty NULL = belum dihitung
 * (wizard "Hitung Awal Peralatan"); damaged_qty = rusak (tidak bisa dipakai).
 * rental_price = harga sewa ke klien (S&K umum_v); replacement_price = ganti
 * rugi lost & breakable (tabelnya belum ada — diisi owner).
 * event_equipment: alat per event — milik sendiri (equipment_id) atau sewaan
 * vendor (vendor_name + rental_cost); keluar → kembali (rusak/hilang).
 * Semai 13 alat dari tabel sewa S&K bila tabel masih kosong. Aditif & aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const KATEGORI = ["Penghangat", "Piring & alat makan", "Gelas", "Alat saji", "Meja, taplak & runner", "Kursi", "Dekor & vas bunga", "Napkin & placemat", "Pitcher", "Lainnya"];
const SEMAI = [
  ["Penghangat", "Chafing dish (pemanas makanan)", "pc", 250000],
  ["Piring & alat makan", "Set piring, gelas, garpu, sendok", "set", 5000],
  ["Gelas", "Gelas goblet", "pc", 10000],
  ["Gelas", "Gelas wine", "pc", 15000],
  ["Meja, taplak & runner", "Set meja gubukan/stall (taplak, sketsel gawangan, runner)", "set", 250000],
  ["Meja, taplak & runner", "Set meja round table Ø120 cm (VIP taplak & runner)", "set", 200000],
  ["Meja, taplak & runner", "VIP table cover (taplak bulat + runner)", "set", 150000],
  ["Kursi", "Kursi Futura + stretch cover putih", "set", 35000],
  ["Dekor & vas bunga", "Rangkaian vas bunga meja round table", "pc", 75000],
  ["Dekor & vas bunga", "Rangkaian vas bunga meja buffet", "pc", 350000],
  ["Napkin & placemat", "Napkin", "pc", 15000],
  ["Napkin & placemat", "Placemat", "pc", 15000],
  ["Pitcher", "Juice pitcher", "pc", 20000],
];

await klien.connect();
await klien.query("BEGIN");
try {
  const daftar = KATEGORI.map((k) => `'${k.replace(/'/g, "''")}'`).join(",");
  await klien.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id BIGSERIAL PRIMARY KEY,
      category VARCHAR(40) NOT NULL CHECK (category IN (${daftar})),
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(20) NOT NULL DEFAULT 'pc',
      owned_qty INTEGER CHECK (owned_qty IS NULL OR owned_qty >= 0),
      damaged_qty INTEGER NOT NULL DEFAULT 0 CHECK (damaged_qty >= 0),
      rental_price NUMERIC(15,2) CHECK (rental_price IS NULL OR rental_price >= 0),
      replacement_price NUMERIC(15,2) CHECK (replacement_price IS NULL OR replacement_price >= 0),
      notes VARCHAR(255),
      counted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      counted_at TIMESTAMP(0),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS event_equipment (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      equipment_id BIGINT REFERENCES equipment(id) ON DELETE RESTRICT,
      item_name VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255),
      qty INTEGER NOT NULL CHECK (qty > 0),
      rental_cost NUMERIC(15,2) CHECK (rental_cost IS NULL OR rental_cost >= 0),
      status VARCHAR(10) NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana','keluar','kembali')),
      qty_back INTEGER CHECK (qty_back IS NULL OR qty_back >= 0),
      qty_damaged INTEGER NOT NULL DEFAULT 0 CHECK (qty_damaged >= 0),
      qty_lost INTEGER NOT NULL DEFAULT 0 CHECK (qty_lost >= 0),
      note VARCHAR(255),
      out_at TIMESTAMP(0),
      back_at TIMESTAMP(0),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CHECK ((equipment_id IS NULL) = (vendor_name IS NOT NULL))
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_equipment_event_idx ON event_equipment (event_id)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_equipment_alat_idx ON event_equipment (equipment_id, status)`);
  for (const t of ["equipment", "event_equipment"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  const { rows } = await klien.query(`SELECT count(*)::int AS n FROM equipment`);
  if (!rows[0].n) {
    for (const [category, name, unit, harga] of SEMAI) {
      await klien.query(`INSERT INTO equipment (category, name, unit, rental_price) VALUES ($1,$2,$3,$4)`, [category, name, unit, harga]);
    }
    console.log(`semai ${SEMAI.length} alat dari tabel sewa S&K`);
  }
  await klien.query("COMMIT");
  console.log("✅ equipment & event_equipment siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
