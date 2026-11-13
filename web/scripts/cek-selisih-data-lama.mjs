/**
 * Cek input yang masih masuk ke APLIKASI LAMA sesudah pindah data (D-144). HANYA MEMBACA.
 *
 * Sejak 10 Nov 16.22 WIB kedua aplikasi menambah baris sendiri-sendiri, jadi id bertabrakan — dokumen dicocokkan
 * per NOMOR (quotation/invoice/payment) dan customer per NAMA. Hanya dokumen yang dibuat/diubah di aplikasi lama
 * sesudah pindah yang diperiksa:
 *   ❌ belum ada di Tiska Ops / versi lama lebih baru  → perlu disinkron (perintah siap salin di akhir)
 *   ✅ Tiska Ops sama atau lebih baru                   → sudah tertangani
 *
 *   node scripts/cek-selisih-data-lama.mjs
 *
 * Sinkron: scripts/sinkron-dokumen-lama.mjs (D-153; simulasi dulu, lalu --apply). Payment & customer dicek manual.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
for (const oid of [20, 1700, 1082, 1114, 1184]) pg.types.setTypeParser(oid, (v) => v);

const PINDAH = "2026-11-10 09:22:00"; // 10 Nov 16.22 WIB (UTC di DB)
// Sudah diputuskan, tidak perlu disinkron lagi.
const ABAIKAN = { "INV-2026-0073": "dobel INV/TC/2611/011 (sudah lunas di Tiska Ops) — D-153" };
const JENIS = [
  { t: "quotations", no: "quotation_number", sinkron: true },
  { t: "invoices", no: "invoice_number", sinkron: true },
  { t: "payments", no: "payment_number", sinkron: false },
  { t: "customers", no: "name", sinkron: false },
];

const lama = new pg.Client({ connectionString: process.env.LAMA_DATABASE_URL });
const baru = new pg.Client({ connectionString: process.env.DATABASE_URL });
await Promise.all([lama.connect(), baru.connect()]);
await Promise.all([lama.query("BEGIN READ ONLY"), baru.query("BEGIN READ ONLY")]);

const perlu = [];
let manual = 0;
for (const j of JENIS) {
  const a = (await lama.query(`SELECT ${j.no} AS no, created_at, updated_at, grand_total_or_null FROM (SELECT *, ${j.t === "customers" || j.t === "payments" ? "NULL" : "grand_total"} AS grand_total_or_null FROM ${j.t}) x WHERE greatest(created_at, updated_at) > $1 ORDER BY 1`, [PINDAH])).rows;
  if (!a.length) {
    console.log(`${j.t.padEnd(11)} ✅ tidak ada input baru di aplikasi lama`);
    continue;
  }
  const b = new Map((await baru.query(`SELECT ${j.no} AS no, updated_at FROM ${j.t} WHERE ${j.no} = ANY($1)`, [a.map((r) => r.no)])).rows.map((r) => [r.no, r]));
  console.log(`${j.t.padEnd(11)} ${a.length} dibuat/diubah di aplikasi lama sesudah pindah:`);
  for (const r of a) {
    const x = b.get(r.no);
    const lewat = ABAIKAN[r.no];
    const status = lewat
      ? `✅ diabaikan: ${lewat}`
      : !x
        ? "❌ belum ada di Tiska Ops"
        : r.updated_at > x.updated_at
          ? `❌ versi lama lebih baru (lama ${r.updated_at} > Tiska Ops ${x.updated_at} UTC)`
          : "✅ Tiska Ops sama/lebih baru";
    console.log(`   ${r.no}${r.grand_total_or_null ? ` · Rp${Number(r.grand_total_or_null).toLocaleString("id-ID")}` : ""} — ${status}`);
    if (!status.startsWith("❌")) continue;
    if (j.sinkron) perlu.push(r.no);
    else manual++;
  }
}
await Promise.all([lama.end(), baru.end()]);

if (perlu.length) console.log(`\nSinkron (simulasi dulu): node scripts/sinkron-dokumen-lama.mjs ${perlu.join(" ")}`);
if (manual) console.log(`${manual} payment/customer perlu dicek manual.`);
if (!perlu.length && !manual) console.log("\nSemua input aplikasi lama sudah ada di Tiska Ops.");
