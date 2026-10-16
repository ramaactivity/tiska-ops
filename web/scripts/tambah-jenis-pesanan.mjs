/**
 * Jenis pesanan (D-070): quotations.order_type & invoices.order_type =
 * 'event' (catering event: set-up buffet/stall, tim servis) atau 'retail'
 * (produk saja: dibuat & dikirim). Kosong = dokumen lama. Aditif.
 *
 *   node scripts/tambah-jenis-pesanan.mjs && npm run db:tarik
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
  for (const t of ["quotations", "invoices"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS order_type VARCHAR(10)`);
    await klien.query(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${t}_order_type_check`);
    await klien.query(`ALTER TABLE ${t} ADD CONSTRAINT ${t}_order_type_check CHECK (order_type IS NULL OR order_type IN ('event','retail'))`);
  }
  await klien.query("COMMIT");
  console.log("✅ order_type siap di quotations & invoices");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
