/**
 * Sumber order di quotation + Partner Fee per order (D-137, permintaan Rama 4 Nov 2026).
 *
 *   node scripts/tambah-sumber-order.mjs && npx prisma generate
 *
 * quotations.order_source        langsung / rekanan / relasi / repeat (kosong = belum diisi, dokumen lama).
 * quotations.order_source_note   kanal (WhatsApp, Instagram, …) untuk "langsung", nama relasi untuk "relasi".
 * quotations.partner_fee_pct     Partner Fee order ini; kosong = ikut rekanan / bawaan Angka Bisnis.
 * quotation_costs_category_check ditambah 'partner_fee' (perkiraan Partner Fee = biaya di Margin quotation,
 *                                tersalin ke invoice seperti perkiraan biaya lain).
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
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS order_source VARCHAR(20)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS order_source_note VARCHAR(150)`);
  await klien.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS partner_fee_pct NUMERIC(5, 2) CHECK (partner_fee_pct >= 0 AND partner_fee_pct <= 50)`);
  await klien.query(`ALTER TABLE quotation_costs DROP CONSTRAINT IF EXISTS quotation_costs_category_check`);
  await klien.query(`ALTER TABLE quotation_costs ADD CONSTRAINT quotation_costs_category_check CHECK (category IN ('hpp_bahan_baku', 'hpp_barang', 'tenaga_kerja', 'transportasi', 'delivery', 'vendor', 'sewa_peralatan', 'akomodasi', 'entertainment', 'pb1', 'partner_fee', 'lain_lain'))`);
  await klien.query("COMMIT");
  console.log("✅ quotations.order_source/_note/partner_fee_pct + quotation_costs partner_fee siap.");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
