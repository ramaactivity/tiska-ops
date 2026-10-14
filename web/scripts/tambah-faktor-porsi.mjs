/**
 * menus.portion_factor — berapa porsi resep untuk satu sajian menu ini
 * (bawaan 1; "Telur Balado 1/2" = 0,5). HPP menu = HPP resep per porsi ×
 * faktor (D-033).
 *
 *   node scripts/tambah-faktor-porsi.mjs && npm run db:tarik
 *
 * Aditif (kolom baru berbawaan 1) & aman dijalankan berulang kali.
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
await klien.query(`ALTER TABLE menus ADD COLUMN IF NOT EXISTS portion_factor NUMERIC(10,3) NOT NULL DEFAULT 1`);
await klien.query(`ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_portion_factor_check`);
await klien.query(`ALTER TABLE menus ADD CONSTRAINT menus_portion_factor_check CHECK (portion_factor > 0)`);
const { rows } = await klien.query(`SELECT count(*)::int n, count(*) FILTER (WHERE portion_factor = 1)::int satu FROM menus`);
console.log(`menus: ${rows[0].n} baris, faktor 1: ${rows[0].satu}`);
await klien.end();
