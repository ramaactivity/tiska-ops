/**
 * Penanggung jawab kantor per event (D-175, permintaan Rama 13 Nov 2026: "bisa mendelegasikan").
 *
 *   node scripts/tambah-kolom-pj-event.mjs            (simulasi: kolom ditambah, rencana pengisian ditampilkan)
 *   node scripts/tambah-kolom-pj-event.mjs --apply    (event tanpa penanggung jawab diisi pembuat quotation-nya)
 *
 * events.pic_user_id — akun kantor yang memegang pesanan ini dari disetujui sampai lunas.
 * Aditif & aman diulang: hanya mengisi yang masih kosong.
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
await k.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS pic_user_id BIGINT REFERENCES users(id)");
await k.query("CREATE INDEX IF NOT EXISTS events_pic_user_id_idx ON events (pic_user_id)");
await k.query("BEGIN");
try {
  const r = await k.query(
    "UPDATE events e SET pic_user_id = q.created_by FROM quotations q WHERE q.id = e.quotation_id AND e.pic_user_id IS NULL AND q.created_by IS NOT NULL",
  );
  console.log(`${r.rowCount} event diisi penanggung jawab.`);
  await k.query(apply ? "COMMIT" : "ROLLBACK");
  console.log(apply ? "✅ Tersimpan." : "(simulasi — tambah --apply untuk menyimpan)");
} catch (e) {
  await k.query("ROLLBACK");
  throw e;
} finally {
  await k.end();
}
