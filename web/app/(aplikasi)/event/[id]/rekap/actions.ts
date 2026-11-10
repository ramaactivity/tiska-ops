"use server";

import { revalidatePath } from "next/cache";

import { sinkronBiayaPr } from "@/lib/biaya-pr";
import { sinkronBiayaSewa } from "@/lib/biaya-sewa";
import { hitungUlangMargin } from "@/lib/margin";
import { aksesPenuh, bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { dataRekapEvent } from "@/lib/rekap-event";

/* ==========================================================================
   REKAP EVENT (Fase 3.9b, D-092): diajukan → disetujui (Finance; biaya nyata
   ditulis ke laporan Margin) → dikunci (owner). Buka kembali hanya admin.
   ========================================================================== */

function idEvent(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("Event tidak dikenal.");
  return BigInt(id);
}

function segarkan(id: bigint, invoiceId?: bigint | null) {
  revalidatePath(`/event/${id}`);
  revalidatePath(`/event/${id}/rekap`);
  revalidatePath("/laporan/margin");
  if (invoiceId) revalidatePath(`/tagihan/${invoiceId}/margin`);
}

/** Tim operasional menandai event selesai & siap direkap (alat kembali, absen terkirim). */
export async function ajukanRekap(id: string): Promise<void> {
  const sesi = await pastikanIzin("event");
  const e = idEvent(id);
  const { count } = await prisma.events.updateMany({
    where: { id: e, recap_status: null },
    data: { recap_status: "diajukan", recap_submitted_by: BigInt(sesi.id), recap_submitted_at: new Date() },
  });
  if (!count) throw new Error("Rekap event ini sudah diajukan.");
  segarkan(e);
}

/**
 * Finance menyetujui: baris biaya otomatis (bahan nyata, honor, sewa alat)
 * menggantikan baris otomatis sebelumnya di invoice_costs — baris manual
 * tidak disentuh — lalu ringkasan margin dihitung ulang.
 */
export async function setujuiRekap(id: string): Promise<void> {
  const sesi = await pastikanIzin("event");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang menyetujui rekap.");
  const e = idEvent(id);
  const r = await dataRekapEvent(e);
  if (!r) throw new Error("Event tidak ditemukan.");
  if (r.e.recap_status === "dikunci") throw new Error("Rekap sudah dikunci.");
  const inv = r.e.invoices;
  if (!inv) throw new Error("Event ini belum punya invoice — biaya tidak bisa ditulis ke laporan Margin.");
  if (inv.invoice_margins?.status === "final") throw new Error("Margin invoice ini sudah difinalisasi. Buka kembali di halaman Margin dulu.");
  await prisma.$transaction(async (tx) => {
    await tx.invoice_costs.deleteMany({ where: { invoice_id: inv.id, source: "rekap_event" } });
    if (r.otomatis.length) {
      await tx.invoice_costs.createMany({
        data: r.otomatis.map((b) => ({
          invoice_id: inv.id,
          category: b.category,
          description: b.description,
          actual_amount: b.amount,
          status: "aktual",
          source: "rekap_event",
          created_by: BigInt(sesi.id),
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    // PR event ini ditulis ulang juga — event yang baru diberi invoice sesudah PR diajukan ikut tersambung (D-146).
    for (const p of await tx.purchase_requests.findMany({ where: { event_ids: { has: e } }, select: { id: true } })) {
      await sinkronBiayaPr(tx, p.id, BigInt(sesi.id));
    }
    for (const s of await tx.rental_costs.findMany({ where: { event_id: e }, select: { id: true } })) {
      await sinkronBiayaSewa(tx, s.id, BigInt(sesi.id));
    }
    await tx.events.update({ where: { id: e }, data: { recap_status: "disetujui", recap_approved_by: BigInt(sesi.id), recap_approved_at: new Date() } });
    await hitungUlangMargin(inv.id, tx);
  });
  segarkan(e, inv.id);
}

export async function kunciRekap(id: string): Promise<void> {
  const sesi = await pastikanIzin("event");
  if (!aksesPenuh(sesi.peran)) throw new Error("Hanya owner yang mengunci rekap.");
  const e = idEvent(id);
  const { count } = await prisma.events.updateMany({
    where: { id: e, recap_status: "disetujui" },
    data: { recap_status: "dikunci", recap_locked_by: BigInt(sesi.id), recap_locked_at: new Date() },
  });
  if (!count) throw new Error("Rekap harus disetujui Finance dulu.");
  segarkan(e);
}

export async function bukaRekap(id: string): Promise<void> {
  const sesi = await pastikanIzin("event");
  if (sesi.peran !== "admin") throw new Error("Hanya admin yang membuka kembali rekap yang dikunci.");
  const e = idEvent(id);
  await prisma.events.updateMany({ where: { id: e, recap_status: "dikunci" }, data: { recap_status: "disetujui", recap_locked_by: null, recap_locked_at: null } });
  segarkan(e);
}
