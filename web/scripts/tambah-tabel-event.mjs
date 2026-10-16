/**
 * Event dari quotation disetujui (01-SPEC G, 03-DATA-MODEL §7, D-049).
 *
 *   node scripts/tambah-tabel-event.mjs && npm run db:tarik
 *
 * events: satu per quotation; cara layanan, lokasi, PIC, batas kunci.
 * event_items: SALINAN baris pesanan per tanggal/sesi + isi menu — TANPA
 * HARGA (dibaca dapur & captain). event_changes: "UPDATE ke-n" setiap kali
 * isi event diperbarui dari quotation/invoice. Aditif. RLS + REVOKE.
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
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      quotation_id BIGINT NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE CASCADE,
      invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
      customer_id BIGINT NOT NULL REFERENCES customers(id),
      name VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'final'
        CHECK (status IN ('dp','final','terkunci','berjalan','selesai','batal')),
      service_mode VARCHAR(20) NOT NULL DEFAULT 'antar' CHECK (service_mode IN ('antar','ambil','setup_service')),
      first_date DATE,
      venue VARCHAR(255),
      address TEXT,
      maps_url VARCHAR(500),
      pic_name VARCHAR(255),
      pic_phone VARCHAR(50),
      eo_name VARCHAR(255),
      guest_count INTEGER,
      lock_at TIMESTAMP(0),
      change_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS events_first_date_idx ON events (first_date)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS event_items (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      session_date DATE,
      session_label VARCHAR(40),
      session_time VARCHAR(40),
      item_name VARCHAR(255) NOT NULL,
      qty DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit VARCHAR(50),
      pax INTEGER,
      day DECIMAL(5,2) NOT NULL DEFAULT 1,
      contents TEXT,
      kitchen_note TEXT,
      sort INTEGER NOT NULL DEFAULT 0
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_items_event_idx ON event_items (event_id, sort)`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS event_changes (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      change_no INTEGER NOT NULL,
      summary TEXT NOT NULL,
      after_lock BOOLEAN NOT NULL DEFAULT false,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  for (const t of ["events", "event_items", "event_changes"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ tabel events, event_items, event_changes siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
