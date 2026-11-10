import path from "node:path";

import pg from "pg";
import { beforeAll, expect } from "vitest";

/* ==========================================================================
   PENGAMAN UJI ALUR (D-146)

   Sejak 10 Nov 2026 database Tiska Ops berisi data asli (D-144). Tes alur
   memakai database yang sama dan sebagian besar MENULIS: quotation, invoice,
   payment tes masuk Kartu Piutang & Laporan Penjualan, dan nomor dokumen
   yang terpakai tidak kembali.

   Jadi tes yang menulis ditolak selama ada customer asli (bukan is_test),
   kecuali UJI_ALUR_DATA_ASLI=ya sengaja dipasang. Tes yang terbukti hanya
   membaca tetap boleh jalan — justru berguna untuk memeriksa data asli.
   ========================================================================== */

// Aman di data asli: hanya membaca, atau seluruhnya di dalam transaksi yang di-rollback (biaya-rab, sesi tiska-ops-4d).
const BACA_SAJA = new Set(["nilai-lama-tetap.test.ts", "kartu-dasbor.test.ts", "laporan-sejalan.test.ts", "piutang-sejalan.test.ts", "excel-dokumen.test.ts", "biaya-rab.test.ts"]);

beforeAll(async () => {
  const berkas = path.basename(expect.getState().testPath ?? "");
  if (BACA_SAJA.has(berkas) || process.env.UJI_ALUR_DATA_ASLI === "ya") return;
  const klien = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await klien.connect();
  try {
    const { rows } = await klien.query<{ n: number }>("SELECT count(*)::int n FROM customers WHERE NOT is_test");
    if (rows[0].n > 0)
      throw new Error(
        `${berkas} menulis ke database, dan database ini berisi ${rows[0].n} customer asli. ` +
          `Jalankan hanya tes baca-saja (${[...BACA_SAJA].join(", ")}), atau pasang UJI_ALUR_DATA_ASLI=ya kalau memang disengaja.`,
      );
  } finally {
    await klien.end();
  }
});
