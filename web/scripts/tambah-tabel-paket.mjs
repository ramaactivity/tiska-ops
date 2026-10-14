/**
 * Tabel bentuk penyajian, menu, paket, dan isi paket (Fase 1.3, D-008).
 *
 *   node scripts/tambah-tabel-paket.mjs && npm run db:tarik
 *
 * - service_forms: box reguler/sedang/premium, buffet, stall, ... + biaya
 *   kemasan per porsi (box & alat makan). Dipisah dari isi paket supaya paket
 *   yang sama bisa dijual sebagai box ATAU buffet dengan HPP yang tepat.
 * - menus: hidangan yang dijual (nama, kategori, dapur), boleh terhubung ke
 *   resep. Banyak item paket belum punya pasangan resep → recipe_id kosong.
 * - packages + package_items: isi paket. hpp_snapshot = HPP per porsi item
 *   dari file Excel paket, dipakai selama item belum terhubung resep.
 *
 * Kolom biaya (packaging_cost, hpp_snapshot) hanya dibaca untuk peran yang
 * boleh melihat biaya (lib/peran.ts bolehLihatBiaya).
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

const TABEL = ["service_forms", "menus", "packages", "package_items"];

await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS service_forms (
      id             BIGSERIAL PRIMARY KEY,
      code           VARCHAR(30) NOT NULL CONSTRAINT service_forms_code_unique UNIQUE,
      name           VARCHAR(100) NOT NULL,
      packaging_cost NUMERIC(15,2),
      notes          TEXT,
      sort           INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMP(0),
      updated_at     TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS menus (
      id         BIGSERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL CONSTRAINT menus_name_unique UNIQUE,
      category   VARCHAR(50),
      kitchen    VARCHAR(20) CONSTRAINT menus_kitchen_check CHECK (kitchen IN ('masak', 'pastry')),
      recipe_id  BIGINT REFERENCES recipes(id) ON DELETE SET NULL,
      active     BOOLEAN NOT NULL DEFAULT true,
      notes      TEXT,
      created_at TIMESTAMP(0),
      updated_at TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id              BIGSERIAL PRIMARY KEY,
      code            VARCHAR(30) NOT NULL CONSTRAINT packages_code_unique UNIQUE,
      name            VARCHAR(255) NOT NULL,
      line            VARCHAR(50),
      kind            VARCHAR(20) NOT NULL DEFAULT 'fixed'
                      CONSTRAINT packages_kind_check CHECK (kind IN ('fixed', 'choice', 'bundle')),
      price           NUMERIC(15,2),
      service_form_id BIGINT REFERENCES service_forms(id) ON DELETE SET NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'aktif'
                      CONSTRAINT packages_status_check CHECK (status IN ('aktif', 'arsip')),
      notes           TEXT,
      created_at      TIMESTAMP(0),
      updated_at      TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS package_items (
      id           BIGSERIAL PRIMARY KEY,
      package_id   BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      menu_id      BIGINT NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
      qty          NUMERIC(10,3) NOT NULL DEFAULT 1,
      sort         INTEGER NOT NULL DEFAULT 0,
      note         TEXT,
      hpp_snapshot NUMERIC(18,6),
      created_at   TIMESTAMP(0),
      updated_at   TIMESTAMP(0)
    )
  `);
  await klien.query(`CREATE INDEX IF NOT EXISTS package_items_package_idx ON package_items (package_id, sort)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS package_items_menu_idx ON package_items (menu_id)`);

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
