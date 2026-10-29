/**
 * Ikut Pesen Menu Pesta — halaman "pesanan saya" + bukti transfer dari pembeli (D-120).
 *
 *   node scripts/tambah-pesanan-saya-ikut-menu-pesta.mjs && npm run db:tarik
 *
 * retail_orders.public_token       link pribadi /pesanan/<token> untuk pembeli (acak, tidak bisa ditebak).
 * retail_orders.transfer_proof     jalur foto bukti transfer di bucket privat "bukti"; dicek Finance lalu dicatat lewat Payment.
 * Aditif & aman diulang (pesanan lama diberi token).
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
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS public_token VARCHAR(40)`);
  await klien.query(`UPDATE retail_orders SET public_token = replace(gen_random_uuid()::text, '-', '') WHERE public_token IS NULL`);
  await klien.query(`CREATE UNIQUE INDEX IF NOT EXISTS retail_orders_public_token_key ON retail_orders (public_token)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS transfer_proof VARCHAR(300)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS transfer_proof_at TIMESTAMP(0)`);
  await klien.query("COMMIT");
  console.log("✅ link pesanan saya & bukti transfer siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
