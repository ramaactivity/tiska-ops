/**
 * Sewa alat di quotation/invoice (D-209, 18 Nov 2026).
 *
 *   node scripts/tambah-sewa-alat.mjs
 *
 * equipment.for_rent       BOOLEAN — disewakan ke klien (tampil di section Sewa alat). Yang tidak = aset operasional.
 *                          13 alat yang ada (semai dari tabel sewa S&K, D-089, semuanya berharga sewa) → true.
 * equipment.source         'milik' | 'vendor' — Tiska sendiri atau disewa lagi ke vendor (klien tetap melihatnya alat Tiska).
 * equipment.supplier_id    vendor (suppliers), bila source = vendor.
 * equipment.vendor_price   harga sewa dari vendor (biaya Tiska).
 * equipment.vendor_terms   paket & syarat sewa dari vendor.
 * quotation_items.kind / invoice_items.kind              'alat' untuk baris section Sewa alat (NULL = menu).
 * quotation_items.equipment_id / invoice_items.equipment_id   alat dari katalog (NULL = ditulis sendiri).
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
  const ada = (await klien.query(`SELECT 1 FROM information_schema.columns WHERE table_name='equipment' AND column_name='for_rent'`)).rowCount > 0;
  await klien.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS for_rent BOOLEAN NOT NULL DEFAULT false`);
  await klien.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'milik'`);
  await klien.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id)`);
  await klien.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS vendor_price NUMERIC(15,2)`);
  await klien.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS vendor_terms TEXT`);
  // Hanya saat kolom baru dibuat: alat bersemai dari tabel sewa S&K memang yang disewakan.
  const r = ada ? { rowCount: 0 } : await klien.query(`UPDATE equipment SET for_rent = true WHERE rental_price IS NOT NULL`);
  for (const t of ["quotation_items", "invoice_items"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS kind TEXT`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS equipment_id BIGINT REFERENCES equipment(id)`);
  }
  await klien.query("COMMIT");
  console.log(`✅ kolom sewa alat siap; alat ditandai disewakan: ${r.rowCount}`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
