/**
 * Notifikasi Finance untuk akun yang merangkap pekerjaan Finance tanpa berperan Finance (D-121).
 *
 *   node scripts/tambah-notif-finance.mjs && npm run db:tarik
 *
 * users.notif_finance   true = ikut menerima notifikasi yang dikirim ke peran Finance (PR, absen, opname,
 *                       hutang jatuh tempo, refund, program Ikut Menu Pesta, bukti transfer). Diatur di menu User.
 * Pak Reza (reza) memakai peran Admin supaya bisa membuka semua halaman → dinyalakan untuknya.
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
  await klien.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_finance BOOLEAN NOT NULL DEFAULT false`);
  const r = await klien.query(`UPDATE users SET notif_finance = true WHERE username = 'reza' AND role <> 'finance' RETURNING username`);
  await klien.query("COMMIT");
  console.log(`✅ kolom notif_finance siap; dinyalakan untuk: ${r.rows.map((x) => x.username).join(", ") || "-"}`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
