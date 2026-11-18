/**
 * Baris catatan yang terlanjur diketik di Menu ("NOTED: …") → kolom Catatan untuk dapur & tim (D-214, Rama 18 Nov 2026:
 * "noted dipindahkan saja ke section notes. jangan di menu").
 *
 *   node scripts/pindah-catatan-dari-menu.mjs            DRY-RUN
 *   node scripts/pindah-catatan-dari-menu.mjs --apply    satu transaksi
 *
 * Baris yang dipindah: baris induk menu tanpa isi, bernilai 0, bukan compliment, berawalan NOTED/NOTE/NB/CATATAN/CAT/
 * KETERANGAN/KET/INFO (pola sama dengan lib/catatan-dapur.ts). Teksnya (tanpa awalan, + keterangan barisnya) ditambahkan
 * di baris baru kitchen_notes dokumennya, lalu barisnya dihapus. Baris bernilai 0 → total dokumen tidak berubah.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const TERAP = process.argv.includes("--apply");
const AWALAN = /^\s*(noted|note|nb|catatan|cat|keterangan|ket|info)(?=[\s:\-–—.]|$)[\s:\-–—.]*/i;
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  let jumlah = 0;
  for (const [dok, item, nomor, fk] of [["quotations", "quotation_items", "quotation_number", "quotation_id"], ["invoices", "invoice_items", "invoice_number", "invoice_id"]]) {
    const { rows } = await klien.query(
      `SELECT i.id, i.${fk} AS dok_id, d.${nomor} AS nomor, i.item_name, i.note, d.kitchen_notes, i.subtotal::text
         FROM ${item} i JOIN ${dok} d ON d.id = i.${fk}
        WHERE i.parent_id IS NULL AND i.kind IS NULL AND NOT i.is_compliment AND i.qty * i.price = 0 AND i.subtotal = 0
          AND NOT EXISTS (SELECT 1 FROM ${item} a WHERE a.parent_id = i.id)
        ORDER BY i.id`,
    );
    for (const r of rows.filter((x) => AWALAN.test(x.item_name))) {
      const teks = [r.item_name.replace(AWALAN, "").trim(), r.note?.trim()].filter(Boolean).join(" — ");
      const baru = [r.kitchen_notes?.trim(), teks].filter(Boolean).join("\n");
      console.log(`${r.nomor.padEnd(22)} "${r.item_name}" → catatan dapur: ${JSON.stringify(baru)} (nilai baris ${r.subtotal})`);
      if (TERAP) {
        await klien.query(`UPDATE ${dok} SET kitchen_notes = $2 WHERE id = $1`, [r.dok_id, baru]);
        await klien.query(`DELETE FROM ${item} WHERE id = $1`, [r.id]);
      }
      jumlah++;
    }
  }
  await klien.query(TERAP ? "COMMIT" : "ROLLBACK");
  console.log(TERAP ? `✅ ${jumlah} baris catatan dipindah.` : `DRY-RUN: ${jumlah} baris. Jalankan dengan --apply.`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
