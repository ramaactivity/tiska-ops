/**
 * updated_by di quotations & invoices — "terakhir diubah oleh", kolom yang
 * ditambahkan aplikasi lama (Aplikasi Penjualan TC, Nov 2026). Wajib ada
 * supaya Pindah data lama (D-107) tidak membuang isinya.
 *
 *   node scripts/tambah-diubah-oleh.mjs && npm run db:tarik
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
for (const t of ["quotations", "invoices"]) {
  await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS updated_by BIGINT`);
  await klien.query(`DO $$ BEGIN
    ALTER TABLE ${t} ADD CONSTRAINT ${t}_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
}
await klien.query("COMMIT");
console.log("updated_by siap di quotations & invoices");
await klien.end();
