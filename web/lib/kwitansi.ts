import "server-only";

import { cache } from "react";

import { nomorTiskaBerikutnya, simpanDenganKodeUnik } from "./nomor";
import { bacaPengaturanBisnis } from "./pengaturan";
import { tandaTanganDokumen } from "./penandatangan";
import { prisma } from "./prisma";
import { terbilang } from "./terbilang";
import { d } from "./uang";

export type IsiKwitansi = {
  nomor: string;
  tanggal: Date;
  dari: string;
  jumlah: string;
  terbilang: string;
  untuk: string;
  pph23: string;
  metode: string;
  perlu_materai: boolean;
  nilai_materai: number;
  perusahaan: { nama: string; logo: string | null };
  penandatangan: { nama: string | null; tautan: string | null };
};

const LABEL_METODE: Record<string, string> = { cash: "Tunai", transfer: "Transfer bank", giro: "Giro", lainnya: "Lainnya" };

/** Nomor kwitansi KWT/TC/YYMM/NNN — diberikan sekali saat pertama dibuka, lalu tetap (D-045). */
async function pastikanNomor(id: bigint, ada: string | null): Promise<string> {
  if (ada) return ada;
  await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("payments", "receipt_number", "KWT"),
    (nomor) => prisma.payments.updateMany({ where: { id, receipt_number: null }, data: { receipt_number: nomor } }),
  );
  const p = await prisma.payments.findUniqueOrThrow({ where: { id }, select: { receipt_number: true } });
  return p.receipt_number!;
}

/** Satu kali per permintaan: judul tab (nama berkas PDF) dan isi memakai nomor yang sama. */
export const isiKwitansi = cache(async (idTeks: string): Promise<IsiKwitansi | null> => {
  if (!/^\d+$/.test(idTeks)) return null;
  const id = BigInt(idTeks);
  const [p, perusahaan, bisnis] = await Promise.all([
    prisma.payments.findUnique({
      where: { id },
      include: {
        customers: { select: { name: true } },
        payment_details: { orderBy: { id: "asc" }, include: { invoices: { select: { invoice_number: true, event_type: true } } } },
      },
    }),
    prisma.company_settings.findUnique({ where: { id: BigInt(1) } }),
    bacaPengaturanBisnis(),
  ]);
  if (!p) return null;

  // Yang menutup invoice = uang masuk + PPh 23 yang dipotong customer.
  const jumlah = d(p.total_amount).plus(d(p.pph23_amount));
  const invoice = p.payment_details.map((x) => x.invoices.invoice_number + (x.invoices.event_type ? ` (${x.invoices.event_type})` : ""));
  const ttd = await tandaTanganDokumen({
    idPenandatangan: null,
    namaCadangan: perusahaan?.signature_name ?? null,
    jalurCadangan: perusahaan?.signature_path ?? null,
  });

  return {
    nomor: await pastikanNomor(id, p.receipt_number),
    tanggal: p.payment_date,
    dari: p.customers.name,
    jumlah: jumlah.toFixed(0),
    terbilang: terbilang(jumlah.toFixed(0)),
    untuk: p.notes?.trim() || (invoice.length ? `Pembayaran invoice ${invoice.join(", ")}` : "Pembayaran"),
    pph23: d(p.pph23_amount).toFixed(0),
    metode: [LABEL_METODE[p.payment_method] ?? p.payment_method, p.bank_cash].filter(Boolean).join(" · "),
    perlu_materai: jumlah.gt(bisnis.materai.batas),
    nilai_materai: bisnis.materai.nilai,
    perusahaan: {
      nama: perusahaan?.company_name ?? "PT. TISKA CIPTA IMAJI",
      logo: perusahaan?.logo_path?.startsWith("http") ? perusahaan.logo_path : null,
    },
    penandatangan: { nama: ttd.nama, tautan: ttd.tautan },
  };
});
