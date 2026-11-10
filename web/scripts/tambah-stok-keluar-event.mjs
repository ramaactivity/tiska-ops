/**
 * Barang keluar gudang untuk event (D-148, permintaan Mas Reza 10 Nov 2026).
 *
 *   node scripts/tambah-stok-keluar-event.mjs && npm run db:tarik
 *
 * - stock_movements.kind 'keluar': barang dikeluarkan manual (di luar resep: minyak tambahan, gas, kemasan…).
 * - stock_movements.event_id: event tujuan (boleh kosong = keperluan non-event).
 * - stock_movements.unit_cost: harga per satuan stok saat dikeluarkan (dibekukan) → biaya Margin event.
 * - invoice_costs.event_id: baris Margin "barang keluar gudang" milik satu event (source 'stok_keluar').
 *
 * Aditif & aman dijalankan berulang kali.
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
  await klien.query(`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE SET NULL`);
  await klien.query(`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15, 2)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS stock_movements_event_idx ON stock_movements (event_id)`);
  await klien.query(`ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_kind_check`);
  await klien.query(`ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_kind_check CHECK (kind IN ('masuk', 'pakai', 'waste', 'koreksi', 'opname', 'keluar'))`);
  await klien.query(`ALTER TABLE invoice_costs ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE CASCADE`);
  await klien.query(`CREATE INDEX IF NOT EXISTS invoice_costs_event_idx ON invoice_costs (event_id)`);
  await klien.query("COMMIT");
  console.log("✅ barang keluar per event siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
