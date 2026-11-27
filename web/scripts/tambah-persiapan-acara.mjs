/**
 * Persiapan acara besar H-n (docs/25 #5): satu baris per event — target harian (lipat box dll.) + agenda tim.
 *
 *   node scripts/tambah-persiapan-acara.mjs && npx prisma generate
 *
 * data = { target:[{judul, satuan, rincian:[{nama,jumlah}], harian:[{tanggal,target,tercapai}]}], agenda:[…] }
 * (zod di lib/persiapan). Aditif & aman dijalankan berulang kali; RLS menyala tanpa kebijakan publik.
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
try {
  await klien.query("BEGIN");
  await klien.query(`CREATE TABLE IF NOT EXISTS event_preps (
    event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{"target":[],"agenda":[]}'::jsonb,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await klien.query("ALTER TABLE event_preps ENABLE ROW LEVEL SECURITY");
  await klien.query("COMMIT");
  console.log("✅ event_preps siap");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
