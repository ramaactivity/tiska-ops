"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, pastikanIzin } from "@/lib/rbac";

/** Catat penagihan (D-060): pengingat WA, telepon, janji bayar, catatan. Sales hanya untuk customer invoicenya. */
export async function catatPenagihan(
  idPelanggan: string,
  isian: { jenis: string; catatan: string; janji: string | null; invoice: string[] },
): Promise<void> {
  const sesi = await pastikanIzin("laporan-piutang");
  if (!/^\d+$/.test(idPelanggan)) throw new Error("Customer tidak dikenal.");
  if (!["wa", "telepon", "janji_bayar", "catatan"].includes(isian.jenis)) throw new Error("Jenis penagihan tidak dikenal.");
  if (isian.jenis === "janji_bayar" && !(isian.janji && /^\d{4}-\d{2}-\d{2}$/.test(isian.janji))) throw new Error("Pilih tanggal janji bayarnya.");
  const ada = await prisma.invoices.count({ where: { customer_id: BigInt(idPelanggan), ...hanyaMiliknya(sesi) } });
  if (!ada) throw new Error("Customer tidak ditemukan.");
  await prisma.collection_activities.create({
    data: {
      customer_id: BigInt(idPelanggan),
      kind: isian.jenis,
      note: isian.catatan.trim().slice(0, 2000) || null,
      promise_date: isian.janji ? new Date(`${isian.janji}T00:00:00Z`) : null,
      invoice_numbers: isian.invoice.join(", ").slice(0, 500) || null,
      created_by: BigInt(sesi.id),
    },
  });
  revalidatePath("/laporan/piutang");
}
