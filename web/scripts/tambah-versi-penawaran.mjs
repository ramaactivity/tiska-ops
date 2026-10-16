/**
 * Revisi berversi quotation (01-SPEC E.10, D-042).
 *
 *   node scripts/tambah-versi-penawaran.mjs && npm run db:tarik
 *
 * - quotations.revision: 0 = versi asli; naik tiap kali quotation yang sudah
 *   dikirim/ditolak/kadaluarsa diubah (nomor mendapat akhiran -R2, -R3).
 * - quotation_versions: salinan utuh (jsonb, tanpa HPP) versi SEBELUM diubah.
 *
 * Aditif & aman dijalankan berulang kali. RLS + REVOKE untuk anon/authenticated.
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
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS quotation_versions (
      id BIGSERIAL PRIMARY KEY,
      quotation_id BIGINT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      quotation_number VARCHAR(255) NOT NULL,
      snapshot JSONB NOT NULL,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CONSTRAINT quotation_versions_unik UNIQUE (quotation_id, revision)
    )`);
  await klien.query(`ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON quotation_versions FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE quotation_versions_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ revisi berversi quotation siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
