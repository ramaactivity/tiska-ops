/**
 * Foto Menu — Tahap C: link galeri untuk klien (D-126, docs/15-FOTO-MENU.md).
 *
 *   node scripts/tambah-link-galeri.mjs && npm run db:tarik
 *
 * menu_galleries   satu baris = satu link /galeri/<token> berisi foto pilihan admin (urutan = photo_ids).
 *                  Berlaku 30 hari (expires_at), bisa dimatikan (disabled_at). Dibuka klien = first/last_opened_at
 *                  + open_count (dicatat dari browser, jadi pratinjau link WhatsApp tidak terhitung).
 * Aditif & aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS menu_galleries (
      id BIGSERIAL PRIMARY KEY,
      token VARCHAR(32) NOT NULL UNIQUE,
      recipient VARCHAR(120),
      photo_ids BIGINT[] NOT NULL,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      expires_at TIMESTAMP(0) NOT NULL,
      disabled_at TIMESTAMP(0),
      first_opened_at TIMESTAMP(0),
      last_opened_at TIMESTAMP(0),
      open_count INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`ALTER TABLE menu_galleries ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON menu_galleries FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE menu_galleries_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ tabel link galeri siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
