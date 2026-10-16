/**
 * Mengisi menus.category yang masih kosong dari nama menunya (kode di
 * lib/menu.ts KATEGORI_MENU). Dipakai "tukar menu kategori sama" (D-040).
 * Hanya baris yang kategorinya KOSONG; yang sudah diisi dapur tidak disentuh.
 * Hasil bisa dikoreksi di halaman /menu.
 *
 *   node scripts/isi-kategori-menu.mjs           # DRY-RUN
 *   node scripts/isi-kategori-menu.mjs --apply
 */
import { readFileSync } from "node:fs";
import pg from "pg";

// Urutan penting: aturan pertama yang cocok menang.
const ATURAN = [
  ["beverage", /^(air mineral|es )/i],
  ["fruit", /^buah/i],
  ["rice", /^(nasi|lontong)/i],
  ["side", /bakwan|perkedel|lumpia|spring roll|pangsit|eggroll|sambal goreng|krecek/i],
  ["condiment", /^(sambal|saos|chili sauce|lalap)/i],
  ["snack", /kerupuk|emping|keripik|rempeyek|serundeng/i],
  ["egg_tofu", /^tel[uo]r/i], // "Telur Mata Sapi" bukan daging sapi
  ["chicken", /ayam|chicken/i],
  ["beef", /daging|empal|gepuk|iga|lidah|sapi|beef|kambing/i],
  ["seafood", /udang|cumi/i],
  ["fish", /ikan|dori|tongkol|balita|jambal/i],
  ["pasta", /^(mie|misoa|soun)|soun/i],
  ["vegetable", /sayur|tumis|^ca |cap cay|urap|pecel|pokcoy|kaylan|brocoli|broccoli|terong|acar|asem|genjer|toge|salad/i],
  ["egg_tofu", /telur|telor|tahu|tempe|fu yung|tamagoyaki|barendo/i],
];
const tebak = (nama) => ATURAN.find(([, re]) => re.test(nama))?.[0] ?? "side";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const k = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await k.connect();
const menu = (await k.query("SELECT id, name FROM menus WHERE category IS NULL ORDER BY name")).rows;
const grup = {};
for (const m of menu) (grup[tebak(m.name)] ??= []).push(m);
for (const [kat, isi] of Object.entries(grup)) console.log(`\n${kat} (${isi.length}): ${isi.map((m) => m.name).join(" · ")}`);
if (process.argv.includes("--apply")) {
  await k.query("BEGIN");
  for (const m of menu) await k.query("UPDATE menus SET category = $1, updated_at = now() WHERE id = $2 AND category IS NULL", [tebak(m.name), m.id]);
  await k.query("COMMIT");
  console.log(`\n✅ ${menu.length} menu diisi kategorinya`);
} else console.log(`\nDRY-RUN ${menu.length} menu — tambah --apply untuk menyimpan.`);
await k.end();
