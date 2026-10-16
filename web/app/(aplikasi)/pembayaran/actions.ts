"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { tautanUnggahBukti } from "@/lib/bukti-berkas";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

import { hitungUlangTagihan } from "@/lib/alokasi-pembayaran";

/**
 * Menghapus pembayaran, lalu mengembalikan status tagihan yang terpengaruh.
 *
 * Seluruhnya satu transaksi. Di Laravel, penghapusan dan penghitungan ulang
 * dilakukan berurutan tanpa pengaman: putus di tengah menyisakan tagihan yang
 * mengaku lunas padahal uangnya sudah dihapus.
 */
export async function hapusPembayaran(id: string): Promise<void> {
  await pastikanIzin("pembayaran");

  await prisma.$transaction(async (tx) => {
    const pembayaran = await tx.payments.findUnique({
      where: { id: BigInt(id) },
      select: { payment_details: { select: { invoice_id: true } } },
    });
    if (!pembayaran) return;

    const tagihanTerdampak = [
      ...new Set(pembayaran.payment_details.map((d) => d.invoice_id.toString())),
    ];

    await tx.payment_details.deleteMany({ where: { payment_id: BigInt(id) } });
    await tx.payments.delete({ where: { id: BigInt(id) } });

    for (const idTagihan of tagihanTerdampak) {
      await hitungUlangTagihan(tx, BigInt(idTagihan));
    }
  });

  revalidatePath("/pembayaran");
  revalidatePath("/tagihan");
}

/**
 * Tagihan yang masih punya sisa, untuk satu pelanggan.
 *
 * `idPembayaran` diisi saat MENGUBAH pembayaran. Tanpa itu, invoice yang
 * sudah LUNAS OLEH PEMBAYARAN INI SENDIRI tidak akan muncul di daftar —
 * statusnya "paid" — sehingga membuka formulir ubah lalu menyimpannya akan
 * diam-diam melepas alokasinya. Uangnya tetap tercatat, tetapi tidak lagi
 * menempel pada invoice mana pun.
 *
 * Alokasi pembayaran itu sendiri juga DIKEMBALIKAN ke sisanya, supaya angka
 * yang sudah terisi di formulir tidak terbaca melebihi sisa.
 */
export async function tagihanBelumLunas(idPelanggan: string, idPembayaran?: string) {
  await pastikanIzin("pembayaran");

  const alokasiSendiri = new Map<string, Prisma.Decimal>();

  if (idPembayaran) {
    const rinci = await prisma.payment_details.findMany({
      where: { payment_id: BigInt(idPembayaran) },
      select: { invoice_id: true, amount_applied: true },
    });
    for (const r of rinci) {
      const kunci = r.invoice_id.toString();
      alokasiSendiri.set(
        kunci,
        (alokasiSendiri.get(kunci) ?? new Prisma.Decimal(0)).plus(r.amount_applied),
      );
    }
  }

  const daftar = await prisma.invoices.findMany({
    where: {
      customer_id: BigInt(idPelanggan),
      OR: [
        { status: { in: ["unpaid", "partial", "overdue"] } },
        ...(alokasiSendiri.size > 0
          ? [{ id: { in: [...alokasiSendiri.keys()].map((x) => BigInt(x)) } }]
          : []),
      ],
    },
    orderBy: { due_date: "asc" },
    select: {
      id: true,
      invoice_number: true,
      due_date: true,
      grand_total: true,
      paid_amount: true,
      status: true,
      // Dasar PPh 23: harga makanan dan service charge. PB1 tidak ikut —
      // ia pajak daerah atas penjualannya, bukan imbalan jasa.
      subtotal: true,
      service_charge_amount: true,
    },
  });

  return daftar
    .filter((t) => t.status !== "cancelled")
    .map((t) => {
      const sendiri = alokasiSendiri.get(t.id.toString()) ?? new Prisma.Decimal(0);
      const dibayarLain = t.paid_amount.minus(sendiri);

      return {
        id: t.id.toString(),
        nomor: t.invoice_number,
        jatuhTempo: t.due_date.toISOString().slice(0, 10),
        total: t.grand_total.toString(),
        dibayar: dibayarLain.toString(),
        sisa: t.grand_total.minus(dibayarLain).toString(),
        status: t.status,
        dasarPph: t.subtotal.plus(t.service_charge_amount).toString(),
      };
    });
}

const JENIS_BUKTI: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" };

/**
 * Tautan unggah sekali pakai untuk bukti transfer (D-071) — browser mengirim
 * berkas langsung ke bucket tertutup "bukti"; jalurnya disimpan bersama
 * pembayaran saat formulir disimpan.
 */
export async function mintaUnggahBuktiBayar(tipe: string): Promise<{ url: string; jalur: string }> {
  const sesi = await pastikanIzin("pembayaran");
  const ext = JENIS_BUKTI[tipe];
  if (!ext) throw new Error("Bukti harus gambar (PNG/JPG/WEBP) atau PDF.");
  const jalur = `pembayaran/${sesi.id}/${Date.now()}.${ext}`;
  return { url: await tautanUnggahBukti(jalur), jalur };
}
