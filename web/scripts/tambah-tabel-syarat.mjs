/**
 * Syarat & Ketentuan per bagian (06-DOKUMEN-QUOTATION §4, D-043).
 *
 *   node scripts/tambah-tabel-syarat.mjs && npm run db:tarik
 *
 * terms_sections: satu baris = satu bagian S&K (I Buffet & Stall, II Nasi Box,
 * II Set Menu, III Harga…, IV–X umum). `applies_to` menentukan kapan bagian
 * ikut dirakit: buffet_stall | set_menu | box | bukan_box | hanya_box | semua.
 * Isi awal = naskah yang dipakai tim sekarang (quotation PDGI rev2 & DIVAS),
 * dari ../data/syarat.json — baris yang sudah ada TIDAK ditimpa (suntingan
 * owner aman). Aditif & aman dijalankan berulang. RLS + REVOKE.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const data = JSON.parse(readFileSync("../data/syarat.json", "utf8"));
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS terms_sections (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('buffet_stall','set_menu','box','bukan_box','hanya_box','semua')),
      sort INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`ALTER TABLE terms_sections ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON terms_sections FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE terms_sections_id_seq FROM anon, authenticated`);
  let baru = 0;
  for (const b of data) {
    const r = await klien.query(
      `INSERT INTO terms_sections (code, title, body, applies_to, sort) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`,
      [b.kode, b.judul, b.isi, b.berlaku, b.urut],
    );
    baru += r.rowCount;
  }
  await klien.query("COMMIT");
  console.log(`✅ terms_sections siap — ${baru} bagian baru dari ${data.length}`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
