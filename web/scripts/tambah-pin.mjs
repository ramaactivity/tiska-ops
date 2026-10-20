/**
 * Login HP tim pakai wajah + PIN (Fase 3.6, D-101).
 *
 *   node scripts/tambah-pin.mjs && npm run db:tarik
 *
 * users.pin_hash: bcrypt PIN 4–6 angka, NULL = belum membuat PIN. Aditif &
 * aman dijalankan berulang.
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
await klien.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(100)`);
console.log("✅ users.pin_hash siap");
await klien.end();
