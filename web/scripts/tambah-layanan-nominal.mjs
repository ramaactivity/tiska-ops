/**
 * Layanan perlengkapan sebagai NOMINAL + KETERANGAN (D-215, 18 Nov 2026) — cara tim menagih layanan selama ini
 * (23 dari 31 quotation: nominal tetap berlabel sendiri, diketik di Biaya tambahan; kolom persen dipakai 0 quotation).
 *
 *   node scripts/tambah-layanan-nominal.mjs
 *
 * quotations & invoices: service_charge_flat NUMERIC(15,2) NULL, service_charge_label TEXT NULL. Aditif & aman diulang;
 * dokumen lama (keduanya NULL) dihitung persis seperti sebelumnya (persen + minimum).
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
  for (const t of ["quotations", "invoices"]) {
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS service_charge_flat NUMERIC(15,2)`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS service_charge_label TEXT`);
  }
  await klien.query("COMMIT");
  const r = await klien.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name IN ('service_charge_flat','service_charge_label') AND table_name IN ('quotations','invoices') ORDER BY 1, 2`);
  console.log("✅ kolom layanan nominal siap:", r.rows.map((x) => `${x.table_name}.${x.column_name} ${x.data_type}`).join(", "));
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
