"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sinkronBiayaSewa } from "@/lib/biaya-sewa";
import { pastikanFotoBelanja } from "@/lib/bukti-berkas";
import { JENIS_SEWA } from "@/lib/hitung/sewa";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Biaya Sewa per event (D-147): dicatat → langsung jadi biaya nyata di Margin event-nya. */

const skema = z.object({
  idEvent: z.string().regex(/^\d+$/, "Pilih event-nya."),
  jenis: z.enum(Object.keys(JENIS_SEWA) as [string, ...string[]]),
  vendor: z.string().trim().max(255),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal pembayaran."),
  nominal: z.number().int("Nominal tanpa sen.").positive("Nominal harus lebih dari 0.").max(10_000_000_000),
  catatan: z.string().trim().max(500),
  bukti: z.array(z.string()).max(5, "Maksimal 5 foto."),
});
export type IsianSewa = z.input<typeof skema>;

function segarkan() {
  revalidatePath("/biaya-sewa");
  revalidatePath("/laporan/margin");
}

export async function simpanSewa(isian: IsianSewa): Promise<void> {
  const sesi = await pastikanIzin("biaya-sewa");
  const f = skema.parse(isian);
  await pastikanFotoBelanja(f.bukti);
  const e = await prisma.events.findUnique({ where: { id: BigInt(f.idEvent) }, select: { id: true, status: true } });
  if (!e || e.status === "batal") throw new Error("Event tidak ditemukan atau sudah dibatalkan.");
  await prisma.$transaction(async (tx) => {
    const s = await tx.rental_costs.create({
      data: {
        event_id: e.id,
        kind: f.jenis,
        vendor: f.vendor || null,
        paid_at: new Date(`${f.tanggal}T00:00:00Z`),
        amount: f.nominal,
        note: f.catatan || null,
        proof_paths: f.bukti,
        created_by: BigInt(sesi.id),
      },
      select: { id: true },
    });
    await sinkronBiayaSewa(tx, s.id, BigInt(sesi.id));
  });
  segarkan();
}

/** Salah catat → batalkan beralasan (baris Margin ikut hilang), lalu catat ulang. */
export async function batalkanSewa(id: string, alasan: string): Promise<void> {
  const sesi = await pastikanIzin("biaya-sewa");
  if (!/^\d+$/.test(id)) throw new Error("Biaya sewa tidak dikenal.");
  const baca = bacaAlasanPembatalan(alasan);
  if (!baca.ok) throw new Error(baca.pesan);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.rental_costs.updateMany({
      where: { id: BigInt(id), status: "posted" },
      data: { status: "batal", cancel_reason: baca.alasan, cancelled_by: BigInt(sesi.id), cancelled_at: new Date() },
    });
    if (!count) throw new Error("Biaya sewa ini sudah dibatalkan.");
    await sinkronBiayaSewa(tx, BigInt(id), BigInt(sesi.id));
  });
  segarkan();
}
