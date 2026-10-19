"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { penggunaAktif } from "@/lib/auth";
import { pastikanFotoBelanja, tautanUnggahBukti } from "@/lib/bukti-berkas";
import { cekSaldoCukup, nilaiBarisNota, saldoUangMuka, totalNota } from "@/lib/hitung/uang-muka";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka, type KunciMenu } from "@/lib/navigasi";
import { nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

/* ==========================================================================
   UANG MUKA BELANJA / Daily Market (Fase 3.7b, D-081)

   Setiap uang keluar (belanja, pengembalian) dicek terhadap saldo pemegang
   DI DALAM transaksi yang sama dengan pencatatannya, dikunci per pemegang —
   dua nota yang disimpan bersamaan tidak bisa sama-sama lolos lalu membuat
   saldo minus.
   ========================================================================== */

const id = z.string().regex(/^\d+$/);

function segarkan(prId?: bigint | null) {
  revalidatePath("/uang-muka");
  revalidatePath("/belanja");
  if (prId) revalidatePath(`/belanja/${prId}`);
}

/** Kunci per pemegang + saldo terkini, di dalam transaksi. */
async function saldoTerkunci(tx: Prisma.TransactionClient, pemegang: bigint) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(81, ${Number(pemegang)}::int)::text`;
  const mutasi = await tx.cash_advances.findMany({ where: { holder_user_id: pemegang, status: "posted" }, select: { kind: true, amount: true, status: true } });
  return saldoUangMuka(mutasi);
}

async function prDisetujui(prId: string | null | undefined) {
  if (!prId) return null;
  const pr = await prisma.purchase_requests.findUnique({ where: { id: BigInt(id.parse(prId)) }, select: { id: true, status: true } });
  if (!pr) throw new Error("PR tidak ditemukan.");
  if (pr.status !== "disetujui") throw new Error("PR harus berstatus Disetujui.");
  return pr.id;
}

/** Tautan unggah foto nota / bukti transfer ke bucket tertutup "bukti". */
export async function mintaUnggahNota(): Promise<{ url: string; jalur: string }> {
  // Dipakai nota pasar, surat jalan PO, dan bukti bayar hutang (D-083).
  const sesi = await penggunaAktif();
  const izin = await bacaIzin();
  if (!sesi || !["uang-muka", "po", "hutang-supplier"].some((k) => bolehBuka(sesi.peran, k as KunciMenu, izin))) {
    throw new Error("Anda tidak punya akses untuk tindakan ini.");
  }
  const jalur = `belanja/${sesi.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  return { url: await tautanUnggahBukti(jalur), jalur };
}

const skemaDana = z.object({
  pemegang: id,
  jumlah: z.number().int("Nominal tanpa sen.").positive("Nominal harus lebih dari 0.").max(1_000_000_000),
  prId: id.nullable(),
  catatan: z.string().trim().max(255),
  bukti: z.string().nullable(),
});

/** Finance mencatat dana yang ditransfer ke pemegang (bawaan dari PR disetujui). */
export async function catatTopup(isian: z.input<typeof skemaDana>): Promise<void> {
  const sesi = await pastikanIzin("uang-muka");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang mencatat dana masuk.");
  const f = skemaDana.parse(isian);
  const prId = await prDisetujui(f.prId);
  if (f.bukti) await pastikanFotoBelanja([f.bukti]);
  await prisma.cash_advances.create({
    data: {
      holder_user_id: BigInt(f.pemegang),
      kind: "topup",
      amount: f.jumlah,
      pr_id: prId,
      note: f.catatan || null,
      proof_path: f.bukti,
      created_by: BigInt(sesi.id),
    },
  });
  segarkan(prId);
}

/** Finance mencatat sisa uang yang dikembalikan pemegang. Tidak boleh melebihi saldo. */
export async function catatPengembalian(isian: z.input<typeof skemaDana>): Promise<void> {
  const sesi = await pastikanIzin("uang-muka");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang mencatat pengembalian.");
  const f = skemaDana.parse(isian);
  const prId = f.prId ? BigInt(f.prId) : null;
  await prisma.$transaction(async (tx) => {
    const tolak = cekSaldoCukup(await saldoTerkunci(tx, BigInt(f.pemegang)), f.jumlah);
    if (tolak) throw new Error(tolak.replace("Minta Finance menambah dana dulu.", "Periksa nominalnya."));
    await tx.cash_advances.create({
      data: { holder_user_id: BigInt(f.pemegang), kind: "pengembalian", amount: f.jumlah, pr_id: prId, note: f.catatan || null, created_by: BigInt(sesi.id) },
    });
  });
  segarkan(prId);
}

const skemaBelanja = z.object({
  pemegang: id.nullable(),
  prId: id.nullable(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belanja wajib diisi."),
  toko: z.string().trim().max(255),
  nota: z.array(z.string()).max(10, "Maksimal 10 foto."),
  tanpaNota: z.string().trim().max(255),
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
export type IsianBelanja = z.input<typeof skemaBelanja>;

/**
 * Nota belanja pasar/toko. Pemegang = diri sendiri; Finance/owner boleh
 * mencatat atas nama pemegang lain. Wajib foto nota, atau alasan tanpa nota.
 */
export async function simpanBelanja(isian: IsianBelanja): Promise<void> {
  const sesi = await pastikanIzin("uang-muka");
  const f = skemaBelanja.parse(isian);
  const pemegang = f.pemegang && f.pemegang !== sesi.id ? f.pemegang : sesi.id;
  if (pemegang !== sesi.id && !bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance yang boleh mencatat belanja atas nama orang lain.");
  if (!f.nota.length && f.tanpaNota.length < 5) throw new Error("Foto notanya, atau tulis alasan tidak ada nota (mis. pedagang pasar tidak memberi nota).");
  await pastikanFotoBelanja(f.nota);
  const prId = await prDisetujui(f.prId);
  if (prId) {
    const sah = new Set((await prisma.purchase_request_items.findMany({ where: { pr_id: prId }, select: { id: true } })).map((b) => b.id.toString()));
    if (f.baris.some((b) => b.prItemId && !sah.has(b.prItemId))) throw new Error("Ada barang yang bukan dari PR ini. Muat ulang halaman.");
  }
  const total = totalNota(f.baris.map((b) => ({ qty: b.qty, harga: b.harga })));

  const hasil = await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("purchases", "purchase_number", "BLJ"),
    (nomor) =>
      prisma.$transaction(async (tx) => {
        const tolak = cekSaldoCukup(await saldoTerkunci(tx, BigInt(pemegang)), total);
        if (tolak) throw new Error(tolak);
        const beli = await tx.purchases.create({
          data: {
            purchase_number: nomor,
            holder_user_id: BigInt(pemegang),
            pr_id: prId,
            purchased_at: new Date(`${f.tanggal}T00:00:00Z`),
            shop_name: f.toko || null,
            total,
            receipt_paths: f.nota,
            no_receipt_reason: f.nota.length ? null : f.tanpaNota,
            notes: f.catatan || null,
            created_by: BigInt(sesi.id),
            purchase_items: {
              create: f.baris.map((b, i) => ({
                ingredient_id: b.idBahan ? BigInt(b.idBahan) : null,
                pr_item_id: b.prItemId ? BigInt(b.prItemId) : null,
                item_name: b.nama,
                qty: b.qty,
                unit: b.satuan || null,
                unit_price: b.harga,
                total: nilaiBarisNota(b.qty, b.harga),
                sort: i,
              })),
            },
          },
          select: { id: true },
        });
        await tx.cash_advances.create({
          data: { holder_user_id: BigInt(pemegang), kind: "belanja", amount: total, pr_id: prId, purchase_id: beli.id, created_by: BigInt(sesi.id) },
        });
        return beli;
      }),
  );
  segarkan(prId);
  redirect(`/uang-muka/belanja/${hasil.id}`);
}

/** Finance membatalkan nota yang salah catat — saldo pemegang kembali. Wajib alasan. */
export async function batalkanBelanja(idBelanja: string, alasan: string): Promise<void> {
  const sesi = await pastikanIzin("uang-muka");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang membatalkan nota.");
  const baca = bacaAlasanPembatalan(alasan);
  if (!baca.ok) throw new Error(baca.pesan);
  const beli = await prisma.purchases.findUnique({ where: { id: BigInt(id.parse(idBelanja)) }, select: { id: true, pr_id: true } });
  if (!beli) throw new Error("Nota tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.purchases.updateMany({
      where: { id: beli.id, status: "posted" },
      data: { status: "batal", cancel_reason: baca.alasan, cancelled_by: BigInt(sesi.id), cancelled_at: new Date() },
    });
    if (!count) throw new Error("Nota sudah dibatalkan.");
    await tx.cash_advances.updateMany({ where: { purchase_id: beli.id }, data: { status: "batal" } });
  });
  segarkan(beli.pr_id);
  revalidatePath(`/uang-muka/belanja/${beli.id}`);
}

/** PR selesai dibelanjakan (penyusun atau Finance). */
export async function selesaikanPr(prId: string): Promise<void> {
  const sesi = await pastikanIzin("belanja");
  const pr = await prisma.purchase_requests.findUnique({ where: { id: BigInt(id.parse(prId)) }, select: { id: true, created_by: true } });
  if (!pr) throw new Error("PR tidak ditemukan.");
  if (!bolehKelolaUang(sesi.peran) && pr.created_by?.toString() !== sesi.id) throw new Error("Hanya penyusun PR atau Finance yang menandai selesai.");
  const ada = await prisma.purchases.count({ where: { pr_id: pr.id, status: "posted" } });
  if (!ada) throw new Error("Belum ada nota belanja untuk PR ini.");
  const { count } = await prisma.purchase_requests.updateMany({ where: { id: pr.id, status: "disetujui" }, data: { status: "selesai", updated_at: new Date() } });
  if (!count) throw new Error("Status PR sudah berubah. Muat ulang halaman.");
  segarkan(pr.id);
}
