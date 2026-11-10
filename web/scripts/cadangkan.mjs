/**
 * Menyalin SELURUH isi database ke satu berkas JSON.
 *
 *   node scripts/cadangkan.mjs
 *   node scripts/cadangkan.mjs ../cadangan/sebelum-data-nyata.json
 *
 * Supabase paket gratis tidak menyediakan pencadangan otomatis. Berkas ini
 * satu-satunya jalan pulang kalau ada yang terhapus — jadi jalankan sebelum
 * setiap tindakan yang menghapus, dan sesekali sebagai kebiasaan.
 *
 * Berkasnya memuat data pelanggan dan angka keuangan sungguhan. Disimpan di
 * folder cadangan/ yang sudah masuk .gitignore; jangan pernah di-commit dan
 * jangan dikirim lewat percakapan.
 *
 * Hash kata sandi IKUT disalin — tanpa itu, pemulihan akan mengunci semua
 * orang di luar aplikasinya sendiri.
 */

import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL, max: 1 }),
});

const cap = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const tujuan = path.resolve(
  process.argv[2] ?? path.join("..", "cadangan", `cadangan-${cap}.json`),
);

// Semua tabel di database, bukan daftar tulisan tangan: tabel baru ikut tercadang otomatis.
const TABEL = (
  await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")
).map((r) => r.tablename);

const isi = { dibuat: new Date().toISOString(), tabel: {} };

for (const t of TABEL) {
  const [{ j: baris }] = await prisma.$queryRawUnsafe(`SELECT coalesce(json_agg(x), '[]') AS j FROM "${t}" x`);
  isi.tabel[t] = baris;
  console.log(`  ${t.padEnd(18)} ${baris.length}`);
}

fs.mkdirSync(path.dirname(tujuan), { recursive: true });
fs.writeFileSync(tujuan, JSON.stringify(isi, null, 2));

/* Dibuktikan dengan membaca ulang, bukan dianggap berhasil karena tidak ada
   galat: berkas cadangan yang ternyata rusak lebih buruk daripada tidak ada
   cadangan sama sekali, karena ia memberi rasa aman yang palsu. */
const kembali = JSON.parse(fs.readFileSync(tujuan, "utf8"));
const totalDitulis = Object.values(isi.tabel).reduce((j, b) => j + b.length, 0);
const totalDibaca = Object.values(kembali.tabel).reduce((j, b) => j + b.length, 0);

console.log(`\nTersimpan: ${tujuan}`);
console.log(`Ukuran   : ${(fs.statSync(tujuan).size / 1024).toFixed(1)} KB`);
console.log(`Baris    : ${totalDitulis} ditulis, ${totalDibaca} terbaca kembali`);
console.log(totalDitulis === totalDibaca ? "Cadangan utuh." : "TIDAK COCOK — periksa.");

await prisma.$disconnect();
process.exit(totalDitulis === totalDibaca ? 0 : 1);
