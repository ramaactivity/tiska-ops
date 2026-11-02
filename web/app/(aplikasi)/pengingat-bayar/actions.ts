"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pastikanFotoBelanja } from "@/lib/bukti-berkas";
import { jatuhTempoBerikut, KATEGORI_TAGIHAN, type KategoriTagihan, ULANGI } from "@/lib/hitung/pengingat-bayar";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Pengingat Bayar (D-128): tagihan kantor rutin & sekali bayar. Hanya pencatat & pengingat — tidak membuat jurnal/kas. */

type Hasil = { ok: true; pesan: string; id?: string } | { ok: false; pesan: string };
const id = z.string().regex(/^\d+$/);
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");
const nominal = z
  .string()
  .regex(/^\d{0,13}$/)
  .transform((x) => (x ? x : null));
const skema = z.object({
  id: id.nullish(),
  nama: z.string().trim().min(1, "Isi nama tagihannya.").max(120),
  kategori: z.enum(Object.keys(KATEGORI_TAGIHAN) as [KategoriTagihan, ...KategoriTagihan[]]),
  nominal,
  ulangi: z.enum(Object.keys(ULANGI) as [keyof typeof ULANGI, ...(keyof typeof ULANGI)[]]),
  jatuhTempo: tanggal,
  ingatkan: z.number().int().min(0).max(30),
  idPic: id.nullish(),
  kodeBayar: z.string().trim().max(120),
  tujuanBayar: z.string().trim().max(300),
  catatan: z.string().trim().max(1000),
  idEvent: id.nullish(),
  foto: z.array(z.string()).max(5),
});

function segarkan(idTagihan?: string | bigint) {
  revalidatePath("/pengingat-bayar");
  if (idTagihan) revalidatePath(`/pengingat-bayar/${idTagihan}`);
}

export async function simpanTagihan(input: z.input<typeof skema>): Promise<Hasil> {
  const sesi = await pastikanIzin("pengingat-bayar");
  const p = skema.safeParse(input);
  if (!p.success) return { ok: false, pesan: p.error.issues[0]?.message ?? "Isian tidak sah." };
  const f = p.data;
  try {
    await pastikanFotoBelanja(f.foto);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const bulan = Number(f.ulangi);
  const data = {
    name: f.nama,
    category: f.kategori,
    amount: f.nominal,
    repeat_months: bulan || null,
    due_day: bulan ? Number(f.jatuhTempo.slice(8, 10)) : null,
    next_due: new Date(`${f.jatuhTempo}T00:00:00Z`),
    remind_days: f.ingatkan,
    pic_user_id: f.idPic ? BigInt(f.idPic) : null,
    pay_code: f.kodeBayar || null,
    pay_to: f.tujuanBayar || null,
    note: f.catatan || null,
    event_id: f.idEvent ? BigInt(f.idEvent) : null,
    photo_paths: f.foto,
    updated_at: new Date(),
  };
  if (f.id) {
    const { count } = await prisma.bills.updateMany({ where: { id: BigInt(f.id) }, data });
    if (!count) return { ok: false, pesan: "Tagihan tidak ditemukan." };
    segarkan(f.id);
    return { ok: true, pesan: "Tagihan diperbarui.", id: f.id };
  }
  const b = await prisma.bills.create({ data: { ...data, created_by: BigInt(sesi.id) }, select: { id: true } });
  segarkan();
  return { ok: true, pesan: "Tagihan disimpan. Pengingat dikirim pagi hari mulai H-" + f.ingatkan + ".", id: b.id.toString() };
}

/**
 * Catat bayar periode yang sedang jatuh tempo. Rutin → maju ke periode berikutnya; sekali → selesai.
 * Bersyarat pada next_due yang dibaca, jadi dua orang menekan Bayar bersamaan tidak mencatat dua kali.
 */
export async function bayarTagihan(idTagihan: string, isian: { tanggal: string; nominal: string; bukti: string | null; catatan: string }): Promise<Hasil> {
  const sesi = await pastikanIzin("pengingat-bayar");
  const p = z.object({ tanggal, nominal, bukti: z.string().nullable(), catatan: z.string().trim().max(255) }).safeParse(isian);
  if (!id.safeParse(idTagihan).success || !p.success) return { ok: false, pesan: p.success ? "Tagihan tidak dikenal." : (p.error.issues[0]?.message ?? "Isian tidak sah.") };
  if (p.data.bukti) {
    try {
      await pastikanFotoBelanja([p.data.bukti]);
    } catch (e) {
      return { ok: false, pesan: (e as Error).message };
    }
  }
  const b = await prisma.bills.findUnique({ where: { id: BigInt(idTagihan) }, select: { status: true, next_due: true, repeat_months: true, due_day: true } });
  if (!b || b.status !== "aktif") return { ok: false, pesan: "Tagihan ini sudah selesai / dihentikan. Muat ulang halaman." };
  const periode = b.next_due.toISOString().slice(0, 10);
  const lanjut = b.repeat_months ? jatuhTempoBerikut(periode, b.repeat_months, b.due_day ?? Number(periode.slice(8, 10))) : null;
  const jadi = await prisma.$transaction(async (tx) => {
    const { count } = await tx.bills.updateMany({
      where: { id: BigInt(idTagihan), status: "aktif", next_due: b.next_due },
      data: lanjut ? { next_due: new Date(`${lanjut}T00:00:00Z`), updated_at: new Date() } : { status: "selesai", updated_at: new Date() },
    });
    if (!count) return false;
    await tx.bill_payments.create({
      data: {
        bill_id: BigInt(idTagihan),
        due_date: b.next_due,
        paid_at: new Date(`${p.data.tanggal}T00:00:00Z`),
        amount: p.data.nominal,
        proof_path: p.data.bukti,
        note: p.data.catatan || null,
        paid_by: BigInt(sesi.id),
      },
    });
    return true;
  });
  if (!jadi) return { ok: false, pesan: "Periode ini sudah dicatat dibayar orang lain. Muat ulang halaman." };
  segarkan(idTagihan);
  return { ok: true, pesan: lanjut ? `Tercatat dibayar. Jatuh tempo berikutnya ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${lanjut}T00:00:00Z`))}.` : "Tercatat lunas — tagihan selesai." };
}

export async function hentikanTagihan(idTagihan: string, berhenti: boolean): Promise<Hasil> {
  await pastikanIzin("pengingat-bayar");
  if (!id.safeParse(idTagihan).success) return { ok: false, pesan: "Tagihan tidak dikenal." };
  const { count } = await prisma.bills.updateMany({
    where: { id: BigInt(idTagihan), status: berhenti ? "aktif" : "berhenti" },
    data: { status: berhenti ? "berhenti" : "aktif", updated_at: new Date() },
  });
  if (!count) return { ok: false, pesan: "Status tagihan sudah berubah. Muat ulang halaman." };
  segarkan(idTagihan);
  return { ok: true, pesan: berhenti ? "Tagihan dihentikan — tidak diingatkan lagi. Riwayatnya tetap tersimpan." : "Tagihan aktif lagi." };
}

/** Hapus hanya untuk tagihan salah input yang belum pernah dibayar; selebihnya pakai Hentikan (riwayat tetap ada). */
export async function hapusTagihan(idTagihan: string): Promise<Hasil> {
  await pastikanIzin("pengingat-bayar");
  if (!id.safeParse(idTagihan).success) return { ok: false, pesan: "Tagihan tidak dikenal." };
  const { count } = await prisma.bills.deleteMany({ where: { id: BigInt(idTagihan), bill_payments: { none: {} } } });
  if (!count) return { ok: false, pesan: "Tagihan yang sudah punya riwayat bayar tidak bisa dihapus — pakai Hentikan." };
  segarkan();
  return { ok: true, pesan: "Tagihan dihapus." };
}
