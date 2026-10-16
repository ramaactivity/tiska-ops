/**
 * CRM dasar — lead & aktivitas (01-SPEC A, 03-DATA-MODEL §5, D-047).
 *
 *   node scripts/tambah-tabel-lead.mjs && npm run db:tarik
 *
 * leads: calon pesanan dari WA/IG/website/rekanan sebelum (dan sesudah)
 * jadi quotation. stage mengikuti pipeline 01-SPEC A. lead_activities:
 * riwayat kontak & perpindahan tahap. Aditif & aman dijalankan berulang.
 * RLS + REVOKE untuk anon/authenticated.
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
  await klien.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
      quotation_id BIGINT REFERENCES quotations(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      source VARCHAR(20) NOT NULL DEFAULT 'wa'
        CHECK (source IN ('wa','instagram','tiktok','website','rekanan','repeat','lainnya')),
      event_type VARCHAR(255),
      event_date DATE,
      location VARCHAR(255),
      pax INTEGER CHECK (pax IS NULL OR pax >= 0),
      service_form VARCHAR(40),
      budget VARCHAR(255),
      stage VARCHAR(20) NOT NULL DEFAULT 'tanya'
        CHECK (stage IN ('tanya','quotation','dp','test_food','final','berjalan','selesai','batal')),
      lost_reason VARCHAR(255),
      owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      next_followup_at DATE,
      notes TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads (stage)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads (owner_user_id)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS leads_followup_idx ON leads (next_followup_at)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id BIGSERIAL PRIMARY KEY,
      lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('chat','telepon','kirim_pl','kirim_quo','catatan','tahap')),
      body TEXT NOT NULL,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON lead_activities (lead_id, created_at)`);
  for (const t of ["leads", "lead_activities"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel leads & lead_activities siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
