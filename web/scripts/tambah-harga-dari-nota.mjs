/**
 * Harga bahan otomatis dari nota & penerimaan PO (D-094).
 *
 *   node scripts/tambah-harga-dari-nota.mjs && npm run db:tarik
 *
 * ingredient_prices.purchase_item_id: baris harga yang lahir dari satu baris
 * nota (source 'pembelian') — unik; nota dibatalkan → harganya ikut dihapus.
 * Aditif & aman dijalankan berulang.
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
  await klien.query(`ALTER TABLE ingredient_prices ADD COLUMN IF NOT EXISTS purchase_item_id BIGINT UNIQUE REFERENCES purchase_items(id) ON DELETE CASCADE`);
  console.log("✅ ingredient_prices.purchase_item_id siap");
} finally {
  await klien.end();
}
