/**
 * users.wajib_ganti_sandi — akun yang dibuat/di-reset admin memakai sandi
 * sementara; saat login pertama pemiliknya dipaksa mengganti username (boleh)
 * & sandi di /akun-baru sebelum bisa membuka halaman lain (D-034).
 *
 *   node scripts/tambah-wajib-ganti-sandi.mjs && npm run db:tarik
 *
 * Aditif (kolom baru berbawaan false) & aman dijalankan berulang kali.
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
await klien.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wajib_ganti_sandi BOOLEAN NOT NULL DEFAULT false`);
const { rows } = await klien.query(`SELECT count(*)::int n, count(*) FILTER (WHERE wajib_ganti_sandi)::int wajib FROM users`);
console.log(`users: ${rows[0].n}, wajib ganti sandi: ${rows[0].wajib}`);
await klien.end();
