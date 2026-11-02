import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Banknote, FileCheck2, PencilLine, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Halaman, Td, Th } from "@/components/halaman";
import { KartuAngka } from "@/components/kartu-angka";
import { StatusTagihan } from "@/components/lencana-status";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { d, rupiah } from "@/lib/uang";

import { KwitansiMeterai } from "./kwitansi-meterai";

export const metadata: Metadata = { title: "Detail payment" };
export const dynamic = "force-dynamic";

const LABEL_METODE: Record<string, string> = {
  cash: "Tunai",
  transfer: "Transfer bank",
  giro: "Giro",
  lainnya: "Lainnya",
};

export default async function HalamanDetailPembayaran({
  params,
}: PageProps<"/pembayaran/[id]">) {
  await wajibIzin("pembayaran");

  const { id } = await params;

  const p = await prisma.payments.findUnique({
    where: { id: BigInt(id) },
    include: {
      customers: true,
      users: { select: { name: true } },
      payment_details: {
        orderBy: { id: "asc" },
        include: {
          invoices: {
            select: {
              id: true,
              invoice_number: true,
              due_date: true,
              grand_total: true,
              paid_amount: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!p) notFound();
  // Kwitansi = uang + PPh 23 yang dipotong (sama dengan lib/kwitansi.ts).
  const nilaiKwitansi = d(p.total_amount).plus(d(p.pph23_amount));
  const batasMeterai = (await bacaPengaturanBisnis()).materai.batas;

  return (
    <Halaman>
      <div className="pb-5">
        <Link
          href="/pembayaran"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Semua pembayaran
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Banknote className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="font-mono text-2xl font-bold tracking-tight text-primary-strong sm:text-[1.75rem]">{p.payment_number}</h1>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {format(p.payment_date, "d MMMM yyyy", { locale: localeId })} ·{" "}
            {LABEL_METODE[p.payment_method] ?? p.payment_method}
            {p.bank_cash ? ` · ${p.bank_cash}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/pembayaran/${p.id}/kwitansi`} target="_blank" rel="noopener" />}
          >
            <Receipt className="size-4" />
            Kwitansi
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/pembayaran/${p.id}/ubah`} />}>
            <PencilLine className="size-4" />
            Ubah
          </Button>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 divide-border rounded-[14px] border bg-card sm:grid-cols-3 sm:divide-x">
        <KartuAngka
          label="Uang diterima"
          nilai={rupiah(p.total_amount)}
          menonjol
          warna="hijau"
          keterangan={
            Number(p.pph23_amount) > 0 ? "masuk ke rekening" : undefined
          }
        />
        <KartuAngka label="Dari customer" warna="biru" nilai={p.customers.name} teks />
        <KartuAngka
          label="Menutup"
          warna="ungu"
          nilai={`${p.payment_details.length} invoice`}
          teks
          keterangan={p.users ? `Dicatat oleh ${p.users.name}` : undefined}
        />
      </section>

      <KwitansiMeterai
        id={p.id.toString()}
        perlu={nilaiKwitansi.gt(batasMeterai)}
        batas={rupiah(batasMeterai)}
        jumlah={rupiah(nilaiKwitansi)}
        cara={p.receipt_stamp_mode}
        tanggal={p.receipt_stamped_at ? format(p.receipt_stamped_at, "d MMMM yyyy", { locale: localeId }) : null}
      />

      {p.transfer_proof ? (
        <a
          href={`/pembayaran/${p.id}/bukti`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex min-h-11 w-fit items-center gap-2 rounded-full border border-lunas-garis bg-lunas-halus px-4 text-sm font-medium text-lunas hover:underline"
        >
          <FileCheck2 className="size-4" />
          Lihat bukti transfer
        </a>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Belum ada bukti transfer.{" "}
          <Link href={`/pembayaran/${p.id}/ubah`} className="font-medium text-primary underline-offset-4 hover:underline">
            Upload lewat Ubah
          </Link>
        </p>
      )}

      {/* PPh 23 disebut terpisah: uang yang masuk ke rekening memang lebih
          kecil daripada yang menutup invoice, dan tanpa keterangan ini
          selisihnya terbaca sebagai kesalahan pencatatan. */}
      {Number(p.pph23_amount) > 0 ? (
        <section className="mb-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">
            PPh 23 dipotong {rupiah(p.pph23_amount)} · menutup{" "}
            {rupiah(d(p.total_amount).plus(d(p.pph23_amount)))}
          </p>
          <p className="mt-1 text-muted-foreground">
            {p.pph23_bukti
              ? `Bukti potong ${p.pph23_bukti}. `
              : "Nomor bukti potong belum diisi — tanpa itu potongannya tidak bisa dikreditkan di SPT. "}
            Yang dipotong sudah disetorkan customer ke kas negara atas nama perusahaan, jadi
            invoicenya tetap lunas.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="eyebrow pb-2.5">Alokasi ke invoice</h2>

        <div className="overflow-hidden rounded-[14px] border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <Th>Invoice</Th>
                  <Th className="hidden w-32 md:table-cell">Jatuh tempo</Th>
                  <Th className="w-36 text-right">Nilai invoice</Th>
                  <Th className="w-36 text-right">Dialokasikan</Th>
                  <Th className="w-32">Status kini</Th>
                </tr>
              </thead>
              <tbody>
                {p.payment_details.map((baris) => (
                  <tr key={baris.id.toString()} className="border-b last:border-0">
                    <Td>
                      <Link
                        href={`/tagihan/${baris.invoices.id}`}
                        className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                      >
                        {baris.invoices.invoice_number}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        sisa sekarang{" "}
                        {rupiah(d(baris.invoices.grand_total).minus(d(baris.invoices.paid_amount)))}
                      </span>
                    </Td>
                    <Td className="hidden text-muted-foreground md:table-cell">
                      {format(baris.invoices.due_date, "d MMM yyyy", { locale: localeId })}
                    </Td>
                    <Td className="angka text-right tabular-nums text-muted-foreground">
                      {rupiah(baris.invoices.grand_total)}
                    </Td>
                    <Td className="angka text-right font-medium tabular-nums">
                      {rupiah(baris.amount_applied)}
                    </Td>
                    <Td>
                      <StatusTagihan status={baris.invoices.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {p.notes ? (
        <section className="mt-6 rounded-[14px] border bg-card p-4">
          <h2 className="eyebrow pb-2.5">Catatan</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{p.notes}</p>
        </section>
      ) : null}
    </Halaman>
  );
}

