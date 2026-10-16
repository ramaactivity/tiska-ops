/**
 * Penanda untung & persetujuan owner pada quotation (D-038).
 *
 *   node scripts/tambah-untung-penawaran.mjs && npm run db:tarik
 *
 * - quotation_items / invoice_items.package_id: baris yang berasal dari
 *   "Tambah dari paket" — dasar HPP baris (lib/untung-penawaran.ts).
 * - quotations.owner_approval: 'perlu' bila untung makanan < batas minimum,
 *   'disetujui' setelah owner menyetujui; owner_approved_pct = untung saat
 *   disetujui (turun lagi di bawahnya → perlu persetujuan ulang).
 *
 * Aditif (semua kolom boleh kosong) & aman dijalankan berulang kali.
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
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS package_id BIGINT REFERENCES packages(id) ON DELETE SET NULL`);
  }
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS owner_approval VARCHAR(20)`);
  await klien.query(`ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_owner_approval_check`);
  await klien.query(`ALTER TABLE quotations ADD CONSTRAINT quotations_owner_approval_check CHECK (owner_approval IN ('perlu', 'disetujui'))`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS owner_approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMP(0)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS owner_approved_pct NUMERIC(6,2)`);
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}
const { rows } = await klien.query(
  `SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name IN ('quotation_items','invoice_items') AND column_name = 'package_id')
       OR (table_name = 'quotations' AND column_name LIKE 'owner_%') ORDER BY 1, 2`,
);
console.log(rows.map((r) => `${r.table_name}.${r.column_name}`).join(" · "));
await klien.end();
