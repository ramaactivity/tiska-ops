"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pastikanFotoBelanja } from "@/lib/bukti-berkas";
import { JENIS_REKANAN, type JenisRekanan } from "@/lib/hitung/rekanan";
import { hitungUlangMargin } from "@/lib/margin";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { aksesPenuh, bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { orderRekanan, tulisPerkiraanPartnerFee } from "@/lib/rekanan";

/* Rekanan pembawa klien & Partner Fee (D-132). */

type Hasil = { ok: true; pesan: string; id?: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const opsional = (maks: number) => z.string().trim().max(maks).transform((x) => x || null);

const skema = z.object({
  id: id.nullish(),
  nama: z.string().trim().min(2, "Isi nama rekanan.").max(150),
  jenis: z.enum(Object.keys(JENIS_REKANAN) as [JenisRekanan, ...JenisRekanan[]]),
  pic: opsional(100),
  hp: opsional(50),
  email: opsional(150),
  instagram: opsional(100),
  rekening: opsional(200),
  /** "" = pakai Partner Fee bawaan Angka Bisnis. */
  feePct: z
    .string()
    .trim()
    .regex(/^(\d{1,2}([.,]\d{1,2})?)?$/, "Partner Fee berupa angka persen, mis. 3,5.")
    .transform((x) => (x ? x.replace(",", ".") : null)),
  catatan: opsional(1000),
});

function segarkan(idRekanan?: string | bigint) {
  revalidatePath("/rekanan");
  if (idRekanan) revalidatePath(`/rekanan/${idRekanan}`);
}

export async function simpanRekanan(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("rekanan");
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const f = p.data;
  if (f.feePct !== null && Number(f.feePct) > 50) return { ok: false, pesan: "Partner Fee maksimal 50%." };
  const data = { name: f.nama, kind: f.jenis, contact_name: f.pic, phone: f.hp, email: f.email, instagram: f.instagram, bank_account: f.rekening, fee_pct: f.feePct, notes: f.catatan, updated_at: new Date() };
  if (f.id) {
    await prisma.referral_partners.update({ where: { id: BigInt(f.id) }, data });
    segarkan(f.id);
    return { ok: true, pesan: "Data rekanan diperbarui.", id: f.id };
  }
  const r = await prisma.referral_partners.create({ data: { ...data, created_by: BigInt(sesi.id) }, select: { id: true } });
  segarkan();
  return { ok: true, pesan: "Rekanan ditambahkan.", id: r.id.toString() };
}

export async function aktifkanRekanan(idRekanan: string, aktif: boolean): Promise<Hasil> {
  await pastikanIzin("rekanan");
  if (!id.safeParse(idRekanan).success) return { ok: false, pesan: "Rekanan tidak dikenal." };
  await prisma.referral_partners.update({ where: { id: BigInt(idRekanan) }, data: { active: aktif, updated_at: new Date() } });
  segarkan(idRekanan);
  return { ok: true, pesan: aktif ? "Rekanan aktif lagi." : "Rekanan dinonaktifkan — tidak muncul di pilihan baru. Riwayat & statistiknya tetap ada." };
}

/** Tetapkan rekanan sebuah quotation / invoice (null = bukan dari rekanan). Invoice yang Partner Fee-nya sudah dibayar dikunci. */
export async function setelRekananOrder(jenis: "quotation" | "invoice", idDokumen: string, idRekanan: string | null): Promise<Hasil> {
  const sesi = await pastikanIzin(jenis === "quotation" ? "penawaran" : "tagihan");
  if (!id.safeParse(idDokumen).success || (idRekanan && !id.safeParse(idRekanan).success)) return { ok: false, pesan: "Isian tidak sah." };
  const partner_id = idRekanan ? BigInt(idRekanan) : null;
  if (jenis === "quotation") {
    const feeBawaan = (await bacaPengaturanBisnis()).partner_fee_pct;
    await prisma.$transaction(async (tx) => {
      const q = await tx.quotations.findUniqueOrThrow({ where: { id: BigInt(idDokumen) }, select: { order_source: true } });
      // Sumber order ikut (D-137): ditandai rekanan → "rekanan"; dilepas → sumber rekanan dikosongkan.
      const order_source = partner_id ? "rekanan" : q.order_source === "rekanan" ? null : q.order_source;
      await tx.quotations.update({ where: { id: BigInt(idDokumen) }, data: { partner_id, order_source, ...(partner_id ? {} : { partner_fee_pct: null }) } });
      await tulisPerkiraanPartnerFee(tx, BigInt(idDokumen), sesi.id, feeBawaan);
    });
    // Invoice turunannya yang belum menetapkan rekanan sendiri ikut quotation (dihitung, tidak disalin).
    revalidatePath(`/penawaran/${idDokumen}`);
  } else {
    if (await prisma.partner_fees.count({ where: { invoice_id: BigInt(idDokumen) } })) return { ok: false, pesan: "Partner Fee invoice ini sudah dibayar — rekanannya tidak bisa diganti." };
    await prisma.invoices.update({ where: { id: BigInt(idDokumen) }, data: { partner_id } });
    revalidatePath(`/tagihan/${idDokumen}`);
  }
  segarkan();
  return { ok: true, pesan: idRekanan ? "Rekanan order ditetapkan — Partner Fee-nya tercatat di menu Rekanan." : "Order ini ditandai bukan dari rekanan." };
}

/**
 * Bayar Partner Fee satu invoice (Finance/owner): hanya bila klien sudah lunas. Nominal dihitung ulang di server,
 * dicatat di partner_fees + biaya "Partner Fee" di laporan Margin invoice itu.
 */
export async function bayarPartnerFee(idInvoice: string, isian: { tanggal: string; bukti: string | null; catatan: string }): Promise<Hasil> {
  const sesi = await pastikanIzin("rekanan");
  if (!bolehKelolaUang(sesi.peran)) return { ok: false, pesan: "Partner Fee dibayar oleh Finance atau owner." };
  const p = z.object({ tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), bukti: z.string().nullable(), catatan: z.string().trim().max(255) }).safeParse(isian);
  if (!id.safeParse(idInvoice).success || !p.success) return { ok: false, pesan: "Isian tidak sah." };
  if (p.data.bukti) {
    try {
      await pastikanFotoBelanja([p.data.bukti]);
    } catch (e) {
      return { ok: false, pesan: (e as Error).message };
    }
  }
  const inv = await prisma.invoices.findUnique({ where: { id: BigInt(idInvoice) }, select: { customer_id: true, invoice_margins: { select: { status: true } } } });
  if (!inv) return { ok: false, pesan: "Invoice tidak ditemukan." };
  const o = (await orderRekanan({ idCustomer: inv.customer_id })).find((x) => x.idInvoice === idInvoice);
  if (!o) return { ok: false, pesan: "Invoice ini tidak punya rekanan." };
  if (o.status === "dibayar") return { ok: false, pesan: "Partner Fee invoice ini sudah dibayar." };
  if (o.status !== "siap") return { ok: false, pesan: "Partner Fee baru bisa dibayar setelah klien lunas." };
  if (inv.invoice_margins?.status === "final") return { ok: false, pesan: "Margin invoice ini sudah difinalisasi. Buka kembali di halaman Margin dulu supaya Partner Fee ikut tercatat sebagai biaya." };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.partner_fees.create({
        data: {
          invoice_id: BigInt(idInvoice),
          partner_id: BigInt(o.rekanan.id),
          base_amount: o.nilaiMakanan,
          pct: o.fee.pct,
          amount: o.fee.jumlah,
          paid_at: new Date(`${p.data.tanggal}T00:00:00Z`),
          proof_path: p.data.bukti,
          note: p.data.catatan || null,
          paid_by: BigInt(sesi.id),
        },
      });
      // Perkiraan dari quotation (D-137) diubah jadi aktual — bukan baris kedua yang menghitung fee dua kali.
      const perkiraan = await tx.invoice_costs.findFirst({
        where: { invoice_id: BigInt(idInvoice), category: "partner_fee", actual_amount: null },
        select: { id: true },
      });
      const isi = { description: `Partner Fee ${o.rekanan.nama} (${o.fee.pct}%)`, actual_amount: o.fee.jumlah, status: "aktual", source: "partner_fee", updated_at: new Date() };
      if (perkiraan) await tx.invoice_costs.update({ where: { id: perkiraan.id }, data: isi });
      else
        await tx.invoice_costs.create({
          data: { ...isi, invoice_id: BigInt(idInvoice), category: "partner_fee", created_by: BigInt(sesi.id), created_at: new Date() },
        });
      await hitungUlangMargin(BigInt(idInvoice), tx);
    });
  } catch {
    return { ok: false, pesan: "Partner Fee ini baru saja dicatat orang lain. Muat ulang halaman." };
  }
  segarkan(o.rekanan.id);
  revalidatePath("/pengingat-bayar");
  return { ok: true, pesan: `Partner Fee ${o.rekanan.nama} tercatat dibayar & masuk biaya Margin ${o.nomor}.` };
}

/** Batalkan catatan bayar (salah input) — owner/admin saja; biaya di Margin ikut dihapus. */
export async function batalBayarPartnerFee(idInvoice: string): Promise<Hasil> {
  const sesi = await pastikanIzin("rekanan");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Hanya owner/admin yang membatalkan pembayaran Partner Fee." };
  if (!id.safeParse(idInvoice).success) return { ok: false, pesan: "Invoice tidak dikenal." };
  const f = await prisma.partner_fees.findUnique({ where: { invoice_id: BigInt(idInvoice) }, select: { partner_id: true } });
  if (!f) return { ok: false, pesan: "Belum ada pembayaran Partner Fee." };
  await prisma.$transaction(async (tx) => {
    await tx.partner_fees.delete({ where: { invoice_id: BigInt(idInvoice) } });
    // Baris yang asalnya perkiraan kembali jadi perkiraan; yang dibuat saat bayar dihapus.
    await tx.invoice_costs.updateMany({
      where: { invoice_id: BigInt(idInvoice), source: "partner_fee", estimated_amount: { not: null } },
      data: { actual_amount: null, status: "estimasi", source: null, updated_at: new Date() },
    });
    await tx.invoice_costs.deleteMany({ where: { invoice_id: BigInt(idInvoice), source: "partner_fee" } });
    await hitungUlangMargin(BigInt(idInvoice), tx);
  });
  segarkan(f.partner_id);
  return { ok: true, pesan: "Pembayaran Partner Fee dibatalkan — kembali Siap dibayar." };
}
