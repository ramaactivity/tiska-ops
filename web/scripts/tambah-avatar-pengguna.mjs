/**
 * Avatar pengguna (D-061): users.avatar = "<seed>" atau "<seed>|hijab".
 * Kosong = seed username tanpa hijab. Aditif.
 *
 *   node scripts/tambah-avatar-pengguna.mjs && npm run db:tarik
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
await klien.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(80)");
console.log("✅ users.avatar siap");
await klien.end();
