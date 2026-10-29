/**
 * Ikut Pesen Menu Pesta — Tahap E: form pesan online (D-119, docs/14-IKUT-MENU-PESTA.md §4b).
 *
 *   node scripts/tambah-form-online-ikut-menu-pesta.mjs && npm run db:tarik
 *
 * retail_programs.slug         link publik /pesan/<slug>, dibuat saat program disetujui.
 * retail_orders.confirmed_at   pesanan dari form online (source = 'online') yang belum dicek admin = NULL.
 * Aditif & aman diulang.
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
  await klien.query(`ALTER TABLE retail_programs ADD COLUMN IF NOT EXISTS slug VARCHAR(80)`);
  await klien.query(`CREATE UNIQUE INDEX IF NOT EXISTS retail_programs_slug_key ON retail_programs (slug)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP(0)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS confirmed_by BIGINT REFERENCES users(id)`);
  /** Anti-spam form online: hitung kiriman per nomor HP dalam satu jam terakhir. */
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_orders_phone_created_idx ON retail_orders (phone, created_at)`);
  await klien.query("COMMIT");
  console.log("✅ link publik program & tanda konfirmasi pesanan online siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
