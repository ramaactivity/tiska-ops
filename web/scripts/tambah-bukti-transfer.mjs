/**
 * Bukti transfer pembayaran (D-071): payments.transfer_proof = jalur berkas
 * di bucket tertutup "bukti" (pembayaran/...). Kosong = tanpa bukti. Aditif.
 *
 *   node scripts/tambah-bukti-transfer.mjs && npm run db:tarik
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
try {
  await klien.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_proof VARCHAR(255)");
  console.log("✅ payments.transfer_proof siap");
} finally {
  await klien.end();
}
