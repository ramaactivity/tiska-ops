/**
 * Status kirim per kloter + bukti foto (08-TIM-PWA §5–6, D-054).
 *
 *   node scripts/tambah-status-kloter.mjs && npm run db:tarik
 *
 * kloter_tracking: berangkat → tiba (foto wajib) → selesai; siapa, kapan,
 * lokasi (bila diizinkan HP), jalur foto di bucket tertutup "bukti".
 * Satu baris per status per kloter (ditekan ulang = diperbarui).
 * Aditif. RLS + REVOKE.
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
    CREATE TABLE IF NOT EXISTS kloter_tracking (
      id BIGSERIAL PRIMARY KEY,
      kloter_id BIGINT NOT NULL REFERENCES event_kloters(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL CHECK (status IN ('berangkat','tiba','selesai')),
      by_user BIGINT REFERENCES users(id) ON DELETE SET NULL,
      at TIMESTAMP(0) NOT NULL DEFAULT now(),
      lat DECIMAL(9,6),
      lng DECIMAL(9,6),
      photo_path VARCHAR(500),
      CONSTRAINT kloter_tracking_unik UNIQUE (kloter_id, status)
    )`);
  await klien.query(`ALTER TABLE kloter_tracking ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON kloter_tracking FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE kloter_tracking_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ kloter_tracking siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
