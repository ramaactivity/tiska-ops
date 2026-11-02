/**
 * Database customer & rekanan pembawa klien + Partner Fee (D-132, docs/17 tahap B–C).
 *
 *   node scripts/tambah-rekanan.mjs && npm run db:tarik
 *
 * referral_partners   EO, WO, MC, venue, dekorasi, fotografer, planner, komunitas… yang membawa klien.
 *                     fee_pct kosong = Partner Fee bawaan Angka Bisnis (3,5%).
 * customers.client_type   perorangan / kelompok / perusahaan / organisasi / instansi (kosong = ditebak dari nama).
 * customers.partner_id    rekanan yang pertama membawa customer ini (usulan untuk order-ordernya).
 * quotations.partner_id, invoices.partner_id   rekanan order ini (invoice kosong → ikut quotation-nya).
 * partner_fees        Partner Fee yang SUDAH dibayar (satu per invoice). Yang belum dibayar dihitung, tidak disimpan.
 * invoice_costs_category_check   ditambah 'partner_fee' (Partner Fee dibayar = biaya di laporan Margin).
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
    CREATE TABLE IF NOT EXISTS referral_partners (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      kind VARCHAR(20) NOT NULL,
      contact_name VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(150),
      instagram VARCHAR(100),
      bank_account VARCHAR(200),
      fee_pct NUMERIC(5, 2) CHECK (fee_pct >= 0 AND fee_pct <= 50),
      notes VARCHAR(1000),
      active BOOLEAN NOT NULL DEFAULT true,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) CHECK (client_type IN ('perorangan', 'kelompok', 'perusahaan', 'organisasi', 'instansi'))`);
  await klien.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES referral_partners(id)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES referral_partners(id)`);
  await klien.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES referral_partners(id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS partner_fees (
      id BIGSERIAL PRIMARY KEY,
      invoice_id BIGINT NOT NULL UNIQUE REFERENCES invoices(id),
      partner_id BIGINT NOT NULL REFERENCES referral_partners(id),
      base_amount NUMERIC(15, 2) NOT NULL,
      pct NUMERIC(5, 2) NOT NULL,
      amount NUMERIC(15, 0) NOT NULL,
      paid_at DATE NOT NULL,
      proof_path VARCHAR(500),
      note VARCHAR(255),
      paid_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS partner_fees_partner_idx ON partner_fees (partner_id)`);
  await klien.query(`ALTER TABLE invoice_costs DROP CONSTRAINT IF EXISTS invoice_costs_category_check`);
  await klien.query(`ALTER TABLE invoice_costs ADD CONSTRAINT invoice_costs_category_check CHECK (category IN ('hpp_bahan_baku', 'hpp_barang', 'tenaga_kerja', 'transportasi', 'delivery', 'vendor', 'sewa_peralatan', 'akomodasi', 'entertainment', 'pb1', 'partner_fee', 'lain_lain'))`);
  for (const t of ["referral_partners", "partner_fees"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ rekanan, jenis klien, Partner Fee siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
