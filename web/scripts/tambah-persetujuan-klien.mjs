/**
 * Persetujuan klien atas quotation (01-SPEC E.12, D-044).
 *
 *   node scripts/tambah-persetujuan-klien.mjs && npm run db:tarik
 *
 * quotations: client_approval_method (wa|telepon|email|tanda_tangan|langsung),
 * client_approval_note, client_approval_proof (jalur berkas di bucket
 * "bukti"), client_approved_at, client_approved_by (yang mencatat).
 * Bucket "bukti" TERTUTUP: gambar/PDF bukti hanya keluar lewat tautan
 * bertanda tangan. Aditif & aman dijalankan berulang.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
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
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_approval_method VARCHAR(20)`);
  await klien.query(`ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_client_approval_method_check`);
  await klien.query(`ALTER TABLE quotations ADD CONSTRAINT quotations_client_approval_method_check
    CHECK (client_approval_method IS NULL OR client_approval_method IN ('wa','telepon','email','tanda_tangan','langsung'))`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_approval_note TEXT`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_approval_proof VARCHAR(500)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMP(0)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL`);
  await klien.query("COMMIT");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: ada } = await supabase.storage.getBucket("bukti");
if (!ada) {
  const { error } = await supabase.storage.createBucket("bukti", {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  });
  if (error) throw new Error(`Bucket bukti gagal dibuat: ${error.message}`);
}
const { data: b } = await supabase.storage.getBucket("bukti");
console.log(`✅ kolom persetujuan klien siap · bucket bukti publik=${b?.public}`);
