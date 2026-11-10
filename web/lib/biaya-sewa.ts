import "server-only";

import type { Prisma } from "@prisma/client";

import { JENIS_SEWA, type JenisSewa, keteranganSewa } from "./hitung/sewa";
import { hitungUlangMargin } from "./margin";

/**
 * Tulis ulang baris Margin dari satu biaya sewa (D-147): biaya nyata (aktual) di
 * invoice event-nya, source 'sewa'. Dipanggil saat dicatat, dibatalkan, dan saat
 * invoice event berganti. Margin yang sudah final tidak disentuh.
 */
export async function sinkronBiayaSewa(tx: Prisma.TransactionClient, id: bigint, oleh: bigint): Promise<void> {
  const s = await tx.rental_costs.findUnique({
    where: { id },
    select: { kind: true, vendor: true, amount: true, status: true, note: true, events: { select: { invoice_id: true } } },
  });
  if (!s) return;
  const lama = await tx.invoice_costs.findMany({ where: { rental_cost_id: id }, select: { invoice_id: true }, distinct: ["invoice_id"] });
  const semua = [...new Set([s.events.invoice_id, ...lama.map((l) => l.invoice_id)].filter((v): v is bigint => v != null).map(String))].map(BigInt);
  const final = new Set(
    (await tx.invoice_margins.findMany({ where: { invoice_id: { in: semua }, status: "final" }, select: { invoice_id: true } })).map((m) => m.invoice_id.toString()),
  );
  const boleh = (v: bigint) => !final.has(v.toString());

  await tx.invoice_costs.deleteMany({ where: { rental_cost_id: id, invoice_id: { notIn: [...final].map(BigInt) } } });
  const inv = s.events.invoice_id;
  if (s.status === "posted" && inv && boleh(inv)) {
    const jenis = s.kind as JenisSewa;
    await tx.invoice_costs.create({
      data: {
        invoice_id: inv,
        rental_cost_id: id,
        source: "sewa",
        category: JENIS_SEWA[jenis].kategori,
        description: keteranganSewa(jenis, s.vendor),
        actual_amount: s.amount,
        status: "aktual",
        notes: s.note,
        created_by: oleh,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  for (const v of semua.filter(boleh)) await hitungUlangMargin(v, tx);
}
