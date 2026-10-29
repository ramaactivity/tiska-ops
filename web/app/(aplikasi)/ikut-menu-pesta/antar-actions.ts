"use server";

import { revalidatePath } from "next/cache";

import { simpanBukti } from "@/lib/bukti-berkas";
import type { PesanPush } from "@/lib/hitung/notifikasi";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { wajibSesi } from "@/lib/rbac";
import { waktuLapor } from "@/lib/tim";

const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/**
 * Driver menandai satu alamat "sudah diantar" (D-117) dari antrian HP (D-099):
 * foto wajib; pesanan bayar-saat-kirim mencatat uang tunai yang diterima (sisa
 * tagihan) untuk disetor ke Finance. Kiriman ulang dianggap beres. Alamat
 * terakhir di kloter menutup kloter (Sudah sampai + Selesai) supaya status di
 * Pengiriman & Layar Dapur ikut beres.
 */
export async function catatAntarPesanan(idPesanan: string, bukti: { foto: Blob | null; tunai: boolean; jam?: number }): Promise<void> {
  const sesi = await wajibSesi();
  if (!/^\d+$/.test(idPesanan)) throw new Error("Pesanan tidak dikenal.");
  const o = await prisma.retail_orders.findUnique({
    where: { id: BigInt(idPesanan) },
    select: {
      id: true,
      program_id: true,
      kloter_id: true,
      status: true,
      payment_mode: true,
      delivered_at: true,
      recipient_name: true,
      invoices: { select: { grand_total: true, paid_amount: true } },
    },
  });
  if (!o || o.status !== "aktif" || !o.kloter_id) throw new Error("Pesanan ini tidak dijadwalkan antar.");
  if (!(await prisma.event_assignments.count({ where: { kloter_id: o.kloter_id, user_id: BigInt(sesi.id) } }))) throw new Error("Kamu tidak bertugas di kloter ini.");
  if (o.delivered_at) return; // dikirim ulang dari antrian HP
  const lacak = (await prisma.kloter_tracking.findMany({ where: { kloter_id: o.kloter_id }, select: { status: true } })).map((t) => t.status);
  if (!lacak.includes("berangkat")) throw new Error("Tekan Berangkat dulu.");
  if (!bukti.foto?.size) throw new Error("Foto bukti wajib.");
  if (bukti.foto.size > 4_000_000 || !bukti.foto.type.startsWith("image/")) throw new Error("Foto tidak sah.");

  const jalur = `kloter/${o.kloter_id}/antar-${o.id}-${Date.now()}.jpg`;
  await simpanBukti(jalur, bukti.foto);
  const saat = waktuLapor(bukti.jam);
  const sisa = o.invoices ? Math.max(0, Number(o.invoices.grand_total) - Number(o.invoices.paid_amount)) : 0;
  await prisma.retail_orders.update({
    where: { id: o.id },
    data: {
      delivered_at: saat,
      delivered_by: BigInt(sesi.id),
      delivery_photo: jalur,
      cod_collected: o.payment_mode === "cod" && bukti.tunai ? sisa : null,
      updated_at: new Date(),
    },
  });

  const belum = await prisma.retail_orders.count({ where: { kloter_id: o.kloter_id, status: "aktif", delivered_at: null } });
  if (!belum) {
    for (const status of ["tiba", "selesai"].filter((s) => !lacak.includes(s))) {
      await prisma.kloter_tracking.create({ data: { kloter_id: o.kloter_id, status, by_user: BigInt(sesi.id), at: saat, photo_path: status === "tiba" ? jalur : null } });
    }
  }

  const admin = await prisma.users.findMany({ where: { is_active: true, role: "admin", id: { not: BigInt(sesi.id) } }, select: { id: true } });
  const pesan: PesanPush = {
    judul: `✅ Diantar ${jamWib.format(saat)} · ${sesi.nama}`,
    isi: `${o.recipient_name} — Ikut Menu Pesta${o.payment_mode === "cod" ? (bukti.tunai ? " · uang tunai diterima" : " · BELUM bayar") : ""}${belum ? "" : " · semua alamat selesai"}`,
    url: `/ikut-menu-pesta/${o.program_id}`,
    tag: `antar-${o.id}`,
  };
  kirimNanti(admin.map((u) => u.id), pesan);
  revalidatePath("/beranda");
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
}
