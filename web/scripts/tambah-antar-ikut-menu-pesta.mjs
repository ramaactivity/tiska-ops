/**
 * Ikut Pesen Menu Pesta — Tahap C: pengiriman (D-117, docs/14-IKUT-MENU-PESTA.md).
 *
 *   node scripts/tambah-antar-ikut-menu-pesta.mjs && npm run db:tarik
 *
 * event_kloters.program_id   kloter antar retail menumpang kloter event induk (driver, mobil, Jadwal saya,
 *                            status kirim, honor, bentrok ikut terpakai); NULL = kloter acara biasa.
 * retail_orders.kloter_id    pesanan masuk kloter mana + urutan antar (stop_no) + bukti diantar & uang tunai.
 * Aditif & aman diulang.
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
  await klien.query(`ALTER TABLE event_kloters ADD COLUMN IF NOT EXISTS program_id BIGINT REFERENCES retail_programs(id) ON DELETE CASCADE`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_kloters_program_idx ON event_kloters (program_id)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS kloter_id BIGINT REFERENCES event_kloters(id) ON DELETE SET NULL`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS stop_no INTEGER`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP(0)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS delivered_by BIGINT REFERENCES users(id)`);
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS delivery_photo VARCHAR(300)`);
  /** Uang tunai yang diterima driver saat antar (bayar saat kirim); disetor & dicatat Finance lewat Payment. */
  await klien.query(`ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS cod_collected NUMERIC(12, 0)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_orders_kloter_idx ON retail_orders (kloter_id)`);
  await klien.query("COMMIT");
  console.log("✅ kloter retail & kolom antar pesanan siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
