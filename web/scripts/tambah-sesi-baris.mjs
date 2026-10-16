/**
 * Sesi per hari pada baris quotation & invoice (01-SPEC E.2, D-041).
 *
 *   node scripts/tambah-sesi-baris.mjs && npm run db:tarik
 *
 * quotation_items / invoice_items: session_date (salah satu tanggal acara),
 * session_label (Breakfast/Coffee Break/Lunch/Dinner/Stall/Snack/bebas),
 * session_time (teks jam, mis. "11.00–13.00"). Kosong = tanpa sesi.
 *
 * Aditif (boleh kosong) & aman dijalankan berulang kali.
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
  for (const t of ["quotation_items", "invoice_items"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS session_date DATE`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS session_label VARCHAR(40)`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS session_time VARCHAR(40)`);
  }
  await klien.query("COMMIT");
  console.log("✅ kolom sesi baris siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
