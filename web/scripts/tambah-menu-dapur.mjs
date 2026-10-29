/**
 * Rapikan Menu — satu menu dapur, banyak nama jual (D-122).
 *
 *   node scripts/tambah-menu-dapur.mjs && npm run db:tarik
 *
 * menu_aliases       nama lain (nama jual di pricelist/paket/dokumen) → menu dapur yang punya resep.
 *                    name_key = nama yang dirapikan (huruf kecil, tanpa tanda baca) — satu nama hanya milik satu menu.
 * menus.merged_into  menu yang digabung ke menu dapur lain: dinonaktifkan (tidak dihapus) dan menunjuk induknya.
 * menu_review_skips  saran yang ditandai "bukan" (menu kembar / sambungan resep / nama) supaya tidak muncul lagi.
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
  await klien.query(`
    CREATE TABLE IF NOT EXISTS menu_aliases (
      id BIGSERIAL PRIMARY KEY,
      menu_id BIGINT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_key VARCHAR(255) NOT NULL UNIQUE,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS menu_aliases_menu_idx ON menu_aliases (menu_id)`);
  await klien.query(`ALTER TABLE menus ADD COLUMN IF NOT EXISTS merged_into BIGINT REFERENCES menus(id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS menu_review_skips (
      id BIGSERIAL PRIMARY KEY,
      kind VARCHAR(10) NOT NULL CHECK (kind IN ('kembar', 'resep', 'nama')),
      a_key VARCHAR(255) NOT NULL,
      b_key VARCHAR(255) NOT NULL,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      UNIQUE (kind, a_key, b_key)
    )`);
  for (const t of ["menu_aliases", "menu_review_skips"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ nama lain menu, gabung menu, dan penanda saran siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
