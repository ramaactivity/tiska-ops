/**
 * Penandatangan kwitansi (D-129, masukan Mas Reza 2 Nov 2026).
 *
 *   node scripts/tambah-ttd-kwitansi.mjs && npm run db:tarik
 *
 * payments.signatory_id   penandatangan kwitansi, dipilih di form Payment (bawaan = penandatangan invoice yang dibayar).
 *                         Kosong (payment lama) → kwitansi memakai penandatangan invoice-nya.
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
  await klien.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS signatory_id BIGINT REFERENCES signatories(id)`);
  await klien.query("COMMIT");
  console.log("✅ kolom penandatangan kwitansi siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
