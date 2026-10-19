/**
 * Sambungkan pilihan paket (package_slot_options tanpa menu) ke master Menu
 * lewat RESEP bernama sama (D-086): nama dicocokkan longgar (huruf kecil,
 * tanpa tanda baca). Resep yang sudah punya menu → menu itu dipakai; belum →
 * menu baru dibuat (faktor porsi 1, tersambung resep). Nama yang cocok ke
 * LEBIH DARI SATU resep dilewati (resep kembar ber-HPP beda, jangan ditebak).
 *
 *   node scripts/sambung-opsi-paket-resep.mjs [--apply]
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const k = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await k.connect();
const kunci = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
await k.query("BEGIN");
try {
  const resep = (await k.query("select id, name from recipes")).rows;
  const perKunci = new Map();
  for (const r of resep) perKunci.set(kunci(r.name), [...(perKunci.get(kunci(r.name)) ?? []), r]);
  const menuResep = new Map((await k.query("select id, recipe_id from menus where recipe_id is not null order by id")).rows.map((m) => [String(m.recipe_id), m.id]));
  const namaMenu = new Set((await k.query("select lower(name) n from menus")).rows.map((r) => r.n));
  const opsi = (await k.query("select id, name from package_slot_options where menu_id is null")).rows;

  let menuBaru = 0, tersambung = 0, kembar = new Set();
  for (const o of opsi) {
    const r = perKunci.get(kunci(o.name));
    if (!r) continue;
    if (r.length > 1) { kembar.add(o.name); continue; }
    let idMenu = menuResep.get(String(r[0].id));
    if (!idMenu) {
      let nama = r[0].name;
      if (namaMenu.has(nama.toLowerCase())) nama = `${nama} (resep)`;
      idMenu = (await k.query("insert into menus (name, recipe_id, portion_factor, active, created_at, updated_at) values ($1,$2,1,true,now(),now()) returning id", [nama, r[0].id])).rows[0].id;
      menuResep.set(String(r[0].id), idMenu);
      namaMenu.add(nama.toLowerCase());
      menuBaru++;
    }
    await k.query("update package_slot_options set menu_id=$1 where id=$2", [idMenu, o.id]);
    tersambung++;
  }
  console.log(`${tersambung} pilihan tersambung · ${menuBaru} menu baru dibuat dari resep · ${kembar.size} nama dilewati karena resep kembar: ${[...kembar].slice(0, 8).join(", ")}`);
  if (process.argv.includes("--apply")) { await k.query("COMMIT"); console.log("✅ APPLY"); } else { await k.query("ROLLBACK"); console.log("DRY-RUN"); }
} catch (e) {
  await k.query("ROLLBACK");
  throw e;
} finally {
  await k.end();
}
