/**
 * Basis harga paket (D-083): packages.price_basis = 'nett' (sudah termasuk
 * pajak & layanan) | 'plus_plus' | null. Diisi dari transkrip pricelist
 * (scripts/data/paket-pilihan.json). Aditif.
 *
 *   node scripts/tambah-basis-harga-paket.mjs [--apply] && npm run db:tarik
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const data = JSON.parse(readFileSync("scripts/data/paket-pilihan.json", "utf8"));
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_basis VARCHAR(10)`);
  await klien.query(`ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_price_basis_check`);
  await klien.query(`ALTER TABLE packages ADD CONSTRAINT packages_price_basis_check CHECK (price_basis IS NULL OR price_basis IN ('nett','plus_plus'))`);
  let n = { nett: 0, plus_plus: 0 };
  for (const p of data.filter((x) => x.basis)) {
    const r = await klien.query(`update packages set price_basis=$1 where code=$2 and price_basis is distinct from $1`, [p.basis, p.code]);
    n[p.basis] += r.rowCount;
  }
  console.log(`kolom siap · diisi: ${n.nett} nett, ${n.plus_plus} plus_plus`);
  if (process.argv.includes("--apply")) { await klien.query("COMMIT"); console.log("✅ APPLY"); } else { await klien.query("ROLLBACK"); console.log("DRY-RUN"); }
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
