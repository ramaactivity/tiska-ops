/**
 * Nomor kwitansi digital per payment (06-DOKUMEN-QUOTATION §6, D-045).
 *
 *   node scripts/tambah-nomor-kwitansi.mjs && npm run db:tarik
 *
 * payments.receipt_number: KWT/TC/2610/001 — diberikan saat kwitansinya
 * pertama kali dibuka, lalu tetap. Unik. Aditif & aman dijalankan berulang.
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
await klien.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(255)`);
await klien.query(`CREATE UNIQUE INDEX IF NOT EXISTS payments_receipt_number_unique ON payments (receipt_number)`);
await klien.end();
console.log("✅ payments.receipt_number siap");
