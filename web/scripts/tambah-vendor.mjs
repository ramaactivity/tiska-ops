/**
 * Vendor & Supplier (D-133, docs/17 tahap D) — memperluas tabel suppliers (PO, pembelian, hutang tetap memakainya).
 *
 *   node scripts/tambah-vendor.mjs && npm run db:tarik
 *
 * suppliers.category   sekarang salah satu kategori tetap (bahan_baku, roti_kue, sewa_mobil, sewa_alat, venue, dekorasi,
 *                      tenaga, cetak_kemasan, lainnya) — dijaga form; tabel masih kosong saat migrasi.
 * suppliers.address, instagram, rating (1–5, penilaian kantor), partner_id (pihak yang sama juga rekanan pembawa klien).
 * Aditif & aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address VARCHAR(500)`);
  await klien.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS instagram VARCHAR(100)`);
  await klien.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5)`);
  await klien.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES referral_partners(id)`);
  await klien.query("COMMIT");
  console.log("✅ kolom vendor siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
