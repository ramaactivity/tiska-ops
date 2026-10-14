/**
 * Tabel bahan, harga bahan, resep, dan baris resep (Fase 1.1).
 *
 *   node scripts/tambah-tabel-resep.mjs && npm run db:tarik
 *
 * Harga SENGAJA dipisah ke ingredient_prices: resep & takaran dibaca dapur,
 * harga hanya owner & finance (D-006). Tidak ada kolom harga di tabel yang
 * dibaca dapur, jadi tidak ada yang bisa "lupa disaring".
 *
 * Satu harga berlaku per bahan = baris terbaru (effective_at). Riwayat harga
 * tetap tersimpan — naik-turunnya harga bahan dipakai peringatan untung.
 *
 * Aditif & aman dijalankan berulang kali.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");

const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const TABEL = ["ingredients", "ingredient_prices", "recipes", "recipe_lines"];

await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id                 BIGSERIAL PRIMARY KEY,
      code               VARCHAR(30) NOT NULL CONSTRAINT ingredients_code_unique UNIQUE,
      category           VARCHAR(50) NOT NULL,
      name               VARCHAR(255) NOT NULL,
      brand              VARCHAR(255),
      variant            VARCHAR(255),
      purchase_qty       NUMERIC(18,6),
      purchase_unit      VARCHAR(50),
      usage_unit         VARCHAR(50),
      usage_qty_per_pack NUMERIC(18,6),
      source             VARCHAR(30) NOT NULL DEFAULT 'beli'
                         CONSTRAINT ingredients_source_check CHECK (source IN ('beli', 'produksi_internal')),
      status             VARCHAR(30) NOT NULL DEFAULT 'ok'
                         CONSTRAINT ingredients_status_check CHECK (status IN ('ok', 'lengkapi', 'cek_konversi')),
      is_placeholder     BOOLEAN NOT NULL DEFAULT false,
      notes              TEXT,
      created_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at         TIMESTAMP(0),
      updated_at         TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS ingredient_prices (
      id                   BIGSERIAL PRIMARY KEY,
      ingredient_id        BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      price_per_pack       NUMERIC(15,2),
      price_per_usage_unit NUMERIC(24,10) NOT NULL,
      source               VARCHAR(30) NOT NULL
                           CONSTRAINT ingredient_prices_source_check CHECK (source IN ('impor', 'pembelian', 'manual')),
      source_note          TEXT,
      effective_at         TIMESTAMP(0) NOT NULL,
      created_by           BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at           TIMESTAMP(0)
    )
  `);
  await klien.query(
    `CREATE INDEX IF NOT EXISTS ingredient_prices_ingredient_effective_idx
       ON ingredient_prices (ingredient_id, effective_at DESC)`,
  );
  await klien.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id                 BIGSERIAL PRIMARY KEY,
      code               VARCHAR(30) NOT NULL CONSTRAINT recipes_code_unique UNIQUE,
      name               VARCHAR(255) NOT NULL,
      sheet              VARCHAR(100),
      portions_per_batch NUMERIC(10,2),
      status             VARCHAR(30) NOT NULL DEFAULT 'perkiraan'
                         CONSTRAINT recipes_status_check CHECK (status IN ('standar', 'perkiraan', 'belum_ada')),
      notes              TEXT,
      updated_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at         TIMESTAMP(0),
      updated_at         TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS recipe_lines (
      id            BIGSERIAL PRIMARY KEY,
      recipe_id     BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
      qty_per_batch NUMERIC(18,6) NOT NULL DEFAULT 0,
      usage_unit    VARCHAR(50),
      sort          INTEGER NOT NULL DEFAULT 0,
      note          TEXT,
      created_at    TIMESTAMP(0),
      updated_at    TIMESTAMP(0)
    )
  `);
  await klien.query(`CREATE INDEX IF NOT EXISTS recipe_lines_recipe_idx ON recipe_lines (recipe_id, sort)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS recipe_lines_ingredient_idx ON recipe_lines (ingredient_id)`);

  for (const t of TABEL) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
  }
  await klien.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`);
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

const { rows } = await klien.query(
  `SELECT c.relname AS t, c.relrowsecurity AS rls,
          (SELECT count(*)::int FROM information_schema.role_table_grants g
            WHERE g.table_name = c.relname AND g.grantee IN ('anon', 'authenticated')) AS terbuka
     FROM pg_class c WHERE c.relname = ANY($1) ORDER BY c.relname`,
  [TABEL],
);
for (const r of rows) console.log(`${r.t}: RLS ${r.rls} · hak anon ${r.terbuka}`);
if (rows.length !== TABEL.length || rows.some((r) => !r.rls || r.terbuka)) throw new Error("Tabel belum lengkap/aman.");

await klien.end();
console.log("selesai");
