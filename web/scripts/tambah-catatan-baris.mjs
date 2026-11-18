/**
 * Catatan di bawah menu (D-208, 18 Nov 2026) — mis. "Afternoon Snack" atau "(Completed with Fresh Lemon, Sugar …)",
 * tercetak miring di bawah nama menu pada quotation, invoice & lembar dapur.
 *
 *   node scripts/tambah-catatan-baris.mjs
 *
 * quotation_items.note, invoice_items.note   TEXT NULL. Aditif & aman diulang; data lama tidak diubah.
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
  await klien.query(`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS note TEXT`);
  await klien.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS note TEXT`);
  await klien.query("COMMIT");
  const r = await klien.query(`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE column_name = 'note' AND table_name IN ('quotation_items','invoice_items') ORDER BY table_name`);
  console.log("✅ kolom catatan siap:", r.rows);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
