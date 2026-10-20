/**
 * BAST — berita acara serah terima per kloter (Fase 2.5, D-103).
 *
 *   node scripts/tambah-bast.mjs && npm run db:tarik
 *
 * Satu BAST per kloter (kloter_id unik → kiriman ulang dari antrian HP aman).
 * items = salinan barang yang diserahkan saat ditandatangani (tanpa harga).
 * Tanda tangan & foto di bucket "bukti" (tertutup). Aditif & aman diulang.
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
    CREATE TABLE IF NOT EXISTS basts (
      id BIGSERIAL PRIMARY KEY,
      bast_number VARCHAR(30) NOT NULL UNIQUE,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      kloter_id BIGINT NOT NULL UNIQUE REFERENCES event_kloters(id) ON DELETE CASCADE,
      receiver_name VARCHAR(120) NOT NULL,
      condition VARCHAR(10) NOT NULL CHECK (condition IN ('baik', 'catatan')),
      note VARCHAR(500),
      items JSONB NOT NULL,
      signature_path VARCHAR(300) NOT NULL,
      photo_path VARCHAR(300),
      signed_at TIMESTAMP(0) NOT NULL,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS basts_event_idx ON basts (event_id)`);
  await klien.query(`ALTER TABLE basts ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON basts FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE basts_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ basts siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
