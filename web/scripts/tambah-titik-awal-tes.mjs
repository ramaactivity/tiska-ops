/**
 * test_fixtures — titik awal event dummy (D-140): potret semua baris yang
 * menyangkut customer TES-00…03, dipakai tombol "Reset event dummy".
 *
 *   node scripts/tambah-titik-awal-tes.mjs && npm run db:tarik
 *
 * Aditif & aman dijalankan berulang kali.
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
await klien.query(`CREATE TABLE IF NOT EXISTS test_fixtures (
  kode VARCHAR(40) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
)`);
await klien.query(`ALTER TABLE test_fixtures ENABLE ROW LEVEL SECURITY`);
await klien.query(`REVOKE ALL ON test_fixtures FROM anon, authenticated`);
await klien.query("COMMIT");
console.log("test_fixtures siap");
await klien.end();
