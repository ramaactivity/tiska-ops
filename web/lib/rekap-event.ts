import "server-only";

import { Decimal } from "decimal.js";

import { rekapAlatEvent } from "./hitung/peralatan";
import { alokasiBelanja, barisBiayaRekap } from "./hitung/rekap-event";
import { prisma } from "./prisma";
import { untungPenawaranSistem } from "./untung-penawaran";
import { d, hitungMargin } from "./uang";

/**
 * Data rekap satu event (D-092): bahan rencana vs nyata, honor, alat, biaya,
 * untung. BERISI ANGKA BIAYA — pemanggil wajib menjaga dengan bolehLihatBiaya.
 */
export async function dataRekapEvent(idEvent: bigint) {
  const e = await prisma.events.findUnique({
    where: { id: idEvent },
    include: {
      invoices: { select: { id: true, invoice_number: true, grand_total: true, invoice_margins: { select: { status: true } } } },
      users_events_recap_submitted_byTousers: { select: { name: true } },
      users_events_recap_approved_byTousers: { select: { name: true } },
      users_events_recap_locked_byTousers: { select: { name: true } },
    },
  });
  if (!e) return null;

  const [pr, honor, alat, manual, perkiraan] = await Promise.all([
    prisma.purchase_requests.findMany({
      where: { event_ids: { has: idEvent }, status: { not: "batal" } },
      select: {
        id: true,
        pr_number: true,
        event_ids: true,
        est_total: true,
        purchases: { where: { status: "posted" }, select: { id: true, purchase_number: true, total: true, payment_method: true, shop_name: true, suppliers: { select: { name: true } } } },
      },
    }),
    prisma.event_assignments.findMany({
      // Honor antar Ikut Menu Pesta bukan biaya acara klien ini (D-117) — masuk laporan programnya.
      where: { event_kloters: { event_id: idEvent, program_id: null } },
      orderBy: [{ kloter_id: "asc" }, { sort: "asc" }],
      select: { id: true, role: true, person_name: true, task_note: true, attended: true, fee: true, honor_status: true, users: { select: { name: true } }, event_kloters: { select: { no: true, date: true } } },
    }),
    prisma.event_equipment.findMany({ where: { event_id: idEvent }, include: { equipment: { select: { replacement_price: true } } } }),
    e.invoice_id ? prisma.invoice_costs.findMany({ where: { invoice_id: e.invoice_id, source: null }, select: { category: true, description: true, estimated_amount: true, actual_amount: true } }) : [],
    untungPenawaranSistem(e.quotation_id).catch(() => null),
  ]);

  const nota = pr.flatMap((p) => p.purchases.map((n) => ({ ...n, pr: p.pr_number, jumlahEvent: p.event_ids.length })));
  const bahan = alokasiBelanja(nota.map((n) => ({ total: n.total, jumlahEvent: n.jumlahEvent })));
  const honorKunci = honor.filter((h) => h.honor_status === "dikunci" || h.honor_status === "dibayar");
  const honorTotal = honorKunci.reduce((s, h) => s.plus(d(h.fee)), new Decimal(0));
  const rekapAlat = rekapAlatEvent(
    alat.map((a) => ({ milikSendiri: Boolean(a.equipment_id), qty: a.qty, rusak: a.qty_damaged, hilang: a.qty_lost, biayaSewa: a.rental_cost, hargaGanti: a.equipment?.replacement_price ?? null })),
  );
  const otomatis = barisBiayaRekap({ bahan, honor: honorTotal, sewa: rekapAlat.biayaSewa });
  const margin = e.invoices
    ? hitungMargin({
        penjualan: e.invoices.grand_total,
        biaya: [
          ...manual.map((m) => ({ estimated_amount: m.estimated_amount?.toString() ?? null, actual_amount: m.actual_amount?.toString() ?? null })),
          ...otomatis.map((o) => ({ estimated_amount: null, actual_amount: o.amount.toString() })),
        ],
      })
    : null;

  return {
    e,
    nota,
    bahan,
    perkiraanBahan: perkiraan && perkiraan.dinilai ? perkiraan.hpp : null,
    perkiraanTanpaHpp: perkiraan?.tanpaHpp ?? 0,
    estPr: pr.reduce((s, p) => s.plus(d(p.est_total).dividedBy(Math.max(1, p.event_ids.length))), new Decimal(0)),
    honor,
    honorTotal,
    honorBelumKunci: honor.filter((h) => h.honor_status !== "dikunci" && h.honor_status !== "dibayar").length,
    alat,
    rekapAlat,
    otomatis,
    manual,
    margin,
  };
}
