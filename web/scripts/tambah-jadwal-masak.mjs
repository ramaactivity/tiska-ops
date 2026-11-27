/**
 * Mesin Jadwal Masak M1 (docs/24): jadwal produksi menempel ke pesanan, satu baris per pesanan per tanggal.
 *
 *   node scripts/tambah-jadwal-masak.mjs && npx prisma generate
 *
 * order_key = id pesanan di lib/pesanan-dapur ("invoice-123", "program-4", id event lama).
 * sessions = [{judul, batch, langkah:[{mulai, selesai, teks, rincian}]}] (zod di lib/rencana-masak).
 * order_snapshot = sidik pesanan saat disimpan → tanda "Pesanan berubah".
 * Aditif & aman dijalankan berulang kali; RLS menyala tanpa kebijakan publik.
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
  await klien.query(`CREATE TABLE IF NOT EXISTS production_plans (
    id BIGSERIAL PRIMARY KEY,
    order_key VARCHAR(40) NOT NULL,
    date DATE NOT NULL,
    order_name VARCHAR(255),
    title VARCHAR(200),
    notes TEXT,
    sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_snapshot JSONB,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_key, date)
  )`);
  await klien.query("CREATE INDEX IF NOT EXISTS production_plans_date ON production_plans (date)");
  await klien.query("ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY");
  await klien.query("COMMIT");
  console.log("✅ production_plans siap");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
