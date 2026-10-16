/**
 * PPN sewa alat di quotation & invoice (D-015, D-039).
 *
 *   node scripts/tambah-ppn-sewa-alat.mjs && npm run db:tarik
 *
 * - quotation_items / invoice_items.charge_ppn: baris sewa alat (kena PPN,
 *   bukan PBJT maupun layanan).
 * - quotations / invoices.ppn_percent + ppn_amount: persen saat disimpan &
 *   hasilnya; dokumen lama 0 → angkanya tidak berubah.
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
await klien.query("BEGIN");
try {
  for (const t of ["quotation_items", "invoice_items"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS charge_ppn BOOLEAN NOT NULL DEFAULT false`);
  }
  for (const t of ["quotations", "invoices"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ppn_percent DECIMAL(5,2)`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ppn_amount DECIMAL(15,2) NOT NULL DEFAULT 0`);
  }
  await klien.query("COMMIT");
  console.log("✅ kolom PPN sewa alat siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
