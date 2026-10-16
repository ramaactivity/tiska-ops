/**
 * Menyemai baris role_permissions yang belum ada dengan ATURAN BAWAAN dari
 * kode (lib/navigasi.ts) — nilai yang selama ini sudah berlaku karena baris
 * kosong memakai bawaan. Perilaku tidak berubah; centang di layar User
 * menjadi cerminan tabel. Baris yang sudah ada (diubah admin) tidak disentuh.
 *
 *   node scripts/semai-izin-bawaan.mjs           # DRY-RUN
 *   node scripts/semai-izin-bawaan.mjs --apply
 */
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";
import pg from "pg";

const jiti = createJiti(import.meta.url, { alias: { "@": new URL("..", import.meta.url).pathname } });
const { MENU, PERAN_DIATUR } = await jiti.import("../lib/navigasi.ts");

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const ada = new Set((await klien.query("SELECT role, menu_key FROM role_permissions")).rows.map((r) => `${r.role}:${r.menu_key}`));
const baru = [];
for (const butir of MENU.flatMap((k) => k.butir).filter((b) => !b.hanyaAdmin)) {
  for (const peran of PERAN_DIATUR) {
    if (!ada.has(`${peran}:${butir.kunci}`)) baru.push([peran, butir.kunci, butir.peran.includes(peran)]);
  }
}
console.log(`${baru.length} baris baru (${baru.filter((b) => b[2]).length} boleh):`);
console.log(baru.filter((b) => b[2]).map((b) => `${b[0]}:${b[1]}`).join(", "));

if (process.argv.includes("--apply")) {
  await klien.query("BEGIN");
  for (const [p, k, boleh] of baru) {
    await klien.query(
      `INSERT INTO role_permissions (role, menu_key, allowed, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now()) ON CONFLICT (role, menu_key) DO NOTHING`,
      [p, k, boleh],
    );
  }
  await klien.query("COMMIT");
  console.log("✅ disemai");
} else console.log("DRY-RUN — tambah --apply untuk menyimpan.");
await klien.end();
