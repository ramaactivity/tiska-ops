/**
 * Penanda "gambar tanda tangan sudah termasuk cap/logo TISKA" (12 Nov 2026).
 *
 *   node scripts/tambah-cap-ttd.mjs
 *
 * signatories.signature_has_stamp   true = gambar tanda tangannya sudah memuat logo TISKA, jadi kwitansi tidak menambah
 *                                   cap digital kedua (bisa tetap dinyalakan di halaman cetak).
 * Diisi true untuk Ariz Rakhma (id 10) — satu-satunya gambar tanda tangan aktif yang memuat logo (dicek 12 Nov).
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
  await klien.query(`ALTER TABLE signatories ADD COLUMN IF NOT EXISTS signature_has_stamp BOOLEAN NOT NULL DEFAULT false`);
  const r = await klien.query(`UPDATE signatories SET signature_has_stamp = true WHERE id = 10 AND name = 'Ariz Rakhma' RETURNING id, name`);
  await klien.query("COMMIT");
  console.log("✅ kolom signature_has_stamp siap; ditandai:", r.rows);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
