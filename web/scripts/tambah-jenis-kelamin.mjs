/**
 * Jenis kelamin user (D-111) — pemilih avatar hanya menampilkan wajah yang sesuai.
 *
 *   node scripts/tambah-jenis-kelamin.mjs && npm run db:tarik
 *
 * users.gender: 'L' laki-laki, 'P' perempuan, NULL belum diisi. Aditif & aman diulang.
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
await klien.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(1)`);
await klien.query(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (gender IN ('L', 'P'));
  END IF;
END $$`);
console.log("✅ users.gender siap");
await klien.end();
