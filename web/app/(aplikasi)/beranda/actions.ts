"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";

/**
 * "Siap 👍" (D-052): pemilik tugas mengonfirmasi tugasnya; captain kloter
 * yang sama boleh mengonfirmasi atas nama anggota (jaring pengaman 08-TIM §3.6).
 */
export async function konfirmasiTugas(idTugas: string): Promise<void> {
  const sesi = await wajibSesi();
  if (!/^\d+$/.test(idTugas)) throw new Error("Tugas tidak dikenal.");
  const t = await prisma.event_assignments.findUnique({ where: { id: BigInt(idTugas) }, select: { id: true, user_id: true, kloter_id: true } });
  if (!t) throw new Error("Tugas tidak ditemukan.");
  const milikSendiri = t.user_id === BigInt(sesi.id);
  const captain =
    !milikSendiri &&
    (await prisma.event_assignments.count({ where: { kloter_id: t.kloter_id, user_id: BigInt(sesi.id), role: "captain" } })) > 0;
  if (!milikSendiri && !captain) throw new Error("Hanya pemilik tugas atau captain kloternya.");
  await prisma.event_assignments.update({ where: { id: t.id }, data: { confirmed_at: new Date() } });
  revalidatePath("/beranda");
}
