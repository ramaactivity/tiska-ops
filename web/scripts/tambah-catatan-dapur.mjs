/**
 * Catatan untuk dapur & tim (D-212, 18 Nov 2026) — catatan umum dokumen yang hanya untuk tim belakang: request klien
 * (tidak terlalu pedas, sayur lebih empuk), pembagian porsi per area ("65 pax: 55 area umum, 10 VIP"), info penting lain.
 * Tercetak di PO to Kitchen, TIDAK di quotation/invoice klien. Dibedakan dari keterangan di bawah tiap menu (D-208).
 *
 *   node scripts/tambah-catatan-dapur.mjs
 *
 * quotations.kitchen_notes, invoices.kitchen_notes   TEXT NULL. Aditif & aman diulang; data lama tidak diubah.
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
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS kitchen_notes TEXT`);
  await klien.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS kitchen_notes TEXT`);
  await klien.query("COMMIT");
  const r = await klien.query(`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE column_name = 'kitchen_notes' AND table_name IN ('quotations','invoices') ORDER BY table_name`);
  console.log("✅ kolom catatan dapur siap:", r.rows);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
