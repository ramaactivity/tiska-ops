"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { KATEGORI_ASET, type KategoriAset, rapikanTautan } from "@/lib/hitung/aset";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Aset Digital (D-127): tautan Drive/Canva/dokumen. Hanya tautan — berkas aslinya tidak pernah disentuh. */

type Hasil = { ok: true; pesan: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const skema = z.object({
  id: id.nullish(),
  judul: z.string().trim().min(1, "Isi judulnya.").max(150),
  tautan: z.string(),
  kategori: z.enum(Object.keys(KATEGORI_ASET) as [KategoriAset, ...KategoriAset[]]),
  catatan: z.string().trim().max(500),
  idEvent: id.nullish(),
  sematkan: z.boolean(),
});

function segarkan(idEvent?: bigint | null) {
  revalidatePath("/aset");
  if (idEvent) revalidatePath(`/event/${idEvent}`);
}

export async function simpanAset(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("aset");
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const url = rapikanTautan(p.data.tautan);
  if (!url) return { ok: false, pesan: "Tautannya tidak dikenali. Salin ulang dari tombol Bagikan/Share di Drive atau Canva." };
  const idEvent = p.data.idEvent ? BigInt(p.data.idEvent) : null;
  if (idEvent && !(await prisma.events.count({ where: { id: idEvent } }))) return { ok: false, pesan: "Acaranya tidak ditemukan." };
  const data = { title: p.data.judul, url, category: p.data.kategori, note: p.data.catatan || null, event_id: idEvent, pinned: p.data.sematkan, updated_at: new Date() };
  if (p.data.id) {
    const lama = await prisma.digital_assets.findUnique({ where: { id: BigInt(p.data.id) }, select: { event_id: true } });
    if (!lama) return { ok: false, pesan: "Tautan sudah dihapus. Muat ulang halaman." };
    await prisma.digital_assets.update({ where: { id: BigInt(p.data.id) }, data });
    segarkan(lama.event_id);
  } else {
    await prisma.digital_assets.create({ data: { ...data, created_by: BigInt(sesi.id) } });
  }
  segarkan(idEvent);
  return { ok: true, pesan: p.data.id ? "Tautan diperbarui." : "Tautan disimpan." };
}

export async function sematkanAset(idAset: string, sematkan: boolean): Promise<Hasil> {
  await pastikanIzin("aset");
  if (!id.safeParse(idAset).success) return { ok: false, pesan: "Tautan tidak dikenal." };
  const a = await prisma.digital_assets.update({ where: { id: BigInt(idAset) }, data: { pinned: sematkan }, select: { event_id: true } }).catch(() => null);
  if (!a) return { ok: false, pesan: "Tautan sudah dihapus. Muat ulang halaman." };
  segarkan(a.event_id);
  return { ok: true, pesan: sematkan ? "Ditandai penting — tampil paling atas." : "Tanda penting dilepas." };
}

export async function hapusAset(idAset: string): Promise<Hasil> {
  await pastikanIzin("aset");
  if (!id.safeParse(idAset).success) return { ok: false, pesan: "Tautan tidak dikenal." };
  const a = await prisma.digital_assets.delete({ where: { id: BigInt(idAset) }, select: { event_id: true } }).catch(() => null);
  if (!a) return { ok: false, pesan: "Tautan sudah dihapus." };
  segarkan(a.event_id);
  return { ok: true, pesan: "Tautan dihapus dari Tiska Ops. Berkas di Drive/Canva tidak berubah." };
}
