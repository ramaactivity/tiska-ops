"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { statusDapurBerikutnya } from "@/lib/tim";

/** Status masak per kloter (D-056) — kepala dapur/dapur, berurutan dimasak → packing → siap. */
export async function catatStatusDapur(idKloter: string, status: string): Promise<void> {
  const sesi = await pastikanIzin("layar-dapur");
  if (!/^\d+$/.test(idKloter)) throw new Error("Kloter tidak dikenal.");
  const id = BigInt(idKloter);
  const sudah = (await prisma.kloter_tracking.findMany({ where: { kloter_id: id }, select: { status: true } })).map((t) => t.status);
  if (statusDapurBerikutnya(sudah) !== status) throw new Error("Urutannya: Dimasak → Packing → Siap angkut.");
  await prisma.kloter_tracking.create({ data: { kloter_id: id, status, by_user: BigInt(sesi.id) } });
  revalidatePath("/layar-dapur");
}
