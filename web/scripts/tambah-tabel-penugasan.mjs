/**
 * Penugasan & armada event (01-SPEC G, 03-DATA-MODEL §7, D-051).
 *
 *   node scripts/tambah-tabel-penugasan.mjs && npm run db:tarik
 *
 * vehicles: master kendaraan (Luxio, Grand Max, …) — diisi admin.
 * event_kloters: per event per tanggal: kloter ke-n, jam berangkat dari
 *   Julang, catatan ("sekalian bawa menu breakfast").
 * event_assignments: anggota kloter — akun user ATAU nama DW tanpa akun,
 *   peran, kendaraan (driver), tugas khusus ("ambil bunga"), konfirmasi.
 * Aditif. RLS + REVOKE.
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
    CREATE TABLE IF NOT EXISTS vehicles (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      plate VARCHAR(20),
      capacity_note VARCHAR(255),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      updated_at TIMESTAMP(0) NOT NULL DEFAULT now()
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS event_kloters (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      no INTEGER NOT NULL CHECK (no >= 1),
      depart_time VARCHAR(10) NOT NULL,
      note VARCHAR(500),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CONSTRAINT event_kloters_unik UNIQUE (event_id, date, no)
    )`);
  await klien.query(`
    CREATE TABLE IF NOT EXISTS event_assignments (
      id BIGSERIAL PRIMARY KEY,
      kloter_id BIGINT NOT NULL REFERENCES event_kloters(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      person_name VARCHAR(100),
      role VARCHAR(20) NOT NULL CHECK (role IN ('captain','driver','steward','delivery_lauk','crew','dw')),
      vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
      task_note VARCHAR(255),
      sort INTEGER NOT NULL DEFAULT 0,
      confirmed_at TIMESTAMP(0),
      created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
      CONSTRAINT event_assignments_orang CHECK (user_id IS NOT NULL OR person_name IS NOT NULL)
    )`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_assignments_kloter_idx ON event_assignments (kloter_id, sort)`);
  await klien.query(`CREATE INDEX IF NOT EXISTS event_kloters_date_idx ON event_kloters (date)`);
  for (const t of ["vehicles", "event_kloters", "event_assignments"]) {
    await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON ${t} FROM anon, authenticated`);
    await klien.query(`REVOKE ALL ON SEQUENCE ${t}_id_seq FROM anon, authenticated`);
  }
  await klien.query("COMMIT");
  console.log("✅ vehicles, event_kloters, event_assignments siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
