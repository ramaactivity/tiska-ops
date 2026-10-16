/**
 * Penanda data tes (D-072): customers.is_test. Semua dokumen milik customer
 * bertanda ini bisa dihapus sekaligus dari Pengaturan company → "Data tes".
 * Aditif (BOOLEAN NOT NULL DEFAULT false — data lama otomatis bukan tes).
 *
 *   node scripts/tambah-penanda-data-tes.mjs && npm run db:tarik
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
  await klien.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false");
  console.log("✅ customers.is_test siap");
} finally {
  await klien.end();
}
