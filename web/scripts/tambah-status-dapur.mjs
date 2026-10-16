/**
 * Status masak per kloter (08-TIM-PWA §5, D-056): dimasak → packing → siap,
 * di tabel kloter_tracking yang sama dengan status kirim driver.
 *
 *   node scripts/tambah-status-dapur.mjs
 *
 * Hanya MELEBARKAN batasan status (nilai lama tetap sah). Aman diulang.
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
  await klien.query(`ALTER TABLE kloter_tracking DROP CONSTRAINT IF EXISTS kloter_tracking_status_check`);
  await klien.query(`ALTER TABLE kloter_tracking ADD CONSTRAINT kloter_tracking_status_check
    CHECK (status IN ('dimasak','packing','siap','berangkat','tiba','selesai'))`);
  await klien.query("COMMIT");
  console.log("✅ status dapur diizinkan di kloter_tracking");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
