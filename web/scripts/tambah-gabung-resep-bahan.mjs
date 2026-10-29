/**
 * Rapikan resep & bahan kembar (D-123) — lanjutan Rapikan Menu (D-122).
 *
 *   node scripts/tambah-gabung-resep-bahan.mjs && npm run db:tarik
 *
 * recipes.merged_into / ingredients.merged_into   resep/bahan kembar yang digabung: disembunyikan (tidak dihapus)
 *                                                 dan menunjuk induknya; semua rujukan dipindah ke induk.
 * menu_review_skips.kind                          tambah 'rkembar' (resep) & 'bkembar' (bahan) untuk saran "bukan kembar".
 * Aditif & aman diulang.
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
  await klien.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS merged_into BIGINT REFERENCES recipes(id)`);
  await klien.query(`ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS merged_into BIGINT REFERENCES ingredients(id)`);
  await klien.query(`ALTER TABLE menu_review_skips DROP CONSTRAINT IF EXISTS menu_review_skips_kind_check`);
  await klien.query(`ALTER TABLE menu_review_skips ADD CONSTRAINT menu_review_skips_kind_check CHECK (kind IN ('kembar', 'resep', 'nama', 'rkembar', 'bkembar'))`);
  await klien.query("COMMIT");
  console.log("✅ gabung resep & bahan kembar siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
