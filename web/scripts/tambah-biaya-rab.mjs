/**
 * RAB (PR) → estimasi & realisasi biaya di laporan Margin (D-146, permintaan Mas Reza 10 Nov 2026).
 *
 *   node scripts/tambah-biaya-rab.mjs && npm run db:tarik
 *
 * - purchase_request_items.cost_category: kategori biaya tiap baris PR (bahan baku, bunga & dekorasi, BBM, e-toll, …).
 * - invoice_costs.pr_id: baris biaya yang ditulis otomatis dari satu PR (source 'rab') — dihapus & ditulis ulang tiap PR/nota berubah.
 * - Kategori baru di CHECK invoice_costs & quotation_costs (daftar = NILAI_KATEGORI di lib/biaya.ts).
 *
 * Aditif & aman dijalankan berulang kali.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const KATEGORI = [
  "hpp_bahan_baku", "hpp_barang", "tenaga_kerja", "transportasi", "bbm", "e_toll", "delivery", "vendor", "sewa_peralatan",
  "bunga_dekorasi", "akomodasi", "entertainment", "pb1", "partner_fee", "lain_lain",
];
const daftar = KATEGORI.map((k) => `'${k}'`).join(", ");

const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  await klien.query("BEGIN");
  await klien.query(`ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS cost_category VARCHAR(30) NOT NULL DEFAULT 'hpp_bahan_baku'`);
  await klien.query(`ALTER TABLE invoice_costs ADD COLUMN IF NOT EXISTS pr_id BIGINT REFERENCES purchase_requests(id) ON DELETE CASCADE`);
  await klien.query(`CREATE INDEX IF NOT EXISTS invoice_costs_pr_idx ON invoice_costs (pr_id)`);
  for (const tabel of ["invoice_costs", "quotation_costs"]) {
    await klien.query(`ALTER TABLE ${tabel} DROP CONSTRAINT IF EXISTS ${tabel}_category_check`);
    await klien.query(`ALTER TABLE ${tabel} ADD CONSTRAINT ${tabel}_category_check CHECK (category IN (${daftar}))`);
  }
  await klien.query(`DO $$ BEGIN
    ALTER TABLE purchase_request_items ADD CONSTRAINT purchase_request_items_cost_category_check CHECK (cost_category IN (${daftar}));
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await klien.query("COMMIT");
  console.log("✅ biaya RAB siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
