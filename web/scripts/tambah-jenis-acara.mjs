/**
 * Jenis acara terpisah dari nama acara (D-163, persetujuan Rama 12 Nov 2026).
 *
 *   node scripts/tambah-jenis-acara.mjs            (simulasi: kolom ditambah, daftar tebakan ditampilkan)
 *   node scripts/tambah-jenis-acara.mjs --apply    (isi tebakan jenis ke dokumen lama, satu transaksi)
 *
 * quotations.event_category, invoices.event_category  — jenis acara (kunci JENIS_ACARA di lib/hitung/acara.ts).
 * event_type TIDAK diubah: tetap nama acara. Hanya mengisi event_category yang masih kosong — aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

import { JENIS_ACARA, tebakJenisAcara } from "../lib/hitung/acara.ts";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const apply = process.argv.includes("--apply");
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const k = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await k.connect();
await k.query("BEGIN");
try {
  for (const t of ["quotations", "invoices"]) await k.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS event_category VARCHAR(20)`);
  const rows = (
    await k.query(`SELECT 'quotations' t, id, quotation_number no, event_type FROM quotations WHERE event_category IS NULL AND event_type IS NOT NULL
                   UNION ALL SELECT 'invoices', id, invoice_number, event_type FROM invoices WHERE event_category IS NULL AND event_type IS NOT NULL ORDER BY 1, 2`)
  ).rows;
  const isi = rows.map((r) => ({ ...r, jenis: tebakJenisAcara(r.event_type) }));
  for (const r of isi) console.log(`${r.no.padEnd(18)} ${(r.jenis ? JENIS_ACARA[r.jenis] : "— (tidak ditebak, dibiarkan kosong)").padEnd(34)} ← ${r.event_type}`);
  const ada = isi.filter((r) => r.jenis);
  for (const r of ada) await k.query(`UPDATE ${r.t} SET event_category=$1 WHERE id=$2 AND event_category IS NULL`, [r.jenis, r.id]);
  console.log(`\n${ada.length} dari ${isi.length} dokumen diberi jenis; ${isi.length - ada.length} dibiarkan kosong (diisi sales saat membuka dokumennya).`);
  await k.query(apply ? "COMMIT" : "ROLLBACK");
  if (!apply) {
    // Kolom tetap ditambah (aditif) supaya kode baru bisa jalan; tebakan baru ditulis dengan --apply.
    await k.query("BEGIN");
    for (const t of ["quotations", "invoices"]) await k.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS event_category VARCHAR(20)`);
    await k.query("COMMIT");
  }
  console.log(apply ? "✅ Tersimpan." : "(simulasi — kolom ditambah, tebakan belum ditulis; jalankan dengan --apply)");
} catch (e) {
  await k.query("ROLLBACK");
  throw e;
} finally {
  await k.end();
}
