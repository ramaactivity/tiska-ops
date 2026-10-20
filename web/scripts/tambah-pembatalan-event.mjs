/**
 * Pembatalan event & refund (Fase 2.5, D-102).
 *
 *   node scripts/tambah-pembatalan-event.mjs && npm run db:tarik
 *
 * event_cancellations: satu per event. Hitungan refund dibekukan saat
 * dibatalkan (aturan Angka Bisnis bisa berubah sesudahnya). Finance menutupnya
 * sebagai "ditransfer" atau "deposit". Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS event_cancellations (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
      cancelled_on DATE NOT NULL,
      party VARCHAR(20) NOT NULL CHECK (party IN ('klien', 'force_majeure')),
      reason VARCHAR(500) NOT NULL,
      previous_status VARCHAR(20) NOT NULL,
      days_before INT NOT NULL,
      paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      refund_pct NUMERIC(5,2) NOT NULL,
      refund_computed NUMERIC(15,2) NOT NULL,
      refund_amount NUMERIC(15,2) NOT NULL,
      amount_note VARCHAR(500),
      credit_valid_until DATE NOT NULL,
      status VARCHAR(12) NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'ditransfer', 'deposit')),
      settled_on DATE,
      settle_note VARCHAR(500),
      settled_by BIGINT REFERENCES users(id),
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`ALTER TABLE event_cancellations ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON event_cancellations FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE event_cancellations_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ event_cancellations siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
