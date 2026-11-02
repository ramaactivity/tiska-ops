/**
 * Syarat & ketentuan Program Loyalti (D-134, masukan Mas Reza 2 Nov 2026 — angka divalidasi owner).
 *
 *   node scripts/tambah-loyalti-sk.mjs && npm run db:tarik
 *
 * loyalty_programs.kind            'stempel' (pesan N kali → hadiah) | 'tiap_pesanan' (bonus otomatis tiap pesanan, mis. sampel minuman)
 * loyalty_programs.min_pax         pesanan baru dihitung / dapat bonus bila total pax ≥ ini
 * loyalty_programs.reward_type     'teks' | 'gratis_pax' (invoice dipotong X × harga/pax) | 'bonus' (barang, bisa ada pilihan)
 * loyalty_programs.reward_qty      X pax gratis
 * loyalty_programs.reward_options  pilihan bonus, mis. {Lemon tea, Lychee ice tea, Teh sereh}
 * loyalty_programs.stackable       false = hadiahnya tidak bisa digabung dengan hadiah program lain di satu pesanan
 * loyalty_programs.terms           syarat & ketentuan tertulis (tampil di halaman pembeli)
 * loyalty_redemptions.choice       pilihan bonus yang diambil
 * loyalty_redemptions.invoice_item_id  baris potongan "gratis X pax" di invoice (dihapus saat pemakaian dibatalkan)
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
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS kind VARCHAR(12) NOT NULL DEFAULT 'stempel' CHECK (kind IN ('stempel', 'tiap_pesanan'))`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS min_pax SMALLINT CHECK (min_pax BETWEEN 1 AND 1000)`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reward_type VARCHAR(12) NOT NULL DEFAULT 'teks' CHECK (reward_type IN ('teks', 'gratis_pax', 'bonus'))`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reward_qty SMALLINT CHECK (reward_qty BETWEEN 1 AND 100)`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reward_options VARCHAR(100)[] NOT NULL DEFAULT '{}'`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS stackable BOOLEAN NOT NULL DEFAULT true`);
  await klien.query(`ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS terms VARCHAR(2000)`);
  await klien.query(`ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS choice VARCHAR(100)`);
  await klien.query(`ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS invoice_item_id BIGINT`);
  await klien.query("COMMIT");
  console.log("✅ kolom S&K loyalti siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
