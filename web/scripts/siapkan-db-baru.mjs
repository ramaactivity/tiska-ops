/**
 * Melengkapi database BARU setelah `npx prisma db push`.
 *
 *   npx prisma db push && node scripts/siapkan-db-baru.mjs
 *   node scripts/tambah-izin-peran.mjs
 *   node scripts/tambah-peran-cost.mjs
 *   node scripts/selaraskan-kategori-biaya.mjs
 *
 * schema.prisma adalah hasil introspeksi DB lama, dan `db push` tidak
 * membuat dua hal yang ada di sana:
 *
 *   1. Row level security. Supabase membuka skema public lewat REST API
 *      dengan kunci anon; tanpa RLS + REVOKE, isi tabel (termasuk hash sandi
 *      dan margin) bisa dibaca siapa pun yang memegang kunci publik itu.
 *      Aplikasi tidak terpengaruh: Prisma masuk sebagai pemilik tabel.
 *
 *   2. CHECK constraint warisan enum() Laravel (lihat database/migrations di
 *      repo lama). users.role dan invoice_costs.category sengaja tidak di
 *      sini — dipasang oleh tambah-peran-cost.mjs dan
 *      selaraskan-kategori-biaya.mjs dengan daftar terbaru.
 *
 * Aman dijalankan berulang kali.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const url = (process.env.DIRECT_DATABASE_URL ?? "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]uselibpqcompat=[^&]*/g, "");

const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const ENUM = [
  ["customers", "status", ["active", "inactive"]],
  ["products", "type", ["barang", "jasa"]],
  ["products", "status", ["active", "inactive"]],
  ["quotations", "status", ["draft", "sent", "approved", "rejected", "expired"]],
  ["invoices", "status", ["unpaid", "partial", "paid", "overdue", "cancelled"]],
  ["payments", "payment_method", ["cash", "transfer", "giro", "lainnya"]],
  ["invoice_costs", "status", ["estimasi", "aktual"]],
  ["invoice_margins", "profit_status", ["untung", "rugi"]],
  ["invoice_margins", "status", ["draft", "final"]],
];

await klien.query("BEGIN");
try {
  const { rows: tabel } = await klien.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  for (const { tablename } of tabel) {
    await klien.query(`ALTER TABLE "${tablename}" ENABLE ROW LEVEL SECURITY`);
    await klien.query(`REVOKE ALL ON "${tablename}" FROM anon, authenticated`);
  }
  await klien.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`);

  for (const [t, kolom, nilai] of ENUM) {
    const nama = `${t}_${kolom}_check`;
    const daftar = nilai.map((v) => `'${v}'`).join(", ");
    await klien.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "${nama}"`);
    await klien.query(`ALTER TABLE "${t}" ADD CONSTRAINT "${nama}" CHECK ("${kolom}" IN (${daftar}))`);
  }
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

/* ---------- Dibaca ulang, bukan dianggap berhasil ---------- */

const { rows: tanpaRls } = await klien.query(
  `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
);
const { rows: bocor } = await klien.query(
  `SELECT DISTINCT table_name FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')`,
);
const { rows: cek } = await klien.query(
  `SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.contype = 'c' AND c.conname LIKE '%_check'`,
);
console.log(`tabel tanpa RLS: ${tanpaRls.length} · tabel terbuka untuk anon: ${bocor.length} · CHECK terpasang: ${cek[0].n}`);
if (tanpaRls.length || bocor.length) throw new Error("Masih ada tabel yang terbuka.");

await klien.end();
console.log("selesai");
