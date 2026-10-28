/**
 * Foto profil asli (D-113) — pengganti wajah gambar setelah sesi foto karyawan.
 *
 *   node scripts/tambah-foto-profil.mjs && npm run db:tarik
 *
 * user_photos: foto persegi kecil (±20 KB, dikecilkan di peramban) per token acak;
 * users.avatar = "f.<token>". Disajikan /avatar/foto/<token> dengan cache selamanya
 * (token baru tiap ganti foto), jadi DB hanya dibaca sekali per foto. Aditif & aman diulang.
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
await klien.query(`
  CREATE TABLE IF NOT EXISTS user_photos (
    token VARCHAR(32) PRIMARY KEY,
    content_type VARCHAR(20) NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP(0) NOT NULL DEFAULT now()
  )`);
await klien.query(`ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY`);
await klien.query(`REVOKE ALL ON user_photos FROM anon, authenticated`);
console.log("✅ user_photos siap");
await klien.end();
