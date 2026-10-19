"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { keSatuanStok } from "@/lib/hitung/stok";
import { kebutuhanTanggal } from "@/lib/kebutuhan-event";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* ==========================================================================
   STOK BAHAN (Fase 3.8a, D-087) — mutasi manual, minimum, pemakaian event.
   Semua jumlah dalam satuan stok bahan (satuan pakai / satuan beli).
   ========================================================================== */

const id = z.string().regex(/^\d+$/);
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak sah.");
const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

function segarkan(idBahan?: bigint) {
  revalidatePath("/stok");
  revalidatePath("/kebutuhan-bahan");
  if (idBahan) revalidatePath(`/stok/${idBahan}`);
}

const skemaManual = z.object({
  idBahan: id,
  jenis: z.enum(["waste", "tambah", "kurang"]),
  qty: z.number().positive("Jumlah harus lebih dari 0.").max(10_000_000),
  tanggal,
  catatan: z.string().trim().max(255),
});

/** Waste (rusak/basi/tumpah) atau koreksi tambah/kurang — koreksi wajib alasan. */
export async function catatMutasiManual(isian: z.input<typeof skemaManual>): Promise<void> {
  const sesi = await pastikanIzin("stok");
  const f = skemaManual.parse(isian);
  if (f.catatan.length < 3) throw new Error(f.jenis === "waste" ? "Tulis sebabnya, mis. busuk / tumpah." : "Tulis alasan koreksinya.");
  await prisma.stock_movements.create({
    data: {
      ingredient_id: BigInt(f.idBahan),
      kind: f.jenis === "waste" ? "waste" : "koreksi",
      qty: f.jenis === "tambah" ? f.qty : -f.qty,
      moved_at: tgl(f.tanggal),
      note: f.catatan,
      created_by: BigInt(sesi.id),
    },
  });
  segarkan(BigInt(f.idBahan));
}

/** Stok minimum (satuan stok); kosong = tanpa minimum. Dipakai PR untuk isi ulang. */
export async function aturMinimum(idBahan: string, minimum: number | null): Promise<void> {
  await pastikanIzin("stok");
  const m = z.number().min(0).max(10_000_000).nullable().parse(minimum);
  await prisma.ingredients.update({ where: { id: BigInt(id.parse(idBahan)) }, data: { min_stock: m, updated_at: new Date() } });
  segarkan(BigInt(idBahan));
}

/** Baris nota yang satuannya tidak bisa dikonversi otomatis → gudang mengisi jumlahnya dalam satuan stok. */
export async function masukkanBarisNota(purchaseItemId: string, qty: number): Promise<void> {
  const sesi = await pastikanIzin("stok");
  const n = z.number().positive("Jumlah harus lebih dari 0.").max(10_000_000).parse(qty);
  const b = await prisma.purchase_items.findUnique({
    where: { id: BigInt(id.parse(purchaseItemId)) },
    select: { id: true, ingredient_id: true, purchases: { select: { status: true, purchased_at: true } }, stock_movements: { select: { id: true } } },
  });
  if (!b?.ingredient_id || b.purchases.status !== "posted") throw new Error("Baris nota tidak ditemukan.");
  if (b.stock_movements) throw new Error("Baris ini sudah masuk stok.");
  await prisma.stock_movements.create({
    data: { ingredient_id: b.ingredient_id, kind: "masuk", qty: n, moved_at: b.purchases.purchased_at, purchase_item_id: b.id, created_by: BigInt(sesi.id) },
  });
  segarkan(b.ingredient_id);
}

/**
 * Pemakaian bahan untuk event satu tanggal = Kebutuhan Bahan tanggal itu
 * (hitungan yang sama). Sekali per tanggal (index unik); bahan yang satuan
 * resepnya tidak bisa dikonversi ke satuan stok dilewati dan dilaporkan.
 */
export async function catatPemakaian(tgl0: string): Promise<{ dicatat: number; dilewati: string[] }> {
  const sesi = await pastikanIzin("stok");
  const t = tanggal.parse(tgl0);
  const ada = await prisma.stock_movements.count({ where: { kind: "pakai", usage_date: tgl(t) } });
  if (ada) throw new Error("Pemakaian tanggal ini sudah dicatat. Batalkan dulu bila ingin mencatat ulang.");
  const k = await kebutuhanTanggal(t);
  if (!k.bahan.length) throw new Error("Tidak ada bahan yang terhitung di tanggal ini.");
  const bahan = new Map(
    (
      await prisma.ingredients.findMany({
        where: { id: { in: k.bahan.map((b) => BigInt(b.idBahan)) } },
        select: { id: true, purchase_unit: true, usage_unit: true, usage_qty_per_pack: true },
      })
    ).map((b) => [b.id.toString(), b]),
  );
  const dilewati: string[] = [];
  const data = k.bahan.flatMap((b) => {
    const m = bahan.get(b.idBahan);
    const qty = m ? keSatuanStok(b.qty, b.satuan, m) : null;
    if (!qty) {
      dilewati.push(b.nama);
      return [];
    }
    return qty.isZero() ? [] : [{ ingredient_id: BigInt(b.idBahan), kind: "pakai", qty: qty.negated().toDecimalPlaces(3), moved_at: tgl(t), usage_date: tgl(t), created_by: BigInt(sesi.id) }];
  });
  await prisma.stock_movements.createMany({ data });
  segarkan();
  return { dicatat: data.length, dilewati };
}

export async function batalkanPemakaian(tgl0: string): Promise<void> {
  await pastikanIzin("stok");
  await prisma.stock_movements.deleteMany({ where: { kind: "pakai", usage_date: tgl(tanggal.parse(tgl0)) } });
  segarkan();
}
