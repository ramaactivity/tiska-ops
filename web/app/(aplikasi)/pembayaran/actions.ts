"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { buktiTersimpan, tautanUnggahBukti } from "@/lib/bukti-berkas";
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
      signatory_id: true,
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
        ttd: t.signatory_id?.toString() ?? null,
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

/** Kwitansi ber-e-meterai (D-130): PDF yang sudah dibubuhi di portal e-meterai resmi, diunggah balik. null = hapus. */
export async function simpanKwitansiMeterai(idPembayaran: string, jalur: string | null): Promise<{ ok: boolean; pesan: string }> {
  const sesi = await pastikanIzin("pembayaran");
  if (!/^\d+$/.test(idPembayaran)) return { ok: false, pesan: "Payment tidak dikenal." };
  if (jalur !== null) {
    if (!new RegExp(`^pembayaran/${sesi.id}/\\d+\\.pdf$`).test(jalur)) return { ok: false, pesan: "Berkas harus PDF hasil e-meterai." };
    if (!(await buktiTersimpan(jalur))) return { ok: false, pesan: "PDF belum terunggah. Coba lagi." };
  }
  const { count } = await prisma.payments.updateMany({
    where: { id: BigInt(idPembayaran) },
    data: jalur ? { receipt_stamped_path: jalur, receipt_stamped_at: new Date(), receipt_stamp_mode: "digital" } : { receipt_stamped_path: null, receipt_stamped_at: null, receipt_stamp_mode: null },
  });
  if (!count) return { ok: false, pesan: "Payment tidak ditemukan." };
  revalidatePath(`/pembayaran/${idPembayaran}`);
  revalidatePath("/pembayaran");
  return { ok: true, pesan: jalur ? "Kwitansi ber-e-meterai tersimpan. Kirim yang ini ke klien." : "Kwitansi ber-e-meterai dilepas dari payment ini." };
}

/**
 * Tandai cara meterai tanpa unggah (D-130): "fisik" = dicetak, meterai tempel, aslinya dikirim; "tidak" = klien tidak
 * minta kwitansi; null = batalkan tanda (diingatkan lagi bila wajib meterai). PDF e-meterai diatur lewat simpanKwitansiMeterai.
 */
export async function tandaiMeterai(idPembayaran: string, cara: "fisik" | "tidak" | null): Promise<{ ok: boolean; pesan: string }> {
  await pastikanIzin("pembayaran");
  if (!/^\d+$/.test(idPembayaran) || ![null, "fisik", "tidak"].includes(cara)) return { ok: false, pesan: "Isian tidak sah." };
  const { count } = await prisma.payments.updateMany({
    where: { id: BigInt(idPembayaran), receipt_stamped_path: null },
    data: { receipt_stamp_mode: cara, receipt_stamped_at: cara === "fisik" ? new Date() : null },
  });
  if (!count) return { ok: false, pesan: "Payment ini sudah punya PDF ber-e-meterai. Hapus dulu PDF-nya kalau mau mengganti cara." };
  revalidatePath(`/pembayaran/${idPembayaran}`);
  revalidatePath("/pembayaran");
  return {
    ok: true,
    pesan: cara === "fisik" ? "Tercatat: meterai fisik ditempel & kwitansi asli dikirim." : cara === "tidak" ? "Ditandai tidak perlu meterai — tidak diingatkan lagi." : "Tanda dibatalkan.",
  };
}

/**
 * Ganti penandatangan kwitansi langsung dari panel halaman cetak (D-129 + D-160). Hanya kolom payments.signatory_id;
 * nominal & alokasi invoice tidak disentuh. Hanya penandatangan aktif yang boleh dipilih.
 */
export async function gantiPenandatanganKwitansi(idPembayaran: string, idPenandatangan: string): Promise<{ ok: boolean; pesan: string }> {
  await pastikanIzin("pembayaran");
  if (!/^\d+$/.test(idPembayaran) || !/^\d+$/.test(idPenandatangan)) return { ok: false, pesan: "Isian tidak sah." };
  const orang = await prisma.signatories.findFirst({ where: { id: BigInt(idPenandatangan), is_active: true }, select: { name: true } });
  if (!orang) return { ok: false, pesan: "Penandatangan ini sudah tidak aktif. Muat ulang halaman." };
  const { count } = await prisma.payments.updateMany({ where: { id: BigInt(idPembayaran) }, data: { signatory_id: BigInt(idPenandatangan) } });
  if (!count) return { ok: false, pesan: "Payment tidak ditemukan." };
  revalidatePath(`/pembayaran/${idPembayaran}`);
  return { ok: true, pesan: `Kwitansi ditandatangani ${orang.name}.` };
}
