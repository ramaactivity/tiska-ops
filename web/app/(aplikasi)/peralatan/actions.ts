"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hitungKembali, KATEGORI_ALAT } from "@/lib/hitung/peralatan";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* ==========================================================================
   PERALATAN (Fase 3.8c, D-089) — master & hitung awal, alat per event.
   Harga sewa/ganti rugi (harga ke klien) diubah Finance/owner.
   ========================================================================== */

const id = z.string().regex(/^\d+$/);
const bulat = z.number().int("Bilangan bulat.").min(0).max(1_000_000);
const harga = z.number().min(0).max(1_000_000_000).nullable();

function segarkan(idEvent?: bigint) {
  revalidatePath("/peralatan");
  if (idEvent) revalidatePath(`/event/${idEvent}`);
}

const skemaAlat = z.object({
  id: id.nullable(),
  kategori: z.enum(KATEGORI_ALAT),
  nama: z.string().trim().min(2, "Nama alat minimal 2 huruf.").max(255),
  satuan: z.string().trim().min(1).max(20),
  hargaSewa: harga,
  hargaGanti: harga,
  aktif: z.boolean(),
  /** Disewakan ke klien (D-209): tampil di section Sewa alat quotation/invoice. Tidak dikirim = tidak diubah. */
  disewakan: z.boolean().optional(),
});

export async function simpanAlat(isian: z.input<typeof skemaAlat>): Promise<void> {
  const sesi = await pastikanIzin("peralatan");
  const f = skemaAlat.parse(isian);
  const uang = bolehKelolaUang(sesi.peran) ? { rental_price: f.hargaSewa, replacement_price: f.hargaGanti } : {};
  const sewa = bolehKelolaUang(sesi.peran) && f.disewakan !== undefined ? { for_rent: f.disewakan } : {};
  const data = { category: f.kategori, name: f.nama, unit: f.satuan, active: f.aktif, ...uang, ...sewa, updated_at: new Date() };
  if (f.id) await prisma.equipment.update({ where: { id: BigInt(f.id) }, data });
  else await prisma.equipment.create({ data });
  segarkan();
}

/** Hitung awal / hitung ulang: jumlah milik, rusak, catatan (wizard per kategori). */
export async function hitungAlat(idAlat: string, milik: number, rusak: number, catatan: string): Promise<void> {
  const sesi = await pastikanIzin("peralatan");
  const m = bulat.parse(milik);
  const r = bulat.parse(rusak);
  if (r > m) throw new Error("Jumlah rusak tidak boleh melebihi jumlah milik.");
  await prisma.equipment.update({
    where: { id: BigInt(id.parse(idAlat)) },
    data: { owned_qty: m, damaged_qty: r, notes: catatan.trim().slice(0, 255) || null, counted_by: BigInt(sesi.id), counted_at: new Date(), updated_at: new Date() },
  });
  segarkan();
}

/* ---------- Alat per event ---------- */

const skemaTambah = z.object({
  idAlat: id.nullable(),
  vendor: z.string().trim().max(255),
  nama: z.string().trim().max(255),
  qty: z.number().int("Jumlah bilangan bulat.").positive("Jumlah harus lebih dari 0.").max(100_000),
  biayaSewa: harga,
});

export async function tambahAlatEvent(idEvent: string, isian: z.input<typeof skemaTambah>): Promise<void> {
  const sesi = await pastikanIzin("peralatan");
  const f = skemaTambah.parse(isian);
  const ev = BigInt(id.parse(idEvent));
  if (f.idAlat) {
    const alat = await prisma.equipment.findUnique({ where: { id: BigInt(f.idAlat) }, select: { name: true } });
    if (!alat) throw new Error("Alat tidak ditemukan.");
    await prisma.event_equipment.create({ data: { event_id: ev, equipment_id: BigInt(f.idAlat), item_name: alat.name, qty: f.qty, created_by: BigInt(sesi.id) } });
  } else {
    if (f.nama.length < 2 || f.vendor.length < 2) throw new Error("Isi nama alat dan nama vendor sewaan.");
    await prisma.event_equipment.create({
      data: { event_id: ev, item_name: f.nama, vendor_name: f.vendor, qty: f.qty, rental_cost: f.biayaSewa, created_by: BigInt(sesi.id) },
    });
  }
  segarkan(ev);
}

async function barisIni(idBaris: string, status: string) {
  await pastikanIzin("peralatan");
  const b = await prisma.event_equipment.findUnique({ where: { id: BigInt(id.parse(idBaris)) } });
  if (!b) throw new Error("Baris alat tidak ditemukan.");
  if (b.status !== status) throw new Error("Status alat sudah berubah. Muat ulang halaman.");
  return b;
}

export async function hapusAlatEvent(idBaris: string): Promise<void> {
  const b = await barisIni(idBaris, "rencana");
  await prisma.event_equipment.delete({ where: { id: b.id } });
  segarkan(b.event_id);
}

export async function keluarkanAlat(idBaris: string): Promise<void> {
  const b = await barisIni(idBaris, "rencana");
  await prisma.event_equipment.updateMany({ where: { id: b.id, status: "rencana" }, data: { status: "keluar", out_at: new Date() } });
  segarkan(b.event_id);
}

/** Kembali: rusak & hilang dicatat; alat milik sendiri → hilang mengurangi jumlah milik, rusak menambah jumlah rusak. */
export async function kembalikanAlat(idBaris: string, rusak: number, hilang: number, catatan: string): Promise<void> {
  const b = await barisIni(idBaris, "keluar");
  const h = hitungKembali(b.qty, rusak, hilang);
  if ("galat" in h) throw new Error(h.galat);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.event_equipment.updateMany({
      where: { id: b.id, status: "keluar" },
      data: { status: "kembali", qty_back: h.baik, qty_damaged: rusak, qty_lost: hilang, note: catatan.trim().slice(0, 255) || null, back_at: new Date() },
    });
    if (!count) throw new Error("Status alat sudah berubah. Muat ulang halaman.");
    if (b.equipment_id && (rusak || hilang)) {
      const alat = await tx.equipment.findUniqueOrThrow({ where: { id: b.equipment_id }, select: { owned_qty: true, damaged_qty: true } });
      const milik = Math.max(0, (alat.owned_qty ?? 0) - hilang);
      await tx.equipment.update({
        where: { id: b.equipment_id },
        data: { owned_qty: milik, damaged_qty: Math.min(milik, alat.damaged_qty + rusak), updated_at: new Date() },
      });
    }
  });
  segarkan(b.event_id);
}
