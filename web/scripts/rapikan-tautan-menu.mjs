/**
 * Melepas tautan menu → resep hasil impor (impor-paket.mjs) yang porsinya
 * tidak cocok (D-033).
 *
 *   node scripts/rapikan-tautan-menu.mjs            # DRY-RUN
 *   node scripts/rapikan-tautan-menu.mjs --apply    # satu transaksi
 *
 * Impor menautkan menu ke resep hanya karena NAMANYA sama, dengan faktor
 * porsi 1. Untuk sebagian menu porsi box ≠ porsi resep (Fu Yung Hai: HPP file
 * 2.652 vs resep 5.364 — setengah porsi), sehingga HPP paket melonjak dan
 * untung tampak di bawah batas padahal tidak.
 *
 * Aturan: menu bertaut dengan faktor 1 yang HPP resepnya menyimpang > 10% dari
 * HPP item di file (rata-rata snapshot di paket) → recipe_id dilepas, catatan
 * ditulis (rasio + saran faktor). Paket kembali memakai HPP file untuk item itu
 * sampai Kepala Dapur mengisi faktor porsi yang benar di halaman Menu.
 * Menu yang sudah diubah orang (faktor ≠ 1) tidak disentuh.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

// Overhead dari business_settings bila sudah diubah, selain itu bawaan 30%.
const { rows: ov } = await klien.query(`SELECT value FROM business_settings WHERE key = 'overhead_pct'`);
const overhead = ov.length ? Number(ov[0].value) : 30;

const { rows } = await klien.query(
  `WITH harga AS (SELECT DISTINCT ON (ingredient_id) ingredient_id, price_per_usage_unit p
                    FROM ingredient_prices ORDER BY ingredient_id, effective_at DESC, id DESC),
        hr AS (SELECT r.id, r.code, bool_or(h.p IS NULL) AS ada_kosong,
                      SUM(l.qty_per_batch * COALESCE(h.p, 0)) / NULLIF(r.portions_per_batch, 0) * (1 + $1 / 100.0) AS hpp
                 FROM recipes r JOIN recipe_lines l ON l.recipe_id = r.id LEFT JOIN harga h ON h.ingredient_id = l.ingredient_id
                GROUP BY r.id)
   SELECT m.id, m.name, hr.code, hr.hpp::float8 AS resep, hr.ada_kosong, AVG(i.hpp_snapshot)::float8 AS file,
          string_agg(DISTINCT p.code, ',') AS paket
     FROM menus m JOIN hr ON hr.id = m.recipe_id
     JOIN package_items i ON i.menu_id = m.id JOIN packages p ON p.id = i.package_id
    WHERE m.portion_factor = 1 AND i.hpp_snapshot IS NOT NULL
    GROUP BY m.id, m.name, hr.code, hr.hpp, hr.ada_kosong`,
  [overhead],
);
const lepas = rows
  .map((r) => ({ ...r, rasio: r.file / r.resep }))
  // Resep yang bahannya belum berharga sudah otomatis memakai HPP file
  // (lib/biaya-paket.ts) — tautannya sendiri benar, jadi tidak dilepas.
  .filter((r) => !r.ada_kosong && Math.abs(r.rasio - 1) > 0.1)
  .sort((a, b) => a.rasio - b.rasio);

console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — menu bertaut yang porsinya tidak cocok: ${lepas.length} dari ${rows.length}`);
for (const r of lepas) {
  console.log(
    `  ${r.name.slice(0, 32).padEnd(32)} ${r.code}  file ${Math.round(r.file).toLocaleString("id-ID").padStart(7)} · resep ${Math.round(r.resep).toLocaleString("id-ID").padStart(7)} · saran faktor ${r.rasio.toFixed(2)}${r.ada_kosong ? " · resep ada bahan tanpa harga" : ""}  [${r.paket}]`,
  );
}
if (!APPLY) {
  console.log("\nTidak ada yang ditulis. Jalankan dengan --apply untuk melepas tautan di atas.");
  await klien.end();
  process.exit(0);
}

await klien.query("BEGIN");
try {
  for (const r of lepas) {
    await klien.query(
      `UPDATE menus SET recipe_id = NULL, updated_at = now(),
              notes = concat_ws(E'\\n', notes, $2::text)
        WHERE id = $1 AND portion_factor = 1`,
      [r.id, `Tautan ke ${r.code} dilepas otomatis: HPP file ${Math.round(r.file)} vs resep ${Math.round(r.resep)} (saran faktor porsi ${r.rasio.toFixed(2)}). Hubungkan lagi dengan faktor yang benar.`],
    );
  }
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}
const { rows: sisa } = await klien.query(`SELECT count(*) FILTER (WHERE recipe_id IS NOT NULL)::int t FROM menus`);
console.log(`\nDilepas ${lepas.length} tautan. Menu yang masih terhubung resep: ${sisa[0].t}`);
await klien.end();
