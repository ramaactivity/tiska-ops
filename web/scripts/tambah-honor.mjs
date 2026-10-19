/**
 * Honor tim & DW (Fase 3.9a, D-091).
 *
 *   node scripts/tambah-honor.mjs && npm run db:tarik
 *
 * honor_rates: tarif per peran tugas × status kerja (tetap/freelance) — angka
 * belum ada, diisi Finance lewat halaman Honor & DW. users.employment_type:
 * status kerja akun tim (NULL = tetap). event_assignments: absen captain
 * (hadir, jam datang–pulang, HP DW) + honor (fee, status diajukan → dikunci →
 * dibayar, bukti transfer). Aditif & aman dijalankan berulang.
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
    CREATE TABLE IF NOT EXISTS honor_rates (
      id BIGSERIAL PRIMARY KEY,
      role VARCHAR(20) NOT NULL,
      employment VARCHAR(10) NOT NULL CHECK (employment IN ('tetap','freelance')),
      amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
      updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      UNIQUE (role, employment)
    )`);
  await klien.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(10)`);
  const kol = [
    "attended BOOLEAN",
    "arrive_time VARCHAR(5)",
    "leave_time VARCHAR(5)",
    "contact_phone VARCHAR(50)",
    "fee NUMERIC(15,2)",
    "fee_note VARCHAR(255)",
    "honor_status VARCHAR(10)",
    "submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "submitted_at TIMESTAMP(0)",
    "locked_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "locked_at TIMESTAMP(0)",
    "paid_by BIGINT REFERENCES users(id) ON DELETE SET NULL",
    "paid_at DATE",
    "proof_path VARCHAR(500)",
  ];
  for (const k of kol) await klien.query(`ALTER TABLE event_assignments ADD COLUMN IF NOT EXISTS ${k}`);
  const cek = async (nama, sql) => {
    const { rows } = await klien.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [nama]);
    if (!rows.length) await klien.query(sql);
  };
  await cek("users_employment_type_check", `ALTER TABLE users ADD CONSTRAINT users_employment_type_check CHECK (employment_type IS NULL OR employment_type IN ('tetap','freelance'))`);
  await cek("event_assignments_honor_status_check", `ALTER TABLE event_assignments ADD CONSTRAINT event_assignments_honor_status_check CHECK (honor_status IS NULL OR honor_status IN ('diajukan','dikunci','dibayar'))`);
  await cek("event_assignments_fee_check", `ALTER TABLE event_assignments ADD CONSTRAINT event_assignments_fee_check CHECK (fee IS NULL OR fee >= 0)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_assignments_honor_idx ON event_assignments (honor_status)`);
  await klien.query(`ALTER TABLE honor_rates ENABLE ROW LEVEL SECURITY`);
  await klien.query(`REVOKE ALL ON honor_rates FROM anon, authenticated`);
  await klien.query(`REVOKE ALL ON SEQUENCE honor_rates_id_seq FROM anon, authenticated`);
  await klien.query("COMMIT");
  console.log("✅ honor_rates, users.employment_type, kolom absen & honor event_assignments siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
