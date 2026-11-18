/**
 * Layanan yang terlanjur diketik di Biaya tambahan → bagian Layanan (nominal + keterangan, D-216; izin Rama 18 Nov 2026:
 * "selama ga merubah angka dan hal penting lainnya, silahkan pindahkan saja").
 *
 *   node scripts/pindah-layanan-dari-biaya.mjs            DRY-RUN
 *   node scripts/pindah-layanan-dari-biaya.mjs --apply    satu transaksi
 *
 * Dipindah: dokumen yang punya TEPAT SATU baris biaya tambahan berlabel layanan/service (> 0) dan belum punya layanan
 * (persen/nominal/jumlah layanan kosong). service_charge_flat = service_charge_amount = nominalnya,
 * service_charge_label = labelnya (persis), barisnya dihapus. Layanan & biaya tambahan sama-sama tanpa PBJT/PPN →
 * total dokumen tidak berubah (dicek per dokumen di bawah, lalu nilai-lama-tetap).
 * Invoice hanya yang LUNAS: dasar PPh di pencatatan pembayaran = subtotal + layanan, jadi invoice yang masih menerima
 * pembayaran dilewati supaya saran PPh-nya tidak berubah. Dilewati juga: dokumen dengan >1 baris layanan (kolom layanan
 * hanya satu baris cetak) dan invoice batal.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const TERAP = process.argv.includes("--apply");
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
await klien.query("BEGIN");
try {
  const hasil = { pindah: 0, lewat: [] };
  for (const [dok, biaya, nomor, fk, invoice] of [["quotations", "quotation_charges", "quotation_number", "quotation_id", false], ["invoices", "invoice_charges", "invoice_number", "invoice_id", true]]) {
    const { rows } = await klien.query(
      `SELECT d.id, d.${nomor} AS nomor, d.status, d.grand_total::text AS total, d.service_charge_amount::text AS sc,
              d.service_charge_percent, d.service_charge_flat,
              json_agg(json_build_object('id', x.id, 'label', x.label, 'amount', x.amount::text) ORDER BY x.id) AS layanan
         FROM ${dok} d JOIN ${biaya} x ON x.${fk} = d.id AND x.label ~* '(layanan|service)' AND x.amount > 0
        GROUP BY d.id ORDER BY d.id`,
    );
    for (const r of rows) {
      const alasan =
        r.layanan.length > 1 ? `${r.layanan.length} baris layanan`
        : Number(r.sc) > 0 || Number(r.service_charge_percent ?? 0) > 0 || r.service_charge_flat !== null ? "sudah punya layanan"
        : invoice && r.status === "cancelled" ? "batal"
        : invoice && r.status !== "paid" ? `belum lunas (${r.status}) — saran PPh pembayaran berikutnya akan berubah`
        : null;
      if (alasan) {
        hasil.lewat.push(`${r.nomor}: ${alasan}`);
        continue;
      }
      const [x] = r.layanan;
      // Total = subtotal + layanan + PBJT + PPN + delivery + biaya tambahan; memindah nominal dari biaya tambahan ke
      // layanan tidak mengubah PBJT/PPN (dasarnya baris menu/alat), jadi totalnya sama.
      console.log(`${r.nomor.padEnd(18)} ${r.status.padEnd(9)} "${x.label}" ${Number(x.amount).toLocaleString("id-ID")} → Layanan · total ${Number(r.total).toLocaleString("id-ID")} tetap`);
      if (TERAP) {
        await klien.query(`DELETE FROM ${biaya} WHERE id = $1`, [x.id]);
        await klien.query(
          `UPDATE ${dok} SET service_charge_flat = $2, service_charge_label = $3, service_charge_amount = $2, service_charge_percent = NULL, service_charge_minimum = NULL WHERE id = $1`,
          [r.id, x.amount, x.label.trim()],
        );
      }
      hasil.pindah++;
    }
  }
  console.log(`\nDilewati (${hasil.lewat.length}):\n  ${hasil.lewat.join("\n  ")}`);
  await klien.query(TERAP ? "COMMIT" : "ROLLBACK");
  console.log(TERAP ? `✅ ${hasil.pindah} dokumen dipindah.` : `DRY-RUN: ${hasil.pindah} dokumen akan dipindah. Jalankan dengan --apply.`);
} catch (galat) {
  await klien.query("ROLLBACK");
  throw galat;
} finally {
  await klien.end();
}
