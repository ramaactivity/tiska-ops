/**
 * Ikut Pesen Menu Pesta — Tahap B: pesanan retail (D-116, docs/14-IKUT-MENU-PESTA.md).
 *
 *   node scripts/tambah-pesanan-ikut-menu-pesta.mjs && npm run db:tarik
 *
 * retail_orders       satu pesanan pembeli → satu invoice retail (invoice_id)
 * retail_order_items  paket × pax (harga snapshot)
 * Aditif & aman diulang.
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
    CREATE TABLE IF NOT EXISTS retail_orders (
      id BIGSERIAL PRIMARY KEY,
      program_id BIGINT NOT NULL REFERENCES retail_programs(id) ON DELETE CASCADE,
      customer_id BIGINT NOT NULL REFERENCES customers(id),
      invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
      recipient_name VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT NOT NULL,
      maps_url VARCHAR(500),
      receive_time VARCHAR(20),
      notes TEXT,
      source VARCHAR(20) NOT NULL DEFAULT 'wa',
      payment_mode VARCHAR(10) NOT NULL DEFAULT 'transfer' CHECK (payment_mode IN ('transfer', 'cod')),
      is_late BOOLEAN NOT NULL DEFAULT false,
      outside_area BOOLEAN NOT NULL DEFAULT false,
      area_status VARCHAR(10) CHECK (area_status IN ('menunggu', 'disetujui', 'ditolak')),
      area_decided_by BIGINT REFERENCES users(id),
      area_decided_at TIMESTAMP(0),
      delivery_fee NUMERIC(12, 0) NOT NULL DEFAULT 0,
      status VARCHAR(12) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'batal')),
      cancel_reason TEXT,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_orders_program_idx ON retail_orders (program_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS retail_order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
      set_id BIGINT NOT NULL REFERENCES retail_program_sets(id) ON DELETE CASCADE,
      pax INTEGER NOT NULL CHECK (pax > 0),
      price NUMERIC(12, 0) NOT NULL
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_order_items_order_idx ON retail_order_items (order_id)`);
  // Hapus program/event yang sudah berpesanan (data tes, pindah data) harus ikut membawa rinciannya.
  await klien.query(`ALTER TABLE retail_order_items DROP CONSTRAINT IF EXISTS retail_order_items_set_id_fkey`);
  await klien.query(`ALTER TABLE retail_order_items ADD CONSTRAINT retail_order_items_set_id_fkey FOREIGN KEY (set_id) REFERENCES retail_program_sets(id) ON DELETE CASCADE`);
  for (const t of ["retail_orders", "retail_order_items"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ retail_orders, retail_order_items siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
