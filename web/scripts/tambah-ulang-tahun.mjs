/**
 * Ulang tahun karyawan (D-109).
 *
 *   node scripts/tambah-ulang-tahun.mjs && npm run db:tarik
 *
 * employee_birthdays: satu baris per karyawan — punya akun (user_id) atau
 * tidak (cukup nama). Tahun lahir opsional (daftar tim hanya tanggal & bulan).
 * Aditif & aman dijalankan berulang.
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
  await klien.query(`
    CREATE TABLE IF NOT EXISTS employee_birthdays (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      birth_day SMALLINT NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
      birth_month SMALLINT NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
      birth_year SMALLINT CHECK (birth_year BETWEEN 1930 AND 2015),
      user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS employee_birthdays_bulan_idx ON employee_birthdays (birth_month, birth_day)`);
  await klien.query(`ALTER TABLE employee_birthdays ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON employee_birthdays FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE employee_birthdays_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ employee_birthdays siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
