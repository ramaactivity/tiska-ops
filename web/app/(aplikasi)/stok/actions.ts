"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sinkronStokKeluar } from "@/lib/biaya-stok";
import { hargaBahanSistem } from "@/lib/harga-bahan";
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

const skemaKeluar = z.object({
  idBahan: id,
  qty: z.number().positive("Jumlah harus lebih dari 0.").max(10_000_000),
  tanggal,
  idEvent: id.nullable(),
  catatan: z.string().trim().max(255),
});

/**
 * Barang keluar gudang (D-148) — di luar resep (minyak tambahan, gas, kemasan…),
 * bahan resep sudah lewat "Pemakaian event". Harga per satuan stok dibekukan saat
 * dikeluarkan (harga beli terakhir); bila untuk event → biaya aktual di Margin-nya.
 * Harga tidak pernah dikirim balik ke layar gudang.
 */
export async function catatKeluar(isian: z.input<typeof skemaKeluar>): Promise<void> {
  const sesi = await pastikanIzin("stok");
  const f = skemaKeluar.parse(isian);
  if (!f.idEvent && f.catatan.length < 3) throw new Error("Pilih event-nya, atau tulis keperluannya (mis. dipakai kantor).");
  const b = await prisma.ingredients.findUnique({ where: { id: BigInt(f.idBahan) }, select: { id: true, usage_unit: true } });
  if (!b) throw new Error("Bahan tidak ditemukan.");
  if (f.idEvent) {
    const e = await prisma.events.findUnique({ where: { id: BigInt(f.idEvent) }, select: { status: true } });
    if (!e || e.status === "batal") throw new Error("Event tidak ditemukan atau sudah dibatalkan.");
  }
  const h = (await hargaBahanSistem([b.id])).get(b.id);
  // Satuan stok = satuan pakai bila ada (harga per satuan pakai), selain itu satuan beli (harga per kemasan).
  const hargaSatuan = !h ? null : b.usage_unit ? h.perSatuan : (h.perKemasan ?? h.perSatuan);
  await prisma.$transaction(async (tx) => {
    await tx.stock_movements.create({
      data: {
        ingredient_id: b.id,
        kind: "keluar",
        qty: -f.qty,
        moved_at: tgl(f.tanggal),
        event_id: f.idEvent ? BigInt(f.idEvent) : null,
        unit_cost: hargaSatuan,
        note: f.catatan || null,
        created_by: BigInt(sesi.id),
      },
    });
    if (f.idEvent) await sinkronStokKeluar(tx, BigInt(f.idEvent), BigInt(sesi.id));
  });
  segarkan(b.id);
  revalidatePath("/laporan/margin");
}

/** Salah catat barang keluar → hapus (stok kembali, biaya Margin event ikut dihitung ulang). */
export async function hapusKeluar(idMutasi: string): Promise<void> {
  const sesi = await pastikanIzin("stok");
  const m = await prisma.stock_movements.findUnique({ where: { id: BigInt(id.parse(idMutasi)) }, select: { id: true, kind: true, ingredient_id: true, event_id: true } });
  if (!m || m.kind !== "keluar") throw new Error("Catatan barang keluar tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    await tx.stock_movements.delete({ where: { id: m.id } });
    if (m.event_id) await sinkronStokKeluar(tx, m.event_id, BigInt(sesi.id));
  });
  segarkan(m.ingredient_id);
  revalidatePath("/laporan/margin");
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
