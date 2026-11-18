/**
 * Alat yang terlanjur diketik di Menu → section Sewa alat (D-213, izin Rama 18 Nov 2026: "boleh … yang penting angkanya
 * jangan berubah").
 *
 *   node scripts/pindah-alat-dari-menu.mjs            DRY-RUN: daftar baris yang akan dipindah
 *   node scripts/pindah-alat-dari-menu.mjs --apply    satu transaksi
 *
 * Baris yang dipindah: baris induk menu (kind NULL) yang namanya tampak alat/dekor (pola sama dengan lib/sewa-alat.ts
 * `tampakAlat`), bukan paket, tanpa isi berharga, dan bernilai (> 0) atau compliment — baris Rp0 bukan compliment
 * dilewati karena tabel Sewa alat tidak mencetak baris tanpa nilai.
 * Perubahan per baris: kind = 'alat'; qty = qty × pax (pax kosong/0 = 1), pax = NULL — nilai baris TETAP; satuan
 * pax/porsi/orang dikosongkan; nama isi → note (di bawah note lama); isi dihapus. Harga, subtotal, hari, compliment, dan
 * centang pajak (charge_pb1/charge_service/charge_ppn) TIDAK diubah, total dokumen tidak disentuh.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const TERAP = process.argv.includes("--apply");
const POLA =
  "\\m(sewa|peralatan|kursi|taplak|skirting|center ?piece|chafing|goblet|disposable|napkin|placemat|pitcher|tenda|backdrop|panggung|karpet|sketsel|runner|round table|rangkai(an)?|dekor(asi)?|vas|stretch cover)\\M";
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  let jumlah = 0;
  for (const [dok, item, nomor] of [["quotations", "quotation_items", "quotation_number"], ["invoices", "invoice_items", "invoice_number"]]) {
    const fk = dok === "quotations" ? "quotation_id" : "invoice_id";
    const { rows } = await klien.query(
      `SELECT i.id, d.${nomor} AS nomor, d.grand_total::text AS total, i.item_name, i.unit, i.day::text, i.qty::text, i.pax, i.price::text,
              i.subtotal::text, i.is_compliment, i.note,
              COALESCE((SELECT array_agg(a.item_name ORDER BY a.id) FROM ${item} a WHERE a.parent_id = i.id), '{}') AS isi
         FROM ${item} i JOIN ${dok} d ON d.id = i.${fk}
        WHERE i.parent_id IS NULL AND i.kind IS NULL AND i.package_id IS NULL AND i.item_name ~* $1
          AND NOT EXISTS (SELECT 1 FROM ${item} a WHERE a.parent_id = i.id AND a.subtotal > 0)
          AND (i.is_compliment OR i.qty * i.price > 0)
        ORDER BY i.id`,
      [POLA],
    );
    for (const r of rows) {
      const kali = r.pax && Number(r.pax) > 0 ? Number(r.pax) : 1;
      const qtyBaru = Number(r.qty) * kali;
      const nilaiLama = Number(r.day || 1) * Number(r.qty) * kali * Number(r.price);
      const nilaiBaru = Number(r.day || 1) * qtyBaru * Number(r.price);
      if (Math.abs(nilaiLama - nilaiBaru) > 0.001) throw new Error(`Nilai berubah di ${r.nomor} ${r.item_name}`);
      if (!r.is_compliment && Math.abs(Number(r.subtotal) - nilaiBaru) > 0.5) throw new Error(`Subtotal tersimpan ≠ hitungan di ${r.nomor} ${r.item_name}: ${r.subtotal} vs ${nilaiBaru}`);
      const note = [r.note?.trim(), ...r.isi.map((x) => x.trim())].filter(Boolean).join("\n") || null;
      const unit = /^(pax|porsi|orang)$/i.test((r.unit ?? "").trim()) ? null : r.unit;
      console.log(`${r.nomor.padEnd(22)} ${r.item_name.slice(0, 45).padEnd(46)} qty ${r.qty}×pax ${r.pax ?? "-"} → ${qtyBaru} | nilai ${nilaiLama} = ${nilaiBaru}${r.is_compliment ? " (compliment)" : ""} | isi→catatan ${r.isi.length} | total dokumen ${r.total} tetap`);
      if (TERAP) {
        await klien.query(`DELETE FROM ${item} WHERE parent_id = $1`, [r.id]);
        await klien.query(`UPDATE ${item} SET kind = 'alat', qty = $2, pax = NULL, unit = $3, note = $4, menu_id = NULL, updated_at = now() WHERE id = $1`, [r.id, qtyBaru, unit, note]);
      }
      jumlah++;
    }
  }
  await klien.query(TERAP ? "COMMIT" : "ROLLBACK");
  console.log(TERAP ? `✅ ${jumlah} baris dipindah ke Sewa alat.` : `DRY-RUN: ${jumlah} baris akan dipindah. Jalankan dengan --apply.`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
