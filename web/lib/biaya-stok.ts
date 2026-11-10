import "server-only";

import type { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";

import { sinkronBiayaPr } from "./biaya-pr";
import { sinkronBiayaSewa } from "./biaya-sewa";
import { hitungUlangMargin } from "./margin";
import { bulatkanRupiah } from "./uang";

/**
 * Barang keluar gudang untuk satu event (D-148) → satu baris biaya aktual di Margin
 * invoice event itu (source 'stok_keluar', event_id): Σ jumlah × harga yang dibekukan
 * saat dikeluarkan. Margin final tidak disentuh.
 */
export async function sinkronStokKeluar(tx: Prisma.TransactionClient, eventId: bigint, oleh: bigint): Promise<void> {
  const [e, keluar, lama] = await Promise.all([
    tx.events.findUnique({ where: { id: eventId }, select: { invoice_id: true } }),
    tx.stock_movements.findMany({ where: { event_id: eventId, kind: "keluar" }, select: { qty: true, unit_cost: true } }),
    tx.invoice_costs.findMany({ where: { event_id: eventId, source: "stok_keluar" }, select: { invoice_id: true }, distinct: ["invoice_id"] }),
  ]);
  if (!e) return;
  const semua = [...new Set([e.invoice_id, ...lama.map((l) => l.invoice_id)].filter((v): v is bigint => v != null).map(String))].map(BigInt);
  const final = new Set(
    (await tx.invoice_margins.findMany({ where: { invoice_id: { in: semua }, status: "final" }, select: { invoice_id: true } })).map((m) => m.invoice_id.toString()),
  );
  const boleh = (v: bigint) => !final.has(v.toString());

  await tx.invoice_costs.deleteMany({ where: { event_id: eventId, source: "stok_keluar", invoice_id: { notIn: [...final].map(BigInt) } } });
  const total = bulatkanRupiah(keluar.reduce((s, k) => s.plus(k.qty.abs().times(k.unit_cost ?? 0)), new Decimal(0)));
  const tanpaHarga = keluar.filter((k) => k.unit_cost == null).length;
  if (e.invoice_id && boleh(e.invoice_id) && keluar.length) {
    await tx.invoice_costs.create({
      data: {
        invoice_id: e.invoice_id,
        event_id: eventId,
        source: "stok_keluar",
        category: "hpp_bahan_baku",
        description: `Barang keluar gudang (${keluar.length} catatan)`,
        actual_amount: total,
        status: "aktual",
        notes: tanpaHarga ? `${tanpaHarga} barang belum punya harga beli — belum terhitung.` : null,
        created_by: oleh,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  for (const v of semua.filter(boleh)) await hitungUlangMargin(v, tx);
}

/** Semua biaya otomatis satu event (RAB, Biaya Sewa, barang keluar) ditulis ulang — saat invoice event berganti / rekap disetujui. */
export async function sinkronBiayaEvent(tx: Prisma.TransactionClient, eventId: bigint, oleh: bigint): Promise<void> {
  for (const p of await tx.purchase_requests.findMany({ where: { event_ids: { has: eventId } }, select: { id: true } })) await sinkronBiayaPr(tx, p.id, oleh);
  for (const s of await tx.rental_costs.findMany({ where: { event_id: eventId }, select: { id: true } })) await sinkronBiayaSewa(tx, s.id, oleh);
  await sinkronStokKeluar(tx, eventId, oleh);
}
