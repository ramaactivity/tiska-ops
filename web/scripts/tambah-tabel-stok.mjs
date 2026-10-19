/**
 * Gudang tahap 1 — stok bahan & packaging (Fase 3.8a, D-086).
 *
 *   node scripts/tambah-tabel-stok.mjs && npm run db:tarik
 *
 * stock_movements: buku stok per bahan dalam SATUAN STOK (= satuan pakai,
 * atau satuan beli bila satuan pakai kosong). qty bertanda: + masuk, − keluar.
 *   masuk   otomatis dari baris nota/penerimaan (purchase_item_id, unik)
 *   pakai   dari Kebutuhan Bahan per tanggal (usage_date; satu kali per bahan per tanggal)
 *   waste / koreksi   dicatat gudang;  opname   disiapkan untuk 3.8b
 * ingredients.min_stock: stok minimum (satuan stok). purchase_request_items.qty_from_stock:
 * bagian kebutuhan yang diambil dari stok. Aditif & aman dijalankan berulang.
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
  await klien.query(`ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS min_stock NUMERIC(14,3) CHECK (min_stock IS NULL OR min_stock >= 0)`);
  await klien.query(`ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS qty_from_stock NUMERIC(14,3)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGSERIAL PRIMARY KEY,
      ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      kind VARCHAR(10) NOT NULL CHECK (kind IN ('masuk','pakai','waste','koreksi','opname')),
      qty NUMERIC(14,3) NOT NULL CHECK (qty <> 0),
      moved_at DATE NOT NULL,
      purchase_item_id BIGINT UNIQUE REFERENCES purchase_items(id) ON DELETE CASCADE,
      usage_date DATE,
      note VARCHAR(255),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CHECK ((kind = 'pakai') = (usage_date IS NOT NULL))
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS stock_movements_ingredient_idx ON stock_movements (ingredient_id, moved_at)`);
  // Unik biasa (bukan parsial): usage_date hanya terisi untuk 'pakai' (CHECK di atas) dan NULL
  // tidak saling bentrok — hasilnya sama tanpa previewFeatures Prisma.
  await klien.query(`DROP INDEX IF EXISTS stock_movements_pakai_unik`);
  await klien.query(`CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_pakai_tanggal_unik ON stock_movements (ingredient_id, usage_date)`);
  await klien.query(`ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON stock_movements FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE stock_movements_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ stock_movements, ingredients.min_stock, purchase_request_items.qty_from_stock siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
