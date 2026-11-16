/**
 * Cetakan (docs/19-CETAKAN.md, D-182) — katalog cetakan + varian.
 *
 *   node scripts/tambah-cetakan.mjs && npm run db:tarik
 *
 * print_items          katalog: ukuran (mm), bahan, finishing, isi per lembar A3, harga per A3, link Canva, percetakan.
 * print_item_variants  varian per cetakan (mis. stiker minuman per menu), gambar sendiri.
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
  await klien.query(`
    CREATE TABLE IF NOT EXISTS print_items (
      id            BIGSERIAL PRIMARY KEY,
      name          VARCHAR(150) NOT NULL,
      grup          VARCHAR(20)  NOT NULL CHECK (grup IN ('nama_menu','kartu_ucapan','stiker','label','sleeve','dokumen')),
      kind          VARCHAR(10)  NOT NULL DEFAULT 'stok' CHECK (kind IN ('stok','pesanan')),
      width_mm      NUMERIC(7,1),
      height_mm     NUMERIC(7,1),
      shape         VARCHAR(12)  NOT NULL DEFAULT 'persegi' CHECK (shape IN ('persegi','lingkaran')),
      material      VARCHAR(100),
      finishing     VARCHAR(255),
      pcs_per_sheet INTEGER CHECK (pcs_per_sheet > 0),
      price_per_sheet NUMERIC(12,0) CHECK (price_per_sheet >= 0),
      price_note    VARCHAR(255),
      chat_label    VARCHAR(150),
      size_text     VARCHAR(100),
      supplier_id   BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
      canva_design_id VARCHAR(20),
      canva_url     VARCHAR(500),
      thumbnail_key VARCHAR(300),
      notes         TEXT,
      sort          INTEGER NOT NULL DEFAULT 0,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at    TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at    TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  // Unik biasa (bukan bersyarat): Postgres tetap membolehkan banyak NULL, dan Prisma tidak butuh fitur preview.
  await klien.query(`DROP INDEX IF EXISTS print_items_canva_unik`);
  await klien.query(`CREATE UNIQUE INDEX print_items_canva_unik ON print_items (canva_design_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS print_item_variants (
      id            BIGSERIAL PRIMARY KEY,
      item_id       BIGINT NOT NULL REFERENCES print_items(id) ON DELETE CASCADE,
      name          VARCHAR(150) NOT NULL,
      canva_page    INTEGER CHECK (canva_page > 0),
      thumbnail_key VARCHAR(300),
      sort          INTEGER NOT NULL DEFAULT 0,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at    TIMESTAMP(0) NOT NULL DEFAULT now(),
      UNIQUE (item_id, name)
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS print_item_variants_item_idx ON print_item_variants (item_id, sort)`);
  // Pola keamanan proyek: tabel aplikasi ber-RLS tanpa kebijakan publik (akses hanya lewat server).
  await klien.query(`ALTER TABLE print_items ENABLE ROW LEVEL SECURITY`);
  await klien.query(`ALTER TABLE print_item_variants ENABLE ROW LEVEL SECURITY`);
  await klien.query("COMMIT");
  console.log("✅ tabel cetakan siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
