/**
 * Kontrol Dapur MVP (docs/23 §6 P1): kendali tayangan TV, pengumuman, running text, status layar.
 *
 *   node scripts/tambah-kontrol-dapur.mjs && npx prisma generate
 *
 * 27 Nov: kolom audio/audio_type/audio_ms untuk pesan suara.
 * 27 Nov: kitchen_plans — rencana masak per tanggal (format Mbak Rita, docs/23 P2); isi sesi+langkah sebagai JSONB.
 *
 * Aditif & aman dijalankan berulang kali. Pola keamanan proyek: RLS menyala tanpa kebijakan publik
 * (hanya server yang membaca/menulis).
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
try {
  await klien.query("BEGIN");
  // Satu baris kendali untuk semua layar dapur.
  await klien.query(`CREATE TABLE IF NOT EXISTS kitchen_controls (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    mode VARCHAR(10) NOT NULL DEFAULT 'otomatis' CHECK (mode IN ('otomatis', 'tahan')),
    command VARCHAR(10) CHECK (command IN ('next', 'prev', 'ulang')),
    command_seq INTEGER NOT NULL DEFAULT 0,
    running_text TEXT,
    running_active BOOLEAN NOT NULL DEFAULT false,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await klien.query("INSERT INTO kitchen_controls (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
  await klien.query(`CREATE TABLE IF NOT EXISTS kitchen_announcements (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    read_screen VARCHAR(64)
  )`);
  await klien.query(`CREATE TABLE IF NOT EXISTS kitchen_screens (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    sound BOOLEAN NOT NULL DEFAULT false,
    fullscreen BOOLEAN NOT NULL DEFAULT false,
    size VARCHAR(20),
    showing TEXT,
    kitchen VARCHAR(10),
    user_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  // Pesan suara dari Kontrol Dapur (27 Nov): rekaman pendek (≤60 dtk) diputar di TV.
  await klien.query("ALTER TABLE kitchen_announcements ADD COLUMN IF NOT EXISTS audio BYTEA");
  await klien.query("ALTER TABLE kitchen_announcements ADD COLUMN IF NOT EXISTS audio_type VARCHAR(60)");
  await klien.query("ALTER TABLE kitchen_announcements ADD COLUMN IF NOT EXISTS audio_ms INTEGER");
  await klien.query(`CREATE TABLE IF NOT EXISTS kitchen_plans (
    date DATE PRIMARY KEY,
    title VARCHAR(200),
    notes TEXT,
    sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  for (const t of ["kitchen_controls", "kitchen_announcements", "kitchen_screens", "kitchen_plans"]) await klien.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  await klien.query("COMMIT");
  console.log("✅ kitchen_controls, kitchen_announcements, kitchen_screens, kitchen_plans siap");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
