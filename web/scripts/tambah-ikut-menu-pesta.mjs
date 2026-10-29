/**
 * Program "Ikut Pesen Menu Pesta" Weekend/Weekday — Tahap A (D-115, docs/14-IKUT-MENU-PESTA.md).
 *
 *   node scripts/tambah-ikut-menu-pesta.mjs && npm run db:tarik
 *
 * retail_programs          satu program per acara induk + tanggal kirim (usulan → cek HPP → disetujui)
 * retail_program_sets      2–3 paket retail ("the Menu 1/2/3")
 * retail_program_set_items isi paket — menu dari acara induk, atau menu lain (from_event = false)
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
  await klien.query(`
    CREATE TABLE IF NOT EXISTS retail_programs (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      delivery_date DATE NOT NULL,
      order_deadline TIMESTAMP(0) NOT NULL,
      price_per_pax NUMERIC(12, 0) NOT NULL,
      min_pax INTEGER NOT NULL DEFAULT 4,
      max_pax INTEGER,
      area VARCHAR(100) NOT NULL DEFAULT 'Bogor',
      contact VARCHAR(150),
      notes TEXT,
      status VARCHAR(15) NOT NULL DEFAULT 'diusulkan'
        CHECK (status IN ('diusulkan', 'dikembalikan', 'disetujui', 'ditolak', 'dibatalkan')),
      proposed_by BIGINT REFERENCES users(id),
      proposed_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      decided_by BIGINT REFERENCES users(id),
      decided_at TIMESTAMP(0),
      decision_note TEXT,
      approved_margin_pct NUMERIC(6, 2),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_programs_event_idx ON retail_programs (event_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS retail_program_sets (
      id BIGSERIAL PRIMARY KEY,
      program_id BIGINT NOT NULL REFERENCES retail_programs(id) ON DELETE CASCADE,
      sort INTEGER NOT NULL DEFAULT 0,
      title VARCHAR(60) NOT NULL
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_program_sets_program_idx ON retail_program_sets (program_id)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS retail_program_set_items (
      id BIGSERIAL PRIMARY KEY,
      set_id BIGINT NOT NULL REFERENCES retail_program_sets(id) ON DELETE CASCADE,
      sort INTEGER NOT NULL DEFAULT 0,
      menu_id BIGINT REFERENCES menus(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      from_event BOOLEAN NOT NULL DEFAULT true
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS retail_program_set_items_set_idx ON retail_program_set_items (set_id)`);
  for (const t of ["retail_programs", "retail_program_sets", "retail_program_set_items"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ retail_programs, retail_program_sets, retail_program_set_items siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
