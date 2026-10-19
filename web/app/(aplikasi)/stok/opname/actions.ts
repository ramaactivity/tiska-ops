"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { periodeOpname, selisihOpname } from "@/lib/hitung/opname";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { saldoStok } from "@/lib/stok";

/* ==========================================================================
   STOCK OPNAME BULANAN (Fase 3.8b, D-088)

   berjalan (Tya menghitung dari HP) → diajukan → final (Finance): selisih
   = hitung fisik − saldo sistem SAAT dihitung, dibukukan sebagai mutasi
   "opname" — pemakaian sesudah jam hitung tetap benar.
   ========================================================================== */

const id = z.string().regex(/^\d+$/);
const hariIniWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

function segarkan(idOpname?: bigint) {
  revalidatePath("/stok");
  revalidatePath("/stok/opname");
  revalidatePath("/dasbor");
  if (idOpname) revalidatePath(`/stok/opname/${idOpname}`);
}

async function opnameIni(idOpname: string, status?: string) {
  const sesi = await pastikanIzin("stok");
  const o = await prisma.stock_counts.findUnique({ where: { id: BigInt(id.parse(idOpname)) }, select: { id: true, status: true } });
  if (!o) throw new Error("Opname tidak ditemukan.");
  if (status && o.status !== status) throw new Error("Status opname sudah berubah. Muat ulang halaman.");
  return { sesi, o };
}

/** Mulai opname bulan ini: daftar hitung = bahan yang punya stok/mutasi atau minimum. */
export async function mulaiOpname(): Promise<void> {
  const sesi = await pastikanIzin("stok");
  const periode = new Date(`${periodeOpname(hariIniWib())}T00:00:00Z`);
  const ada = await prisma.stock_counts.findUnique({ where: { period: periode }, select: { id: true } });
  if (ada) redirect(`/stok/opname/${ada.id}`);
  const terbuka = await prisma.stock_counts.findFirst({ where: { status: { not: "final" } }, select: { id: true } });
  if (terbuka) throw new Error("Masih ada opname bulan lalu yang belum final. Selesaikan dulu.");
  const bahan = await prisma.ingredients.findMany({
    where: { OR: [{ stock_movements: { some: {} } }, { min_stock: { not: null } }] },
    select: { id: true },
  });
  const o = await prisma.stock_counts.create({
    data: { period: periode, started_by: BigInt(sesi.id), stock_count_lines: { create: bahan.map((b) => ({ ingredient_id: b.id })) } },
    select: { id: true },
  });
  segarkan();
  redirect(`/stok/opname/${o.id}`);
}

export async function tambahBarisOpname(idOpname: string, idBahan: string): Promise<void> {
  const { o } = await opnameIni(idOpname, "berjalan");
  await prisma.stock_count_lines.upsert({
    where: { count_id_ingredient_id: { count_id: o.id, ingredient_id: BigInt(id.parse(idBahan)) } },
    create: { count_id: o.id, ingredient_id: BigInt(idBahan) },
    update: {},
  });
  segarkan(o.id);
}

/**
 * Simpan hasil hitung satu bahan (tersimpan langsung dari HP). Saldo sistem
 * difoto saat itu juga — itulah pembanding selisihnya.
 */
export async function isiHitung(idBaris: string, hitung: number | null, alasan: string): Promise<{ sistem: string }> {
  const sesi = await pastikanIzin("stok");
  const n = z.number().min(0, "Jumlah tidak boleh minus.").max(10_000_000).nullable().parse(hitung);
  const b = await prisma.stock_count_lines.findUnique({
    where: { id: BigInt(id.parse(idBaris)) },
    select: { id: true, ingredient_id: true, stock_counts: { select: { id: true, status: true } } },
  });
  if (!b) throw new Error("Baris opname tidak ditemukan.");
  if (b.stock_counts.status !== "berjalan") throw new Error("Opname sudah diajukan — hasil hitung tidak bisa diubah.");
  const sistem = (await saldoStok([b.ingredient_id])).get(b.ingredient_id.toString())?.toString() ?? "0";
  await prisma.stock_count_lines.update({
    where: { id: b.id },
    data:
      n === null
        ? { counted_qty: null, system_qty: null, reason: null, counted_by: null, counted_at: null }
        : { counted_qty: n, system_qty: sistem, reason: alasan.trim().slice(0, 255) || null, counted_by: BigInt(sesi.id), counted_at: new Date() },
  });
  revalidatePath(`/stok/opname/${b.stock_counts.id}`);
  return { sistem };
}

async function pastikanAlasanLengkap(countId: bigint) {
  const baris = await prisma.stock_count_lines.findMany({
    where: { count_id: countId, counted_qty: { not: null } },
    select: { system_qty: true, counted_qty: true, reason: true, ingredients: { select: { name: true } } },
  });
  if (!baris.length) throw new Error("Belum ada bahan yang dihitung.");
  const kurang = baris.filter((b) => selisihOpname(b.system_qty ?? 0, b.counted_qty!).wajibAlasan && !b.reason);
  if (kurang.length) throw new Error(`Selisih lebih dari 5% wajib alasan: ${kurang.map((b) => b.ingredients.name).slice(0, 5).join(", ")}${kurang.length > 5 ? "…" : ""}`);
}

export async function ajukanOpname(idOpname: string): Promise<void> {
  const { sesi, o } = await opnameIni(idOpname, "berjalan");
  await pastikanAlasanLengkap(o.id);
  await prisma.stock_counts.update({ where: { id: o.id }, data: { status: "diajukan", submitted_by: BigInt(sesi.id), submitted_at: new Date() } });
  segarkan(o.id);
}

export async function kembalikanOpname(idOpname: string, catatan: string): Promise<void> {
  const { sesi, o } = await opnameIni(idOpname, "diajukan");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang memeriksa opname.");
  if (!catatan.trim()) throw new Error("Tulis apa yang perlu dihitung ulang.");
  await prisma.stock_counts.update({ where: { id: o.id }, data: { status: "berjalan", finance_note: catatan.trim().slice(0, 2000) } });
  segarkan(o.id);
}

/** Finance memfinalkan: setiap selisih dibukukan sebagai mutasi "opname" bertanggal jam hitungnya. */
export async function finalkanOpname(idOpname: string): Promise<void> {
  const { sesi, o } = await opnameIni(idOpname, "diajukan");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang memfinalkan opname.");
  await pastikanAlasanLengkap(o.id);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.stock_counts.updateMany({
      where: { id: o.id, status: "diajukan" },
      data: { status: "final", finalized_by: BigInt(sesi.id), finalized_at: new Date() },
    });
    if (!count) throw new Error("Status opname sudah berubah. Muat ulang halaman.");
    const baris = await tx.stock_count_lines.findMany({ where: { count_id: o.id, counted_qty: { not: null } } });
    const data = baris.flatMap((b) => {
      const { selisih } = selisihOpname(b.system_qty ?? 0, b.counted_qty!);
      const jam = b.counted_at ?? new Date();
      return selisih.isZero()
        ? []
        : [
            {
              ingredient_id: b.ingredient_id,
              kind: "opname",
              qty: selisih,
              moved_at: new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(jam)}T00:00:00Z`),
              stock_count_line_id: b.id,
              note: b.reason,
              created_by: BigInt(sesi.id),
            },
          ];
    });
    if (data.length) await tx.stock_movements.createMany({ data });
  });
  segarkan(o.id);
}

/** Opname yang belum diajukan boleh dibuang (tidak ada yang dibukukan). */
export async function hapusOpname(idOpname: string): Promise<void> {
  const { o } = await opnameIni(idOpname, "berjalan");
  await prisma.stock_counts.delete({ where: { id: o.id } });
  segarkan();
  redirect("/stok/opname");
}
