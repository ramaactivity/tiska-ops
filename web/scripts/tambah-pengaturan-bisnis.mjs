/**
 * Membuat tabel business_settings — angka bisnis yang boleh diubah owner &
 * finance tanpa deploy (pajak, layanan perlengkapan, delivery fee, termin,
 * batas untung, overhead). Lihat lib/pengaturan-bisnis.ts.
 *
 *   node scripts/tambah-pengaturan-bisnis.mjs && npm run db:tarik
 *
 * Tabelnya sengaja KOSONG: nilai bawaan tinggal di kode (BAWAAN), dan baris
 * hanya ditulis ketika seseorang mengubah angkanya. Dengan begitu tidak ada
 * dua salinan angka yang bisa saling menyimpang.
 *
 * Aditif & aman dijalankan berulang kali.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");

const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS business_settings (
      key        VARCHAR(100) PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0),
      updated_at TIMESTAMP(0)
    )
  `);
  await klien.query(`ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON business_settings FROM anon, authenticated`);
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

const { rows } = await klien.query(
  `SELECT c.relrowsecurity AS rls,
          (SELECT count(*)::int FROM information_schema.role_table_grants
            WHERE table_name = 'business_settings' AND grantee IN ('anon', 'authenticated')) AS terbuka
     FROM pg_class c WHERE c.relname = 'business_settings'`,
);
console.log(`business_settings: RLS ${rows[0].rls} · hak anon/authenticated ${rows[0].terbuka}`);
if (!rows[0].rls || rows[0].terbuka) throw new Error("Tabel masih terbuka.");

await klien.end();
console.log("selesai");
