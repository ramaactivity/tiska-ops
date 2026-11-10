/**
 * Biaya Sewa per event (D-147, permintaan Mas Reza 10 Nov 2026): Tiya mencatat sewa (alat makan, tenda,
 * kendaraan, venue, dekorasi, …) untuk event tertentu → langsung jadi biaya realisasi di Margin.
 *
 *   node scripts/tambah-biaya-sewa.mjs && npm run db:tarik
 *
 * - rental_costs: satu baris = satu pembayaran sewa (bukti foto di bucket "bukti", jalur belanja/…).
 * - invoice_costs.rental_cost_id: baris Margin yang ditulis otomatis dari satu biaya sewa (source 'sewa').
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
  await klien.query(`CREATE TABLE IF NOT EXISTS rental_costs (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('alat_makan', 'tenda', 'kendaraan', 'venue', 'dekorasi', 'lain')),
      vendor VARCHAR(255),
      paid_at DATE NOT NULL,
      amount NUMERIC(15, 0) NOT NULL CHECK (amount > 0),
      note VARCHAR(500),
      proof_paths JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(10) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'batal')),
      cancel_reason VARCHAR(500),
      cancelled_by BIGINT REFERENCES users(id),
      cancelled_at TIMESTAMP(0),
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS rental_costs_event_idx ON rental_costs (event_id)`);
  await klien.query(`ALTER TABLE invoice_costs ADD COLUMN IF NOT EXISTS rental_cost_id BIGINT REFERENCES rental_costs(id) ON DELETE CASCADE`);
  await klien.query(`CREATE INDEX IF NOT EXISTS invoice_costs_rental_idx ON invoice_costs (rental_cost_id)`);
  await klien.query(`ALTER TABLE rental_costs ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON rental_costs FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE rental_costs_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ biaya sewa siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
