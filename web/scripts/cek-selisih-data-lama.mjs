/**
 * Cek selisih data aplikasi lama (Aplikasi Penjualan TC) vs Tiska Ops sejak pindah data (D-144). HANYA MEMBACA.
 * Membandingkan setiap sel di 14 tabel yang dipindah; kolom akun & penandatangan dibandingkan lewat pemetaan D-144.
 * Dipakai untuk menangkap input yang masih masuk ke aplikasi lama setelah pindah (10 Nov 16.42: QUO-2026-0023).
 *
 *   node scripts/cek-selisih-data-lama.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
for (const oid of [20, 1700, 1082, 1114, 1184, 1083]) pg.types.setTypeParser(oid, (v) => v);

const TABEL = ["customers", "quotations", "quotation_items", "quotation_event_dates", "quotation_charges", "quotation_costs", "invoices", "invoice_items", "invoice_event_dates", "invoice_charges", "invoice_costs", "invoice_margins", "payments", "payment_details"];
// Pemetaan akun & penandatangan lama → Tiska Ops yang dipakai saat pindah data (D-144).
const AKUN = { 1: "38", 3: "266", 4: "40", 140: "39", 309: "41", 408: "10" };
const TTD = { 1: "12", 14: "11", 16: "10" };
const KOLOM_AKUN = new Set(["created_by", "cancelled_by", "updated_by", "finalized_by"]);

const lama = new pg.Client({ connectionString: process.env.LAMA_DATABASE_URL });
const baru = new pg.Client({ connectionString: process.env.DATABASE_URL });
await Promise.all([lama.connect(), baru.connect()]);
await Promise.all([lama.query("BEGIN READ ONLY"), baru.query("BEGIN READ ONLY")]);
let total = 0;
for (const t of TABEL) {
  const a = (await lama.query(`SELECT * FROM ${t} ORDER BY id`)).rows;
  const b = new Map((await baru.query(`SELECT * FROM ${t} ORDER BY id`)).rows.map((r) => [String(r.id), r]));
  const temuan = [];
  for (const r of a) {
    const x = b.get(String(r.id));
    b.delete(String(r.id));
    if (!x) {
      temuan.push(`baru di aplikasi lama: id ${r.id}`);
      continue;
    }
    for (const [k, v] of Object.entries(r)) {
      let harap = v == null ? null : String(v);
      if (KOLOM_AKUN.has(k) && harap != null) harap = AKUN[harap] ?? `?${harap}`;
      if (k === "signatory_id" && harap != null) harap = TTD[harap] ?? `?${harap}`;
      const ada = x[k] == null ? null : String(x[k]);
      if (harap !== ada) temuan.push(`id ${r.id} ${k}: ${JSON.stringify(harap)} (lama) vs ${JSON.stringify(ada)} (Tiska Ops)`);
    }
  }
  for (const id of b.keys()) temuan.push(`hanya di Tiska Ops: id ${id}`);
  total += temuan.length;
  console.log(`${t.padEnd(22)} ${temuan.length ? `❌ ${temuan.length}` : "✅"}`);
  for (const s of temuan.slice(0, 5)) console.log(`   ${s}`);
}
await Promise.all([lama.end(), baru.end()]);
console.log(total ? `\n${total} selisih — data di aplikasi lama berubah sejak pindah.` : "\nSama persis dengan aplikasi lama.");
