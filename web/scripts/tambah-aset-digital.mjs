/**
 * Aset Digital (D-127, docs/16-ASET-DAN-PENGINGAT-BAYAR.md).
 *
 *   node scripts/tambah-aset-digital.mjs && npm run db:tarik
 *
 * digital_assets   satu baris = satu tautan (folder/berkas Google Drive, desain Canva, dokumen) yang dibuka dari Tiska Ops.
 *                  event_id terisi = dokumentasi/berkas acara itu (tampil juga di halaman Event).
 *                  Hanya tautan — berkasnya tetap di Drive/Canva; menghapus baris tidak menyentuh berkas aslinya.
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
    CREATE TABLE IF NOT EXISTS digital_assets (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      url VARCHAR(1000) NOT NULL,
      category VARCHAR(20) NOT NULL,
      note VARCHAR(500),
      event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
      pinned BOOLEAN NOT NULL DEFAULT false,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS digital_assets_event_idx ON digital_assets (event_id)`);
  await klien.query(`ALTER TABLE digital_assets ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON digital_assets FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE digital_assets_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ tabel aset digital siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
