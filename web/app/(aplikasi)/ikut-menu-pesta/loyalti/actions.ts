"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hariIniWib } from "@/lib/kalender";
import { kartuPelanggan } from "@/lib/loyalti";
import { bolehSetujuiProgram } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Program Loyalti (D-131): aturan diatur Finance/owner; hadiah dipakai oleh siapa pun yang mengurus Ikut Menu Pesta. */

type Hasil = { ok: true; pesan: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const angkaOpsional = (maks: number) =>
  z
    .string()
    .regex(/^\d*$/)
    .transform((x) => (x ? Number(x) : null))
    .refine((x) => x === null || (x >= 1 && x <= maks), `Angka 1–${maks}.`);

const skema = z.object({
  id: id.nullish(),
  nama: z.string().trim().min(1, "Isi nama programnya.").max(120),
  syarat: z.number().int().min(1, "Minimal 1 pesanan.").max(100),
  minBelanja: z
    .string()
    .regex(/^\d{0,12}$/)
    .transform((x) => (x && Number(x) > 0 ? x : null)),
  jendelaHari: angkaOpsional(3650),
  hadiah: z.string().trim().min(1, "Isi hadiahnya.").max(300),
  berlakuHari: angkaOpsional(3650),
  mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal mulai."),
});

function segarkan() {
  revalidatePath("/ikut-menu-pesta", "layout");
}

export async function simpanProgramLoyalti(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!bolehSetujuiProgram(sesi.peran)) return { ok: false, pesan: "Aturan loyalti diatur Finance atau owner." };
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const f = p.data;
  const data = {
    name: f.nama,
    stamps_needed: f.syarat,
    min_order_value: f.minBelanja,
    window_days: f.jendelaHari,
    reward: f.hadiah,
    reward_valid_days: f.berlakuHari,
    starts_on: new Date(`${f.mulai}T00:00:00Z`),
    updated_at: new Date(),
  };
  if (f.id) await prisma.loyalty_programs.update({ where: { id: BigInt(f.id) }, data });
  else await prisma.loyalty_programs.create({ data: { ...data, created_by: BigInt(sesi.id) } });
  segarkan();
  return { ok: true, pesan: f.id ? "Program diperbarui — kartu semua pembeli dihitung ulang dengan aturan baru." : "Program loyalti dibuat." };
}

export async function aktifkanProgramLoyalti(idProgram: string, aktif: boolean): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!bolehSetujuiProgram(sesi.peran)) return { ok: false, pesan: "Aturan loyalti diatur Finance atau owner." };
  if (!id.safeParse(idProgram).success) return { ok: false, pesan: "Program tidak dikenal." };
  await prisma.loyalty_programs.update({ where: { id: BigInt(idProgram) }, data: { active: aktif, updated_at: new Date() } });
  segarkan();
  return { ok: true, pesan: aktif ? "Program aktif lagi." : "Program dihentikan — stempel & hadiah tidak dihitung lagi. Riwayat pemakaian tetap ada." };
}

const awalanCatatan = (hadiah: string) => `🎁 Hadiah loyalti: ${hadiah}`;

/**
 * Pakai hadiah (kunci "<idProgram>:<idPesananPenutup>"). Dicek ulang dari riwayat: hanya hadiah yang masih tersedia.
 * `idPesanan` = pesanan tempat hadiah diberikan (milik customer yang sama) — hadiah ditulis di catatan pesanan supaya
 * ikut terbaca dapur & surat jalan.
 */
export async function pakaiHadiah(kunci: string, idPesanan: string | null, catatan: string): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  const m = /^(\d+):(\d+)$/.exec(kunci);
  if (!m || (idPesanan && !id.safeParse(idPesanan).success) || catatan.length > 300) return { ok: false, pesan: "Isian tidak sah." };
  const penutup = await prisma.retail_orders.findUnique({ where: { id: BigInt(m[2]) }, select: { customer_id: true } });
  if (!penutup) return { ok: false, pesan: "Hadiah tidak ditemukan." };
  const kartu = (await kartuPelanggan(hariIniWib(), [penutup.customer_id])).get(penutup.customer_id.toString());
  const h = kartu?.find((k) => k.program.id === m[1])?.kartu.hadiah.find((x) => x.kunci === kunci);
  if (!h || h.status !== "tersedia") return { ok: false, pesan: h?.status === "dipakai" ? "Hadiah ini sudah dipakai." : h?.status === "hangus" ? "Hadiah ini sudah hangus." : "Hadiah tidak tersedia." };
  const hadiah = kartu!.find((k) => k.program.id === m[1])!.program.hadiah;
  if (idPesanan) {
    const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(idPesanan) }, select: { customer_id: true, status: true } });
    if (!o || o.customer_id !== penutup.customer_id || o.status !== "aktif") return { ok: false, pesan: "Pesanan itu bukan milik pembeli ini / sudah batal." };
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.loyalty_redemptions.create({
        data: { program_id: BigInt(m[1]), customer_id: penutup.customer_id, reward_key: kunci, reward: hadiah, retail_order_id: idPesanan ? BigInt(idPesanan) : null, note: catatan.trim() || null, used_by: BigInt(sesi.id) },
      });
      if (idPesanan) {
        const o = await tx.retail_orders.findUniqueOrThrow({ where: { id: BigInt(idPesanan) }, select: { notes: true } });
        await tx.retail_orders.update({ where: { id: BigInt(idPesanan) }, data: { notes: [awalanCatatan(hadiah), o.notes].filter(Boolean).join(" · "), updated_at: new Date() } });
      }
    });
  } catch {
    return { ok: false, pesan: "Hadiah ini baru saja dipakai orang lain. Muat ulang halaman." };
  }
  segarkan();
  return { ok: true, pesan: idPesanan ? "Hadiah dipakai di pesanan ini — tertulis di catatan pesanan untuk dapur & pengantar." : "Hadiah ditandai sudah dipakai." };
}

/** Batalkan pemakaian (salah tekan): hadiah tersedia lagi, catatan hadiah di pesanan dihapus. */
export async function batalPakaiHadiah(kunci: string): Promise<Hasil> {
  await pastikanIzin("ikut-menu-pesta");
  const r = await prisma.loyalty_redemptions.findUnique({ where: { reward_key: kunci }, select: { id: true, reward: true, retail_order_id: true } });
  if (!r) return { ok: false, pesan: "Pemakaian tidak ditemukan." };
  await prisma.$transaction(async (tx) => {
    await tx.loyalty_redemptions.delete({ where: { id: r.id } });
    if (r.retail_order_id) {
      const o = await tx.retail_orders.findUnique({ where: { id: r.retail_order_id }, select: { notes: true } });
      const sisa = (o?.notes ?? "").split(" · ").filter((x) => x !== awalanCatatan(r.reward)).join(" · ");
      await tx.retail_orders.update({ where: { id: r.retail_order_id }, data: { notes: sisa || null, updated_at: new Date() } });
    }
  });
  segarkan();
  return { ok: true, pesan: "Pemakaian dibatalkan — hadiah tersedia lagi." };
}
