/**
 * Gudang tahap 2 — stock opname bulanan (Fase 3.8b, D-088).
 *
 *   node scripts/tambah-tabel-opname.mjs && npm run db:tarik
 *
 * stock_counts: satu opname per bulan (period = tanggal 1, unik). Status
 * berjalan → diajukan → final (Finance). stock_count_lines: per bahan —
 * system_qty = saldo saat dihitung, counted_qty = hasil hitung fisik, reason
 * wajib bila selisih > 5% (dijaga di server). Saat final, selisih dibukukan
 * sebagai stock_movements kind 'opname' (stock_count_line_id, unik).
 * Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS stock_counts (
      id BIGSERIAL PRIMARY KEY,
      period DATE NOT NULL UNIQUE CHECK (EXTRACT(DAY FROM period) = 1),
      status VARCHAR(10) NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan','diajukan','final')),
      notes TEXT,
      finance_note TEXT,
      started_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      submitted_at TIMESTAMP(0),
      finalized_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      finalized_at TIMESTAMP(0),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS stock_count_lines (
      id BIGSERIAL PRIMARY KEY,
      count_id BIGINT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
      ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      system_qty NUMERIC(14,3),
      counted_qty NUMERIC(14,3) CHECK (counted_qty IS NULL OR counted_qty >= 0),
      reason VARCHAR(255),
      counted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      counted_at TIMESTAMP(0),
      UNIQUE (count_id, ingredient_id)
    )`);
  await klien.query(`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS stock_count_line_id BIGINT UNIQUE REFERENCES stock_count_lines(id) ON DELETE CASCADE`);
  for (const t of ["stock_counts", "stock_count_lines"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ stock_counts, stock_count_lines, stock_movements.stock_count_line_id siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
