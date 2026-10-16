"use server";

import { revalidatePath } from "next/cache";

import { aksesPenuh } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, pastikanIzin } from "@/lib/rbac";
import { setujuiHargaOwner } from "@/lib/untung-penawaran";
import { buktiTersimpan, tautanUnggahBukti } from "@/lib/bukti-berkas";
import { CARA_SETUJU } from "@/lib/persetujuan-klien";

/* ==========================================================================
   PERUBAHAN STATUS PENAWARAN

   Alur statusnya: draft -> terkirim -> disetujui / ditolak.
   Kadaluarsa terjadi sendiri ketika tanggal berlaku lewat.

   Penawaran hanya boleh dihapus selagi masih draft. Begitu terkirim ke
   pelanggan, ia menjadi catatan yang tidak boleh hilang diam-diam —
   aturan ini dibawa apa adanya dari Laravel.
   ========================================================================== */

const BOLEH_DIUBAH: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["approved", "rejected"],
  expired: ["sent"],
  rejected: ["sent"],
  approved: [],
};

export async function ubahStatusPenawaran(id: string, tujuan: string): Promise<void> {
  const sesi = await pastikanIzin("penawaran");

  // Penyaringnya ikut ke dalam pencarian, bukan diperiksa sesudahnya. Sales
  // tidak pernah melihat quotation orang lain di layar, tetapi tindakan ini
  // dipanggil dengan nomor — dan nomor bisa diketik sendiri.
  const penawaran = await prisma.quotations.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    select: { status: true },
  });
  if (!penawaran) throw new Error("Quotation tidak ditemukan.");

  if (!BOLEH_DIUBAH[penawaran.status]?.includes(tujuan)) {
    throw new Error("Perubahan status itu tidak diizinkan dari keadaan sekarang.");
  }

  await prisma.quotations.update({
    where: { id: BigInt(id) },
    data: { status: tujuan, updated_at: new Date() },
  });

  revalidatePath("/penawaran");
  revalidatePath(`/penawaran/${id}`);
}

export async function hapusPenawaran(id: string): Promise<void> {
  const sesi = await pastikanIzin("penawaran");

  const penawaran = await prisma.quotations.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    select: { status: true, invoices: { take: 1, select: { id: true } } },
  });
  if (!penawaran) return;

  if (penawaran.status !== "draft") {
    throw new Error("Hanya quotation berstatus draft yang bisa dihapus.");
  }
  if (penawaran.invoices.length > 0) {
    throw new Error("Quotation ini sudah dijadikan invoice, jadi tidak bisa dihapus.");
  }

  // Baris item ikut terhapus otomatis lewat aturan cascade di database.
  await prisma.quotations.delete({ where: { id: BigInt(id) } });

  revalidatePath("/penawaran");
}

/**
 * Menandai penawaran yang masa berlakunya sudah lewat.
 *
 * Dijalankan sekali saat daftar dibuka. Kalau tidak ada yang perlu diubah,
 * biayanya hanya satu kueri yang tidak mengubah baris apa pun — jauh lebih
 * murah daripada membiarkan status salah dan tersaring keliru di laporan.
 */
export async function tandaiKadaluarsa(): Promise<void> {
  const kemarin = new Date();
  kemarin.setHours(0, 0, 0, 0);

  await prisma.quotations.updateMany({
    where: { status: "sent", valid_until: { lt: kemarin } },
    data: { status: "expired" },
  });
}

/** Owner menyetujui harga quotation yang untungnya di bawah batas (D-013). */
export async function setujuiHarga(id: string): Promise<void> {
  const sesi = await pastikanIzin("penawaran");
  if (!aksesPenuh(sesi.peran)) throw new Error("Hanya owner yang bisa menyetujui harga ini.");
  if (!/^\d+$/.test(id)) throw new Error("Quotation tidak dikenal.");
  await setujuiHargaOwner(sesi, BigInt(id));
  revalidatePath("/penawaran");
  revalidatePath(`/penawaran/${id}`);
}

/* ---------- Persetujuan klien (01-SPEC E.12, D-044) ---------- */

const JENIS_BUKTI: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" };

async function penawaranTerkirim(id: string) {
  const sesi = await pastikanIzin("penawaran");
  if (!/^\d+$/.test(id)) throw new Error("Quotation tidak dikenal.");
  const p = await prisma.quotations.findFirst({ where: { id: BigInt(id), ...hanyaMiliknya(sesi) }, select: { status: true } });
  if (!p) throw new Error("Quotation tidak ditemukan.");
  if (p.status !== "sent") throw new Error("Hanya quotation berstatus terkirim yang bisa disetujui customer.");
  return sesi;
}

/** Tautan unggah sekali pakai untuk bukti persetujuan (browser → penyimpanan langsung). */
export async function mintaUnggahBukti(id: string, tipe: string): Promise<{ url: string; jalur: string }> {
  await penawaranTerkirim(id);
  const ext = JENIS_BUKTI[tipe];
  if (!ext) throw new Error("Bukti harus gambar (PNG/JPG/WEBP) atau PDF.");
  const jalur = `penawaran/${id}/persetujuan-${Date.now()}.${ext}`;
  return { url: await tautanUnggahBukti(jalur), jalur };
}

/** Mencatat persetujuan customer: cara, catatan, bukti (opsional) → status disetujui. */
export async function catatPersetujuanKlien(
  id: string,
  isian: { cara: string; catatan: string; jalur: string | null },
): Promise<void> {
  const sesi = await penawaranTerkirim(id);
  if (!Object.hasOwn(CARA_SETUJU, isian.cara)) throw new Error("Pilih cara customer menyetujui.");
  if (isian.jalur) {
    if (!isian.jalur.startsWith(`penawaran/${id}/`)) throw new Error("Bukti tidak sah.");
    if (!(await buktiTersimpan(isian.jalur))) throw new Error("Bukti belum terunggah. Coba unggah lagi.");
  }
  await prisma.quotations.update({
    where: { id: BigInt(id) },
    data: {
      status: "approved",
      client_approval_method: isian.cara,
      client_approval_note: isian.catatan.trim().slice(0, 1000) || null,
      client_approval_proof: isian.jalur,
      client_approved_at: new Date(),
      client_approved_by: BigInt(sesi.id),
      updated_at: new Date(),
    },
  });
  revalidatePath("/penawaran");
  revalidatePath(`/penawaran/${id}`);
}
