/**
 * Program Loyalti Ikut Menu Pesta (D-131, docs/17-LOYALTI-CUSTOMER-REKANAN.md).
 *
 *   node scripts/tambah-loyalti.mjs && npm run db:tarik
 *
 * loyalty_programs     aturan: N pesanan lunas (≥ minimal belanja) dalam X hari → hadiah (teks bebas), berlaku Y hari.
 *                      Angka belum ditentukan Rama — semuanya diatur di halaman Program Loyalti.
 * loyalty_redemptions  pemakaian hadiah. Kartu stempel TIDAK disimpan: dihitung ulang dari riwayat pesanan
 *                      (lib/hitung/loyalti.ts); reward_key = "<idProgram>:<idPesananPenutup>" (unik → tidak terpakai dua kali).
 * Aditif & aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS loyalty_programs (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      stamps_needed SMALLINT NOT NULL CHECK (stamps_needed BETWEEN 1 AND 100),
      min_order_value NUMERIC(15, 0),
      window_days SMALLINT CHECK (window_days BETWEEN 1 AND 3650),
      reward VARCHAR(300) NOT NULL,
      reward_valid_days SMALLINT CHECK (reward_valid_days BETWEEN 1 AND 3650),
      starts_on DATE NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS loyalty_redemptions (
      id BIGSERIAL PRIMARY KEY,
      program_id BIGINT NOT NULL REFERENCES loyalty_programs(id),
      customer_id BIGINT NOT NULL REFERENCES customers(id),
      reward_key VARCHAR(60) NOT NULL UNIQUE,
      reward VARCHAR(300) NOT NULL,
      retail_order_id BIGINT REFERENCES retail_orders(id) ON DELETE SET NULL,
      note VARCHAR(300),
      used_by BIGINT REFERENCES users(id),
      used_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS loyalty_redemptions_customer_idx ON loyalty_redemptions (customer_id)`);
  for (const t of ["loyalty_programs", "loyalty_redemptions"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel loyalti siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
