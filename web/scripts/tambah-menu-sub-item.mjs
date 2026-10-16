/**
 * Menu di sub-item quotation & invoice — tukar menu kategori sama (D-040).
 *
 *   node scripts/tambah-menu-sub-item.mjs && npm run db:tarik
 *
 * - quotation_items / invoice_items.menu_id: menu yang disajikan (sub-item
 *   dari "Tambah dari paket"); dasar HPP saat isi paket ditukar.
 * - swapped_from_menu_id: menu asli paket sebelum ditukar (jejak custom).
 *
 * Aditif (boleh kosong) & aman dijalankan berulang kali.
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
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS menu_id BIGINT REFERENCES menus(id) ON DELETE SET NULL`);
    await klien.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS swapped_from_menu_id BIGINT REFERENCES menus(id) ON DELETE SET NULL`);
  }
  await klien.query("COMMIT");
  console.log("✅ kolom menu sub-item siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
