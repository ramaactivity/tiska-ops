/**
 * Foto Menu — Tahap A (D-124, docs/15-FOTO-MENU.md).
 *
 *   node scripts/tambah-foto-menu.mjs && npm run db:tarik
 *
 * menu_photos   satu baris = satu foto di Cloudflare R2 (bucket tiska-ops-foto): berkas utama ≤2048 px + thumbnail 480 px.
 *               Menempel ke menu dapur ATAU paket; dua-duanya kosong = "Belum ditandai" (hasil unggah massal arsip Drive).
 *               Disembunyikan (hidden) ≠ dihapus: hapus hanya admin/owner dan ikut menghapus berkas di R2.
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
    CREATE TABLE IF NOT EXISTS menu_photos (
      id BIGSERIAL PRIMARY KEY,
      menu_id BIGINT REFERENCES menus(id) ON DELETE SET NULL,
      package_id BIGINT REFERENCES packages(id) ON DELETE SET NULL,
      file_key VARCHAR(200) NOT NULL UNIQUE,
      thumb_key VARCHAR(200) NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL,
      original_name VARCHAR(255),
      serving VARCHAR(12) CHECK (serving IN ('box', 'prasmanan', 'stall', 'plated', 'lainnya')),
      caption VARCHAR(300),
      event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
      is_cover BOOLEAN NOT NULL DEFAULT false,
      hidden BOOLEAN NOT NULL DEFAULT false,
      uploaded_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS menu_photos_menu_idx ON menu_photos (menu_id)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS menu_photos_package_idx ON menu_photos (package_id)`);
  await klien.query(`ALTER TABLE menu_photos ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON menu_photos FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE menu_photos_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ tabel foto menu siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
