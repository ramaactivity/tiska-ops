"use server";

import { revalidatePath } from "next/cache";

import { simpanBukti } from "@/lib/bukti-berkas";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";

/* Bukti transfer dari pembeli (D-120) — tanpa login, hanya lewat token pribadi pesanan. Lunas tetap dicatat Finance lewat Payment. */

const MAKS_BYTE = 1_500_000; // foto sudah dikecilkan di HP (lib/foto) — ±200 KB

export async function kirimBuktiTransfer(token: string, data: FormData): Promise<{ ok: boolean; pesan?: string }> {
  if (!/^[0-9a-f]{32}$/.test(token)) return { ok: false, pesan: "Link pesanan tidak sah." };
  const foto = data.get("foto");
  if (!(foto instanceof Blob) || !foto.type.startsWith("image/") || foto.size === 0) return { ok: false, pesan: "Pilih foto bukti transfer." };
  if (foto.size > MAKS_BYTE) return { ok: false, pesan: "Foto terlalu besar. Coba foto ulang / screenshot." };

  const o = await prisma.retail_orders.findUnique({
    where: { public_token: token },
    select: { id: true, program_id: true, status: true, recipient_name: true, invoices: { select: { status: true } }, retail_programs: { select: { name: true } } },
  });
  if (!o || o.status !== "aktif") return { ok: false, pesan: "Pesanan tidak ditemukan atau sudah dibatalkan." };
  if (o.invoices?.status === "paid") return { ok: false, pesan: "Pesanan ini sudah lunas." };

  const jalur = `retail/${o.id}/transfer-${Date.now()}.jpg`;
  await simpanBukti(jalur, foto);
  await prisma.retail_orders.update({ where: { id: o.id }, data: { transfer_proof: jalur, transfer_proof_at: new Date(), updated_at: new Date() } });
  kirimNanti(["finance"], { judul: "Bukti transfer Ikut Menu Pesta masuk", isi: `${o.recipient_name} — ${o.retail_programs.name}`, url: `/ikut-menu-pesta/${o.program_id}`, tag: `transfer-${o.id}` });
  revalidatePath(`/pesanan/${token}`);
  return { ok: true };
}
