import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Printer, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KeadaanKosong, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Button } from "@/components/ui/button";
import { ambilKartuPiutang } from "@/lib/kartu-piutang";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Kartu piutang customer" };
export const dynamic = "force-dynamic";

export default async function HalamanKartuCustomer({
  params,
}: PageProps<"/pelanggan/[id]">) {
  const sesi = await wajibIzin("pelanggan");

  const { id } = await params;
  const kartu = await ambilKartuPiutang(id, hanyaMiliknya(sesi));
  if (!kartu) notFound();

  const { customer, baris, totalInvoice, totalBayar, sisa } = kartu;
  const lunas = sisa.lte(0);

  return (
    <Halaman>
      <div className="pb-5">
        <Link
          href="/pelanggan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Semua customer
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Users className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-primary-strong sm:text-[1.875rem]">{customer.nama}</h1>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="nomor-dokumen">{customer.kode}</span>
            {customer.pic ? ` · ${customer.pic}` : ""}
            {customer.telepon ? ` · ${customer.telepon}` : ""}
          </p>
          {customer.alamat ? (
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{customer.alamat}</p>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          render={
            <a href={`/pelanggan/${customer.id}/cetak`} target="_blank" rel="noopener" />
          }
        >
          <Printer className="size-4" />
          Cetak kartu
        </Button>
      </header>

      <PapanAngka kolom={3} className="mb-6">
        <KartuAngka label="Total invoice" warna="biru" nilai={rupiah(totalInvoice)} />
        <KartuAngka
          label="Sudah dibayar"
          nilai={rupiah(totalBayar)}
          warna="hijau"
        />
        <KartuAngka
          label={lunas ? "Lunas" : "Sisa piutang"}
          nilai={rupiah(sisa)}
          menonjol
          warna={lunas ? "ungu" : "kuning"}
        />
      </PapanAngka>

      <h2 className="eyebrow pb-1">Mutasi</h2>
      <p className="pb-2.5 text-xs text-muted-foreground">
        Seluruh invoice dan pembayaran berurutan waktu, termasuk yang sudah lunas. Invoice
        yang dibatalkan tidak ikut — ia tidak pernah menjadi piutang.
      </p>

      <BingkaiTabel>
        {baris.length === 0 ? (
          <KeadaanKosong
            judul="Belum ada mutasi"
            keterangan="Customer ini belum punya invoice maupun payment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <Th className="w-28">Tanggal</Th>
                  <Th className="w-40">Dokumen</Th>
                  <Th>Keterangan</Th>
                  <Th className="w-36 text-right">Invoice</Th>
                  <Th className="w-36 text-right">Bayar</Th>
                  <Th className="w-36 text-right">Saldo</Th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.kunci} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {format(b.tanggal, "d MMM yy", { locale: localeId })}
                    </Td>
                    <Td>
                      <Link
                        href={b.tautan}
                        className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                      >
                        {b.nomor}
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{b.keterangan ?? "—"}</Td>
                    <Td className="angka text-right tabular-nums">
                      {b.debit.gt(0) ? rupiah(b.debit) : "—"}
                    </Td>
                    <Td className="angka text-right tabular-nums">
                      {b.kredit.gt(0) ? rupiah(b.kredit) : "—"}
                    </Td>
                    <Td className="angka text-right font-medium tabular-nums">
                      {rupiah(b.saldo)}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <Td className="whitespace-nowrap">SALDO AKHIR</Td>
                  <Td />
                  <Td className="text-xs font-normal text-muted-foreground">
                    {baris.length} mutasi
                  </Td>
                  <Td className="angka text-right tabular-nums">{rupiah(totalInvoice)}</Td>
                  <Td className="angka text-right tabular-nums">{rupiah(totalBayar)}</Td>
                  <Td className={`angka text-right tabular-nums ${lunas ? "" : "text-sebagian"}`}>
                    {rupiah(sisa)}
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </BingkaiTabel>
    </Halaman>
  );
}

