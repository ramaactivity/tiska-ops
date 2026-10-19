/**
 * Purchasing tahap 1 — Purchase Request dari Kebutuhan Bahan (Fase 3.7a, D-075).
 *
 *   node scripts/tambah-tabel-belanja.mjs && npm run db:tarik
 *
 * purchase_requests: satu daftar belanja per tanggal kebutuhan (boleh lebih
 * dari satu), event_ids = salinan event yang dihitung saat PR dibuat.
 * Alur status: draft → diajukan → disetujui (Finance) → selesai; dikembalikan
 * Finance = kembali ke draft + finance_note. est_total & est_price 🔒 (hanya
 * peran yang boleh melihat biaya). Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id BIGSERIAL PRIMARY KEY,
      pr_number VARCHAR(30) NOT NULL UNIQUE,
      need_date DATE NOT NULL,
      event_ids BIGINT[] NOT NULL DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','diajukan','disetujui','selesai','batal')),
      est_total NUMERIC(15,2) NOT NULL DEFAULT 0,
      transfer_amount NUMERIC(15,2) CHECK (transfer_amount IS NULL OR transfer_amount >= 0),
      notes TEXT,
      finance_note TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      submitted_at TIMESTAMP(0),
      approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP(0),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_requests_need_date_idx ON purchase_requests (need_date)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON purchase_requests (status)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS purchase_request_items (
      id BIGSERIAL PRIMARY KEY,
      pr_id BIGINT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
      ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE SET NULL,
      item_name VARCHAR(255) NOT NULL,
      qty_needed NUMERIC(14,3),
      usage_unit VARCHAR(30),
      qty_to_buy NUMERIC(14,3) NOT NULL CHECK (qty_to_buy >= 0),
      buy_unit VARCHAR(30),
      est_price NUMERIC(15,2) CHECK (est_price IS NULL OR est_price >= 0),
      source VARCHAR(10) NOT NULL DEFAULT 'hitung' CHECK (source IN ('hitung','manual')),
      note VARCHAR(255),
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_request_items_pr_idx ON purchase_request_items (pr_id, sort)`);
  for (const t of ["purchase_requests", "purchase_request_items"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel purchase_requests & purchase_request_items siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
