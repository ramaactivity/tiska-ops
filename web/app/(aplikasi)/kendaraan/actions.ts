"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

export type KeadaanKendaraan = { pesan?: string; sukses?: boolean };

const kosong = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const skema = z.object({
  id: z.preprocess(kosong, z.string().regex(/^\d+$/).nullable()),
  name: z.string().trim().min(2, "Nama kendaraan minimal 2 huruf.").max(100),
  plate: z.preprocess(kosong, z.string().trim().max(20).nullable()),
  capacity_note: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  active: z.boolean(),
});

/** Master kendaraan (D-051) — owner/admin. */
export async function simpanKendaraan(_s: KeadaanKendaraan, data: FormData): Promise<KeadaanKendaraan> {
  await pastikanIzin("kendaraan");
  const hasil = skema.safeParse({ ...Object.fromEntries(data), active: data.get("active") !== "off" });
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id, ...isi } = hasil.data;
  if (id) await prisma.vehicles.update({ where: { id: BigInt(id) }, data: { ...isi, updated_at: new Date() } });
  else await prisma.vehicles.create({ data: isi });
  revalidatePath("/kendaraan");
  return { sukses: true, pesan: `${isi.name} tersimpan.` };
}
