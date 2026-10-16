/**
 * Pustaka pricelist (Fase 1.4, D-035).
 *
 *   node scripts/tambah-tabel-pricelist.mjs && npm run db:tarik
 *
 * - pricelists: satu pricelist = satu konteks jual (Bogor, Jakarta corporate,
 *   wedding, hampers musiman, venue rekanan, ...), slug untuk link permanen
 *   /pl/<slug> yang selalu menuju versi aktif.
 * - pricelist_files: tiap versi PDF (asli + versi ringan untuk WA bila ada).
 *   Tepat satu versi aktif per pricelist (dijaga di kode, dalam transaksi).
 * - pricelist_sends: catatan siapa membuka/menyalin/mengirim pricelist mana.
 * - Bucket storage "pricelist" TERTUTUP: file hanya keluar lewat /pl/<slug>
 *   (tautan bertanda tangan berumur pendek), jadi versi lama tidak beredar.
 *
 * Aditif & aman dijalankan berulang kali.
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

const TABEL = ["pricelists", "pricelist_files", "pricelist_sends"];
await klien.query("BEGIN");
try {
  await klien.query(`
    CREATE TABLE IF NOT EXISTS pricelists (
      id          BIGSERIAL PRIMARY KEY,
      code        VARCHAR(10) NOT NULL CONSTRAINT pricelists_code_unique UNIQUE,
      slug        VARCHAR(80) NOT NULL CONSTRAINT pricelists_slug_unique UNIQUE,
      name        VARCHAR(255) NOT NULL,
      segment     VARCHAR(50),
      region      VARCHAR(20) CONSTRAINT pricelists_region_check CHECK (region IN ('bogor', 'jakarta', 'semua')),
      venue       VARCHAR(100),
      price_basis VARCHAR(20) CONSTRAINT pricelists_basis_check CHECK (price_basis IN ('nett', 'plus_plus')),
      seasonal    BOOLEAN NOT NULL DEFAULT false,
      status      VARCHAR(20) NOT NULL DEFAULT 'aktif' CONSTRAINT pricelists_status_check CHECK (status IN ('aktif', 'arsip')),
      notes       TEXT,
      created_at  TIMESTAMP(0),
      updated_at  TIMESTAMP(0)
    )
  `);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS pricelist_files (
      id           BIGSERIAL PRIMARY KEY,
      pricelist_id BIGINT NOT NULL REFERENCES pricelists(id) ON DELETE CASCADE,
      version      INTEGER NOT NULL,
      file_path    VARCHAR(255) NOT NULL,
      file_size    BIGINT NOT NULL,
      light_path   VARCHAR(255),
      light_size   BIGINT,
      pages        INTEGER,
      change_note  TEXT,
      is_active    BOOLEAN NOT NULL DEFAULT false,
      uploaded_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMP(0),
      CONSTRAINT pricelist_files_version_unique UNIQUE (pricelist_id, version)
    )
  `);
  // Satu versi aktif per pricelist dijaga di kode (dalam transaksi), BUKAN
  // dengan partial unique index: Prisma salah membacanya sebagai relasi
  // satu-ke-satu sehingga riwayat versi tidak bisa dibaca.
  await klien.query(`DROP INDEX IF EXISTS pricelist_files_satu_aktif`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS pricelist_sends (
      id           BIGSERIAL PRIMARY KEY,
      pricelist_id BIGINT NOT NULL REFERENCES pricelists(id) ON DELETE CASCADE,
      file_id      BIGINT REFERENCES pricelist_files(id) ON DELETE SET NULL,
      user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
      kind         VARCHAR(20) NOT NULL CONSTRAINT pricelist_sends_kind_check CHECK (kind IN ('wa', 'salin', 'buka')),
      created_at   TIMESTAMP(0)
    )
  `);
  await klien.query(`CREATE INDEX IF NOT EXISTS pricelist_sends_pricelist_idx ON pricelist_sends (pricelist_id, created_at DESC)`);
  for (const t of TABEL) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
  }
  await klien.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`);
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

const { rows } = await klien.query(
  `SELECT c.relname AS t, c.relrowsecurity AS rls,
          (SELECT count(*)::int FROM information_schema.role_table_grants g
            WHERE g.table_name = c.relname AND g.grantee IN ('anon', 'authenticated')) AS terbuka
     FROM pg_class c WHERE c.relname = ANY($1) ORDER BY c.relname`,
  [TABEL],
);
for (const r of rows) console.log(`${r.t}: RLS ${r.rls} · hak anon ${r.terbuka}`);
if (rows.length !== TABEL.length || rows.some((r) => !r.rls || r.terbuka)) throw new Error("Tabel belum lengkap/aman.");
await klien.end();

/* ---------- Bucket tertutup ---------- */
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: daftar } = await sb.storage.listBuckets();
const ada = daftar?.find((b) => b.name === "pricelist");
if (!ada) {
  const { error } = await sb.storage.createBucket("pricelist", { public: false, fileSizeLimit: "50MB", allowedMimeTypes: ["application/pdf"] });
  if (error) throw new Error(`Bucket gagal dibuat: ${error.message}`);
} else if (ada.public) {
  const { error } = await sb.storage.updateBucket("pricelist", { public: false, fileSizeLimit: "50MB", allowedMimeTypes: ["application/pdf"] });
  if (error) throw new Error(`Bucket gagal ditutup: ${error.message}`);
}
const { data: b } = await sb.storage.getBucket("pricelist");
console.log(`bucket pricelist: publik=${b?.public} batas=${b?.file_size_limit}`);
console.log("selesai");
