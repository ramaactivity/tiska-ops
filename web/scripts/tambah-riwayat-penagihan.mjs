/**
 * Riwayat penagihan per customer (handoff desain v2 §5, D-060).
 *
 *   node scripts/tambah-riwayat-penagihan.mjs && npm run db:tarik
 *
 * collection_activities: pengingat WA, telepon, janji bayar (+ tanggal
 * janji), catatan — dasar pengelompokan Kartu Piutang ("Tagih sekarang" vs
 * "Menunggu jawaban"). Aditif. RLS + REVOKE.
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
    CREATE TABLE IF NOT EXISTS collection_activities (
      id BIGSERIAL PRIMARY KEY,
      customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('wa','telepon','janji_bayar','catatan')),
      note TEXT,
      promise_date DATE,
      invoice_numbers VARCHAR(500),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS collection_activities_customer_idx ON collection_activities (customer_id, created_at DESC)`);
  await klien.query(`ALTER TABLE collection_activities ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON collection_activities FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE collection_activities_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ collection_activities siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
