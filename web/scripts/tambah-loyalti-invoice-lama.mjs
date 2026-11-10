/**
 * invoices.loyalty_pax — invoice lama (sebelum Ikut Menu Pesta ada di Tiska Ops) yang ditandai admin sebagai
 * pesanan Ikut Menu Pesta supaya ikut jadi stempel loyalti. Isi = total pax pesanan itu; NULL = tidak dihitung.
 *
 *   node scripts/tambah-loyalti-invoice-lama.mjs && npm run db:tarik
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
await klien.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS loyalty_pax SMALLINT`);
await klien.query(`DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_loyalty_pax_positif CHECK (loyalty_pax IS NULL OR loyalty_pax > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
await klien.query("COMMIT");
console.log("invoices.loyalty_pax siap");
await klien.end();
