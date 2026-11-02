/**
 * Pengingat Bayar (D-128, docs/16-ASET-DAN-PENGINGAT-BAYAR.md).
 *
 *   node scripts/tambah-pengingat-bayar.mjs && npm run db:tarik
 *
 * bills          satu tagihan kantor: rutin (repeat_months 1/3/6/12, due_day = tanggal tetap) atau sekali (repeat_months null).
 *                next_due = jatuh tempo yang belum dibayar; dibayar → maju ke periode berikutnya (rutin) atau status selesai (sekali).
 *                Detail bebas: kode bayar / ID pelanggan, rekening tujuan, PIC (dapat pengingat), event terkait, foto tagihan.
 * bill_payments  riwayat bayar per periode (tanggal, nominal, bukti transfer di bucket "bukti").
 * Hanya pencatat & pengingat — tidak membuat jurnal/kas. Aditif & aman diulang.
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
    CREATE TABLE IF NOT EXISTS bills (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(20) NOT NULL,
      amount NUMERIC(15, 2),
      repeat_months SMALLINT CHECK (repeat_months IN (1, 3, 6, 12)),
      due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
      next_due DATE NOT NULL,
      remind_days SMALLINT NOT NULL DEFAULT 3 CHECK (remind_days BETWEEN 0 AND 30),
      pic_user_id BIGINT REFERENCES users(id),
      pay_code VARCHAR(120),
      pay_to VARCHAR(300),
      note VARCHAR(1000),
      event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
      photo_paths VARCHAR(500)[] NOT NULL DEFAULT '{}',
      status VARCHAR(10) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'berhenti')),
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS bills_due_idx ON bills (status, next_due)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS bill_payments (
      id BIGSERIAL PRIMARY KEY,
      bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      due_date DATE NOT NULL,
      paid_at DATE NOT NULL,
      amount NUMERIC(15, 2),
      proof_path VARCHAR(500),
      note VARCHAR(255),
      paid_by BIGINT REFERENCES users(id),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS bill_payments_bill_idx ON bill_payments (bill_id)`);
  for (const t of ["bills", "bill_payments"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel pengingat bayar siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
