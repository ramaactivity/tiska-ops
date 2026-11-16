/**
 * Cetakan tahap 2 (D-183, docs/19): stok + permintaan cetak.
 *
 *   node scripts/tambah-cetakan-stok.mjs
 *
 * print_items.stock_unit / min_stock   satuan stok (lembar|pcs) & batas menipis.
 * print_stock_movements                 masuk / pakai / koreksi (qty bertanda; koreksi menyimpan hasil hitung).
 * print_requests + print_request_lines  "Minta cetak" dari dapur/sales (status sampai diambil; tahap 3 menambah No. Order & bayar).
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
  await klien.query(`ALTER TABLE print_items ADD COLUMN IF NOT EXISTS stock_unit VARCHAR(10) NOT NULL DEFAULT 'lembar' CHECK (stock_unit IN ('lembar','pcs'))`);
  await klien.query(`ALTER TABLE print_items ADD COLUMN IF NOT EXISTS min_stock INTEGER CHECK (min_stock >= 0)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS print_requests (
      id           BIGSERIAL PRIMARY KEY,
      requested_by BIGINT NOT NULL REFERENCES users(id),
      needed_date  DATE NOT NULL,
      note         VARCHAR(500),
      status       VARCHAR(20) NOT NULL DEFAULT 'diajukan'
                   CHECK (status IN ('diajukan','perlu_tanya','disetujui','dipesan','menunggu_bayar','dibayar','diambil','ditolak','batal')),
      reply        VARCHAR(500),
      decided_by   BIGINT REFERENCES users(id),
      decided_at   TIMESTAMP(0),
      created_at   TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at   TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS print_requests_status_idx ON print_requests (status, needed_date)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS print_request_lines (
      id         BIGSERIAL PRIMARY KEY,
      request_id BIGINT NOT NULL REFERENCES print_requests(id) ON DELETE CASCADE,
      item_id    BIGINT NOT NULL REFERENCES print_items(id),
      variant_id BIGINT REFERENCES print_item_variants(id),
      sheets     INTEGER NOT NULL CHECK (sheets > 0)
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS print_request_lines_request_idx ON print_request_lines (request_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS print_stock_movements (
      id          BIGSERIAL PRIMARY KEY,
      item_id     BIGINT NOT NULL REFERENCES print_items(id) ON DELETE CASCADE,
      variant_id  BIGINT REFERENCES print_item_variants(id) ON DELETE CASCADE,
      kind        VARCHAR(10) NOT NULL CHECK (kind IN ('masuk','pakai','koreksi')),
      qty         INTEGER NOT NULL,
      counted_qty INTEGER CHECK (counted_qty >= 0),
      note        VARCHAR(255),
      request_id  BIGINT REFERENCES print_requests(id) ON DELETE SET NULL,
      created_by  BIGINT REFERENCES users(id),
      created_at  TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS print_stock_movements_item_idx ON print_stock_movements (item_id, variant_id)`);
  for (const t of ["print_requests", "print_request_lines", "print_stock_movements"]) await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  // Stiker half cut tetap menempel di lembarnya → dihitung per lembar; label yang dipotong → per pcs.
  await klien.query(`UPDATE print_items SET stock_unit = 'pcs' WHERE kind = 'stok' AND grup IN ('label','sleeve','dokumen') AND COALESCE(finishing, '') NOT ILIKE '%half%' AND stock_unit = 'lembar' AND NOT EXISTS (SELECT 1 FROM print_stock_movements m WHERE m.item_id = print_items.id)`);
  await klien.query("COMMIT");
  console.log("✅ stok & permintaan cetak siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
