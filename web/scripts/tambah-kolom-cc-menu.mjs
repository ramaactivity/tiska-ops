/**
 * Kontak CC terpisah dari kontak utama + nama Inggris & keterangan menu (D-165, permintaan Rama 12 Nov 2026).
 *
 *   node scripts/tambah-kolom-cc-menu.mjs            (simulasi: kolom ditambah, rencana pemecahan ditampilkan)
 *   node scripts/tambah-kolom-cc-menu.mjs --apply    (pecah "Nama / Cc: Nama2" ke kolom CC, satu transaksi)
 *
 * quotations/invoices.contact_cc_name, contact_cc_phone — nama & HP orang yang ikut di-CC.
 * menus.name_en, menus.description — diisi lewat kartu "Daftarkan ke menu" di form dokumen.
 * Hanya dokumen yang kontaknya memuat "Cc:" dan kolom CC-nya masih kosong — aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const apply = process.argv.includes("--apply");
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const k = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await k.connect();
// Kolom aditif selalu ditambah (kode baru membutuhkannya); pemecahan data hanya dengan --apply.
for (const t of ["quotations", "invoices"])
  await k.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS contact_cc_name VARCHAR(255), ADD COLUMN IF NOT EXISTS contact_cc_phone VARCHAR(255)`);
await k.query("ALTER TABLE menus ADD COLUMN IF NOT EXISTS name_en VARCHAR(255), ADD COLUMN IF NOT EXISTS description TEXT");
await k.query("BEGIN");
try {
  const rows = (
    await k.query(`SELECT 'quotations' t, id, quotation_number no, contact_person FROM quotations WHERE contact_person ~* '\\mcc\\s*:' AND contact_cc_name IS NULL
                   UNION ALL SELECT 'invoices', id, invoice_number, contact_person FROM invoices WHERE contact_person ~* '\\mcc\\s*:' AND contact_cc_name IS NULL ORDER BY 1, 2`)
  ).rows;
  for (const r of rows) {
    const m = r.contact_person.match(/^(.*?)\s*[/,;&]?\s*\bcc\s*:\s*(.+)$/i);
    if (!m || !m[1].trim()) {
      console.log(`${r.no}: dilewati, pola tidak jelas ← ${r.contact_person}`);
      continue;
    }
    console.log(`${r.no.padEnd(16)} kontak "${m[1].trim()}" · CC "${m[2].trim()}" ← ${r.contact_person}`);
    await k.query(`UPDATE ${r.t} SET contact_person=$1, contact_cc_name=$2 WHERE id=$3 AND contact_cc_name IS NULL`, [m[1].trim(), m[2].trim(), r.id]);
  }
  console.log(`\n${rows.length} dokumen.`);
  await k.query(apply ? "COMMIT" : "ROLLBACK");
  console.log(apply ? "✅ Tersimpan." : "(simulasi — tambah --apply untuk menyimpan)");
} catch (e) {
  await k.query("ROLLBACK");
  throw e;
} finally {
  await k.end();
}
