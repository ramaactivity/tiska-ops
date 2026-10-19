/**
 * Purchasing tahap 3 — supplier, PO tempo, penerimaan, hutang dagang (Fase 3.7c, D-083).
 *
 *   node scripts/tambah-tabel-po.mjs && npm run db:tarik
 *
 * suppliers: master supplier (payment_term_days 0 = cash). purchase_orders +
 * items: pesanan ke supplier (received_qty bertambah tiap penerimaan).
 * Penerimaan barang = baris purchases dengan payment_method 'tempo' (+ supplier,
 * po). supplier_payables: hutang dagang per penerimaan, jatuh tempo dari TOP
 * supplier. Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS suppliers (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      contact_name VARCHAR(255),
      phone VARCHAR(50),
      payment_term_days INTEGER NOT NULL DEFAULT 0 CHECK (payment_term_days BETWEEN 0 AND 365),
      bank_account VARCHAR(255),
      notes TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id BIGSERIAL PRIMARY KEY,
      po_number VARCHAR(30) NOT NULL UNIQUE,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      pr_id BIGINT REFERENCES purchase_requests(id) ON DELETE SET NULL,
      status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','dikirim','sebagian','diterima','batal')),
      order_date DATE NOT NULL,
      expected_date DATE,
      total NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
      notes TEXT,
      cancel_reason TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders (status, order_date)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id BIGSERIAL PRIMARY KEY,
      po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE SET NULL,
      pr_item_id BIGINT REFERENCES purchase_request_items(id) ON DELETE SET NULL,
      item_name VARCHAR(255) NOT NULL,
      qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
      unit VARCHAR(30),
      unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
      received_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS purchase_order_items_po_idx ON purchase_order_items (po_id, sort)`);
  // Penerimaan barang tempo memakai tabel purchases yang sama dengan nota pasar.
  await klien.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(15) NOT NULL DEFAULT 'uang_muka'`);
  await klien.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id)`);
  await klien.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS po_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL`);
  await klien.query(`ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS po_item_id BIGINT REFERENCES purchase_order_items(id) ON DELETE SET NULL`);
  const { rows } = await klien.query(`SELECT 1 FROM pg_constraint WHERE conname = 'purchases_payment_method_check'`);
  if (!rows.length) await klien.query(`ALTER TABLE purchases ADD CONSTRAINT purchases_payment_method_check CHECK (payment_method IN ('uang_muka','tempo'))`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS supplier_payables (
      id BIGSERIAL PRIMARY KEY,
      purchase_id BIGINT NOT NULL UNIQUE REFERENCES purchases(id) ON DELETE CASCADE,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
      due_date DATE NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','lunas','batal')),
      paid_at DATE,
      paid_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      proof_path VARCHAR(500),
      note VARCHAR(255),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS supplier_payables_due_idx ON supplier_payables (status, due_date)`);
  for (const t of ["suppliers", "purchase_orders", "purchase_order_items", "supplier_payables"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ suppliers, purchase_orders(+items), supplier_payables siap; purchases + payment_method/supplier/po");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
