/**
 * Membuka CHECK constraint users.role untuk peran Tiska Ops (D-025).
 *
 *   node scripts/tambah-peran-tiska.mjs
 *
 * Sebelum ini users_role_check hanya menerima admin/sales/finance/cost,
 * jadi memilih "Captain" di layar User akan ditolak database dengan pesan
 * yang tidak menunjuk ke sebabnya.
 *
 * Hanya MELEBARKAN daftar — tidak ada baris yang berubah. Daftar di bawah
 * harus sama persis dengan PERAN di lib/peran.ts (dijaga lib/peran.test.ts).
 * Jalankan SETELAH tambah-peran-cost.mjs: skrip lama itu memasang ulang
 * daftar empat peran.
 *
 * Aman dijalankan berulang kali.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

// prettier-ignore
const PERAN = ["admin", "owner", "direksi", "finance", "sales", "bizdev", "cost", "kepala_dapur", "dapur", "captain", "driver", "gudang", "field"];

const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");

const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const daftar = PERAN.map((p) => `'${p}'`).join(", ");

const { rows: menyimpang } = await klien.query(
  `SELECT DISTINCT role FROM users WHERE role NOT IN (${daftar})`,
);
if (menyimpang.length > 0) {
  throw new Error(`Ada peran di luar daftar: ${menyimpang.map((r) => r.role).join(", ")}`);
}

await klien.query("BEGIN");
try {
  await klien.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await klien.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (${daftar}))`);
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

/* ---------- Dicoba sungguhan, lalu dibatalkan ---------- */

const coba = async (peran) => {
  await klien.query("BEGIN");
  try {
    await klien.query(
      `INSERT INTO users (name, username, email, password, role, is_active, created_at, updated_at)
       VALUES ('Coba Batasan', $1, $2, $3, $4, false, now(), now())`,
      [`cobabatasan${Date.now()}`, `cobabatasan${Date.now()}@contoh.invalid`, "x".repeat(60), peran],
    );
    return true;
  } catch {
    return false;
  } finally {
    await klien.query("ROLLBACK");
  }
};

const ditolak = [];
for (const p of PERAN) if (!(await coba(p))) ditolak.push(p);
const asing = await coba("bukan_peran");
console.log(`${PERAN.length - ditolak.length}/${PERAN.length} peran diterima · peran asing ditolak: ${!asing}`);
if (ditolak.length || asing) throw new Error(`Batasan salah. Ditolak: ${ditolak.join(", ")}`);

await klien.end();
console.log("selesai");
