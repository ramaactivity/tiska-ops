/**
 * Purchasing tahap 2 — Daily Market / uang muka belanja (Fase 3.7b, D-081).
 *
 *   node scripts/tambah-tabel-uang-muka.mjs && npm run db:tarik
 *
 * purchases + purchase_items: nota belanja (pasar/toko) oleh pemegang uang
 * muka, boleh tertaut PR. cash_advances: mutasi uang muka per pemegang —
 * topup (Finance transfer), belanja (= satu purchase), pengembalian (sisa
 * dikembalikan). Saldo = topup − belanja − pengembalian (status posted);
 * tidak boleh minus (dijaga di server). Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS purchases (
      id BIGSERIAL PRIMARY KEY,
      purchase_number VARCHAR(30) NOT NULL UNIQUE,
      holder_user_id BIGINT NOT NULL REFERENCES users(id),
      pr_id BIGINT REFERENCES purchase_requests(id) ON DELETE SET NULL,
      purchased_at DATE NOT NULL,
      shop_name VARCHAR(255),
      total NUMERIC(15,2) NOT NULL CHECK (total >= 0),
      receipt_paths JSONB NOT NULL DEFAULT '[]',
      no_receipt_reason VARCHAR(255),
      notes TEXT,
      status VARCHAR(10) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','batal')),
      cancel_reason TEXT,
      cancelled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      cancelled_at TIMESTAMP(0),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CHECK (jsonb_array_length(receipt_paths) > 0 OR no_receipt_reason IS NOT NULL)
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchases_holder_idx ON purchases (holder_user_id, purchased_at)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchases_pr_idx ON purchases (pr_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id BIGSERIAL PRIMARY KEY,
      purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE SET NULL,
      pr_item_id BIGINT REFERENCES purchase_request_items(id) ON DELETE SET NULL,
      item_name VARCHAR(255) NOT NULL,
      qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
      unit VARCHAR(30),
      unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
      total NUMERIC(15,2) NOT NULL CHECK (total >= 0),
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_items_purchase_idx ON purchase_items (purchase_id, sort)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS cash_advances (
      id BIGSERIAL PRIMARY KEY,
      holder_user_id BIGINT NOT NULL REFERENCES users(id),
      kind VARCHAR(15) NOT NULL CHECK (kind IN ('topup','belanja','pengembalian')),
      amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
      pr_id BIGINT REFERENCES purchase_requests(id) ON DELETE SET NULL,
      purchase_id BIGINT UNIQUE REFERENCES purchases(id) ON DELETE CASCADE,
      note VARCHAR(255),
      proof_path VARCHAR(500),
      status VARCHAR(10) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','batal')),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CHECK ((kind = 'belanja') = (purchase_id IS NOT NULL))
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS cash_advances_holder_idx ON cash_advances (holder_user_id, created_at)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS cash_advances_pr_idx ON cash_advances (pr_id)`);
  for (const t of ["purchases", "purchase_items", "cash_advances"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel purchases, purchase_items, cash_advances siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
