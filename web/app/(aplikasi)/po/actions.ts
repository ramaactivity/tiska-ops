"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { pastikanFotoBelanja } from "@/lib/bukti-berkas";
import { jatuhTempo, sisaTerima, statusPoSesudahTerima } from "@/lib/hitung/po";
import { nilaiBarisNota, totalNota } from "@/lib/hitung/uang-muka";
import { nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { d } from "@/lib/uang";

/* ==========================================================================
   PO SUPPLIER TEMPO, PENERIMAAN BARANG, HUTANG DAGANG (Fase 3.7c, D-083)

   PO dipesan → barang diterima (boleh sebagian, berkali-kali) → tiap
   penerimaan menjadi satu "purchases" (payment_method tempo) + satu hutang
   dengan jatuh tempo = tanggal terima + TOP supplier → Finance membayar.
   ========================================================================== */

const id = z.string().regex(/^\d+$/);
// Isian kosong & isian yang tidak dikirim (undefined) sama-sama berarti null.
const kosong = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi.");
const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

function segarkan(poId?: bigint, prId?: bigint | null) {
  revalidatePath("/po");
  revalidatePath("/hutang-supplier");
  if (poId) revalidatePath(`/po/${poId}`);
  if (prId) revalidatePath(`/belanja/${prId}`);
}

/* ---------- Supplier ---------- */

export type KeadaanSupplier = { pesan?: string; sukses?: boolean };
const skemaSupplier = z.object({
  id: z.preprocess(kosong, id.nullable()),
  name: z.string().trim().min(2, "Nama supplier minimal 2 huruf.").max(255),
  category: z.preprocess(kosong, z.string().trim().max(100).nullable()),
  contact_name: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  phone: z.preprocess(kosong, z.string().trim().max(50).nullable()),
  payment_term_days: z.coerce.number().int("Tempo dalam hari bulat.").min(0).max(365),
  bank_account: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  notes: z.preprocess(kosong, z.string().trim().max(2000).nullable()),
  active: z.boolean(),
});

export async function simpanSupplier(_s: KeadaanSupplier, data: FormData): Promise<KeadaanSupplier> {
  await pastikanIzin("supplier");
  const hasil = skemaSupplier.safeParse({ ...Object.fromEntries(data), active: data.get("active") !== "off" });
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id: ada, ...isi } = hasil.data;
  if (ada) await prisma.suppliers.update({ where: { id: BigInt(ada) }, data: { ...isi, updated_at: new Date() } });
  else await prisma.suppliers.create({ data: isi });
  revalidatePath("/supplier");
  return { sukses: true, pesan: `${isi.name} tersimpan.` };
}

/* ---------- PO ---------- */

const skemaPo = z.object({
  supplierId: id,
  prId: id.nullable(),
  tanggal,
  tanggalKirim: tanggal.nullable(),
  catatan: z.string().trim().max(2000),
  baris: z
    .array(
      z.object({
        idBahan: id.nullable(),
        prItemId: id.nullable(),
        nama: z.string().trim().min(1, "Nama barang wajib diisi.").max(255),
        qty: z.number().positive("Jumlah harus lebih dari 0.").max(1_000_000),
        satuan: z.string().trim().max(30),
        harga: z.number().min(0, "Harga tidak boleh minus.").max(1_000_000_000),
      }),
    )
    .min(1, "Isi minimal satu barang.")
    .max(200),
});
export type IsianPo = z.input<typeof skemaPo>;

export async function buatPo(isian: IsianPo): Promise<void> {
  const sesi = await pastikanIzin("po");
  const f = skemaPo.parse(isian);
  const sup = await prisma.suppliers.findUnique({ where: { id: BigInt(f.supplierId) }, select: { active: true } });
  if (!sup?.active) throw new Error("Supplier tidak ditemukan atau nonaktif.");
  if (f.prId) {
    const pr = await prisma.purchase_requests.findUnique({ where: { id: BigInt(f.prId) }, select: { status: true, purchase_request_items: { select: { id: true } } } });
    if (pr?.status !== "disetujui") throw new Error("PR harus berstatus Disetujui.");
    const sah = new Set(pr.purchase_request_items.map((b) => b.id.toString()));
    if (f.baris.some((b) => b.prItemId && !sah.has(b.prItemId))) throw new Error("Ada barang yang bukan dari PR ini. Muat ulang halaman.");
  }
  const po = await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("purchase_orders", "po_number", "PO"),
    (nomor) =>
      prisma.purchase_orders.create({
        data: {
          po_number: nomor,
          supplier_id: BigInt(f.supplierId),
          pr_id: f.prId ? BigInt(f.prId) : null,
          order_date: tgl(f.tanggal),
          expected_date: f.tanggalKirim ? tgl(f.tanggalKirim) : null,
          total: totalNota(f.baris.map((b) => ({ qty: b.qty, harga: b.harga }))),
          notes: f.catatan || null,
          created_by: BigInt(sesi.id),
          purchase_order_items: {
            create: f.baris.map((b, i) => ({
              ingredient_id: b.idBahan ? BigInt(b.idBahan) : null,
              pr_item_id: b.prItemId ? BigInt(b.prItemId) : null,
              item_name: b.nama,
              qty: b.qty,
              unit: b.satuan || null,
              unit_price: b.harga,
              sort: i,
            })),
          },
        },
        select: { id: true },
      }),
  );
  segarkan();
  redirect(`/po/${po.id}`);
}

async function poIni(idPo: string) {
  const sesi = await pastikanIzin("po");
  const po = await prisma.purchase_orders.findUnique({ where: { id: BigInt(id.parse(idPo)) }, select: { id: true, status: true, pr_id: true } });
  if (!po) throw new Error("PO tidak ditemukan.");
  return { sesi, po };
}

/** Draft → Dipesan (admin sudah mengirim pesannya ke supplier). */
export async function tandaiDipesan(idPo: string): Promise<void> {
  const { po } = await poIni(idPo);
  const { count } = await prisma.purchase_orders.updateMany({ where: { id: po.id, status: "draft" }, data: { status: "dikirim", updated_at: new Date() } });
  if (!count) throw new Error("Status PO sudah berubah. Muat ulang halaman.");
  segarkan(po.id, po.pr_id);
}

/** Batal hanya sebelum ada barang diterima (penerimaan sudah menjadi hutang). */
export async function batalkanPo(idPo: string, alasan: string): Promise<void> {
  const { po } = await poIni(idPo);
  const baca = bacaAlasanPembatalan(alasan);
  if (!baca.ok) throw new Error(baca.pesan);
  const { count } = await prisma.purchase_orders.updateMany({
    where: { id: po.id, status: { in: ["draft", "dikirim"] } },
    data: { status: "batal", cancel_reason: baca.alasan, updated_at: new Date() },
  });
  if (!count) throw new Error("PO yang sudah ada barang diterima tidak bisa dibatalkan.");
  segarkan(po.id, po.pr_id);
}

const skemaTerima = z.object({
  tanggal,
  nota: z.array(z.string()).max(10),
  tanpaNota: z.string().trim().max(255),
  baris: z.array(z.object({ poItemId: id, qty: z.number().min(0).max(1_000_000), harga: z.number().min(0).max(1_000_000_000) })).max(200),
});
export type IsianTerima = z.input<typeof skemaTerima>;

/**
 * Penerimaan barang (sebagian boleh). Satu penerimaan = satu purchases tempo +
 * satu hutang. Harga boleh dikoreksi sesuai nota supplier. Jumlah tidak boleh
 * melebihi sisa pesanan — PO dikunci selama penerimaan dicatat.
 */
export async function terimaBarang(idPo: string, isian: IsianTerima): Promise<void> {
  const { sesi, po } = await poIni(idPo);
  const f = skemaTerima.parse(isian);
  const baris = f.baris.filter((b) => b.qty > 0);
  if (!baris.length) throw new Error("Isi jumlah barang yang diterima.");
  if (!f.nota.length && f.tanpaNota.length < 5) throw new Error("Foto surat jalan / nota supplier, atau tulis alasan tidak ada.");
  await pastikanFotoBelanja(f.nota);

  const hasil = await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("purchases", "purchase_number", "BLJ"),
    (nomor) =>
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id::text FROM purchase_orders WHERE id = ${po.id} FOR UPDATE`;
        const p = await tx.purchase_orders.findUniqueOrThrow({
          where: { id: po.id },
          include: { purchase_order_items: true, suppliers: { select: { id: true, payment_term_days: true } } },
        });
        if (p.status !== "dikirim" && p.status !== "sebagian") throw new Error("Barang hanya bisa diterima untuk PO yang sudah dipesan.");
        const perId = new Map(p.purchase_order_items.map((b) => [b.id.toString(), b]));
        for (const b of baris) {
          const item = perId.get(b.poItemId);
          if (!item) throw new Error("Ada barang yang bukan dari PO ini. Muat ulang halaman.");
          if (d(b.qty).gt(sisaTerima(item.qty, item.received_qty))) {
            throw new Error(`${item.item_name}: diterima melebihi sisa pesanan (${sisaTerima(item.qty, item.received_qty).toString()} ${item.unit ?? ""}).`);
          }
        }
        const total = totalNota(baris.map((b) => ({ qty: b.qty, harga: b.harga })));
        const beli = await tx.purchases.create({
          data: {
            purchase_number: nomor,
            payment_method: "tempo",
            supplier_id: p.suppliers.id,
            po_id: p.id,
            holder_user_id: BigInt(sesi.id),
            pr_id: p.pr_id,
            purchased_at: tgl(f.tanggal),
            total,
            receipt_paths: f.nota,
            no_receipt_reason: f.nota.length ? null : f.tanpaNota,
            created_by: BigInt(sesi.id),
            purchase_items: {
              create: baris.map((b, i) => {
                const item = perId.get(b.poItemId)!;
                return {
                  ingredient_id: item.ingredient_id,
                  pr_item_id: item.pr_item_id,
                  po_item_id: item.id,
                  item_name: item.item_name,
                  qty: b.qty,
                  unit: item.unit,
                  unit_price: b.harga,
                  total: nilaiBarisNota(b.qty, b.harga),
                  sort: i,
                };
              }),
            },
          },
          select: { id: true },
        });
        for (const b of baris) {
          await tx.purchase_order_items.update({ where: { id: BigInt(b.poItemId) }, data: { received_qty: { increment: b.qty } } });
        }
        const sesudah = p.purchase_order_items.map((item) => ({
          qty: item.qty,
          diterima: d(item.received_qty).plus(baris.find((b) => b.poItemId === item.id.toString())?.qty ?? 0),
        }));
        await tx.purchase_orders.update({ where: { id: p.id }, data: { status: statusPoSesudahTerima(sesudah), updated_at: new Date() } });
        await tx.supplier_payables.create({
          data: { purchase_id: beli.id, supplier_id: p.suppliers.id, amount: total, due_date: tgl(jatuhTempo(f.tanggal, p.suppliers.payment_term_days)) },
        });
        return beli;
      }),
  );
  segarkan(po.id, po.pr_id);
  redirect(`/uang-muka/belanja/${hasil.id}`);
}

/* ---------- Hutang dagang ---------- */

/** Finance menandai hutang lunas (dibayar penuh) + bukti transfer opsional. */
export async function bayarHutang(idHutang: string, isian: { tanggal: string; bukti: string | null; catatan: string }): Promise<void> {
  const sesi = await pastikanIzin("hutang-supplier");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang mencatat pembayaran hutang.");
  const f = z.object({ tanggal, bukti: z.string().nullable(), catatan: z.string().trim().max(255) }).parse(isian);
  if (f.bukti) await pastikanFotoBelanja([f.bukti]);
  const { count } = await prisma.supplier_payables.updateMany({
    where: { id: BigInt(id.parse(idHutang)), status: "belum" },
    data: { status: "lunas", paid_at: tgl(f.tanggal), paid_by: BigInt(sesi.id), proof_path: f.bukti, note: f.catatan || null },
  });
  if (!count) throw new Error("Hutang sudah lunas. Muat ulang halaman.");
  revalidatePath("/hutang-supplier");
}
