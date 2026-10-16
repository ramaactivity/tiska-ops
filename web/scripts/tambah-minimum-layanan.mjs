/**
 * quotations/invoices.service_charge_minimum — minimum Layanan Penyediaan
 * Perlengkapan Buffet & Stall (Bogor Rp1,5 jt, Jabodetabek Rp2,5 jt; D-037).
 * Nilai layanan = max(persen × dasar, minimum), hanya bila ada dasar.
 *
 *   node scripts/tambah-minimum-layanan.mjs && npm run db:tarik
 *
 * Aditif (kolom kosong = perilaku lama persis) & aman dijalankan berulang kali.
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
for (const t of ["quotations", "invoices"]) {
  await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS service_charge_minimum NUMERIC(15,2)`);
  const { rows } = await klien.query(`SELECT count(*)::int n, count(service_charge_minimum)::int terisi FROM ${t}`);
  console.log(`${t}: ${rows[0].n} baris, minimum terisi ${rows[0].terisi}`);
}
await klien.end();
