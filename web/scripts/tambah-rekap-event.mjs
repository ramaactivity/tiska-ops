/**
 * Rekap event (Fase 3.9b, D-092).
 *
 *   node scripts/tambah-rekap-event.mjs && npm run db:tarik
 *
 * events.recap_status: diajukan → disetujui → dikunci (+ siapa/kapan).
 * invoice_costs.source: 'rekap_event' untuk baris biaya yang ditulis otomatis
 * dari rekap (bahan nyata, honor, sewa alat) — ditimpa setiap rekap disetujui
 * ulang; baris manual (source NULL) tidak pernah disentuh. Aditif.
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
  for (const k of [
    "recap_status VARCHAR(10)",
    "recap_submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "recap_submitted_at TIMESTAMP(0)",
    "recap_approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "recap_approved_at TIMESTAMP(0)",
    "recap_locked_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "recap_locked_at TIMESTAMP(0)",
  ]) {
    await klien.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ${k}`);
  }
  const { rows } = await klien.query(`SELECT 1 FROM pg_constraint WHERE conname = 'events_recap_status_check'`);
  if (!rows.length) await klien.query(`ALTER TABLE events ADD CONSTRAINT events_recap_status_check CHECK (recap_status IS NULL OR recap_status IN ('diajukan','disetujui','dikunci'))`);
  await klien.query(`ALTER TABLE invoice_costs ADD COLUMN IF NOT EXISTS source VARCHAR(30)`);
  await klien.query("COMMIT");
  console.log("✅ events.recap_*, invoice_costs.source siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
