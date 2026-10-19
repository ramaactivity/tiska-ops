import "server-only";

import { penggunaAktif } from "./auth";
import { aksesPenuh, bolehKelolaUang } from "./peran";
import { prisma } from "./prisma";

/** Captain kloter ini (akun yang ditugaskan sebagai captain), atau owner/Finance. */
export async function bolehAbsenKloter(kloterId: bigint): Promise<{ sesiId: string; kelola: boolean } | null> {
  const sesi = await penggunaAktif();
  if (!sesi) return null;
  const kelola = aksesPenuh(sesi.peran) || bolehKelolaUang(sesi.peran);
  if (kelola) return { sesiId: sesi.id, kelola };
  const kapten = await prisma.event_assignments.count({ where: { kloter_id: kloterId, user_id: BigInt(sesi.id), role: "captain" } });
  return kapten ? { sesiId: sesi.id, kelola } : null;
}

