/**
 * Push notifikasi PWA (Fase 3.4, D-096).
 *
 *   node scripts/tambah-push.mjs && npm run db:tarik
 *
 * push_subscriptions: satu baris per HP/peramban yang mengaktifkan notifikasi
 * (endpoint unik). Langganan yang ditolak layanan push (404/410) dihapus saat
 * pengiriman. Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      user_agent VARCHAR(255),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      last_sent_at TIMESTAMP(0)
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)`);
  await klien.query(`ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON push_subscriptions FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE push_subscriptions_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ push_subscriptions siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
