/**
 * Kwitansi ber-e-meterai (D-130, cara 1 pilihan Rama 2 Nov 2026).
 *
 *   node scripts/tambah-kwitansi-meterai.mjs && npm run db:tarik
 *
 * payments.receipt_stamped_path  PDF kwitansi yang sudah dibubuhi e-meterai di portal distributor resmi,
 *                                diunggah kembali ke bucket tertutup "bukti". Kosong = belum ada.
 * payments.receipt_stamped_at    kapan diunggah.
 * payments.receipt_stamp_mode    cara meterai kwitansi: 'digital' (PDF ber-e-meterai diunggah), 'fisik' (dicetak, meterai
 *                                tempel, aslinya dikirim), 'tidak' (tidak perlu). Kosong = belum → kwitansi wajib meterai diingatkan.
 * Tanpa FK pengunggah: FK kedua ke users akan mengganti nama relasi Prisma payments.users yang sudah dipakai.
 * Aditif & aman diulang.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  await klien.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_stamped_path VARCHAR(255)`);
  await klien.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_stamped_at TIMESTAMP(0)`);
  await klien.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_stamp_mode VARCHAR(10) CHECK (receipt_stamp_mode IN ('digital', 'fisik', 'tidak'))`);
  // Pengganti boolean "tidak perlu" dari percobaan pertama hari yang sama (selalu kosong, tidak pernah dipakai produksi).
  await klien.query(`ALTER TABLE payments DROP COLUMN IF EXISTS receipt_stamp_skipped`);
  await klien.query("COMMIT");
  console.log("✅ kolom kwitansi ber-e-meterai siap");
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
