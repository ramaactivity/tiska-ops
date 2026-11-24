/**
 * Link desain Canva per pricelist (D-229).
 *
 *   node scripts/tambah-canva-pricelist.mjs && npx prisma generate
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
try {
  await klien.query("ALTER TABLE pricelists ADD COLUMN IF NOT EXISTS canva_url VARCHAR(500)");
  console.log("✅ pricelists.canva_url siap");
} finally {
  await klien.end();
}
