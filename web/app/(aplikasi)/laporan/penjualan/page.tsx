import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChartColumn, FileSpreadsheet, FileText, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BingkaiTabel,
  Halaman,
  KeadaanKosong,
  KepalaHalaman,
  RingkasanTabel,
  StripRingkasan,
  Td,
  Th,
} from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { StatusTagihan } from "@/components/lencana-status";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { ringkasTanggalAcaraPendek } from "@/lib/tanggal";
import { rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

import { ambilLaporan, bacaSaring } from "@/lib/laporan-penjualan";
import { SaringLaporan } from "./saring";

export const metadata: Metadata = { title: "Laporan penjualan" };
export const dynamic = "force-dynamic";

export default async function HalamanLaporanPenjualan({
  searchParams,
}: PageProps<"/laporan/penjualan">) {
  const sesi = await wajibIzin("laporan-penjualan");

  const params = await searchParams;
  const saring = bacaSaring(params);
  const { baris: semua, pelanggan, ringkasan } = await ambilLaporan(saring, hanyaMiliknya(sesi));
  const { kolom, arah } = bacaUrut(params.urut, ["nomor", "tanggal", "customer", "nilai", "sisa"] as const, "-tanggal");
  const baris = urutkan(
    semua,
    (b) =>
      kolom === "nomor" ? b.nomor : kolom === "tanggal" ? b.tanggal : kolom === "customer" ? b.pelanggan : kolom === "nilai" ? Number(b.total) : b.status === "cancelled" ? 0 : Number(b.sisa),
    arah,
  );

  const kueri = new URLSearchParams(
    Object.entries(saring).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ChartColumn}
        judul="Laporan penjualan"
        keterangan="Rekap quotation dan invoice pada rentang tanggal yang dipilih."
        aksi={
          <>
            <Button
              variant="outline"
              render={<a href={`/laporan/penjualan/excel?${kueri}`} />}
            >
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              render={
                <a href={`/laporan/penjualan/cetak?${kueri}`} target="_blank" rel="noopener" />
              }
            >
              <Printer className="size-4" />
              Cetak
            </Button>
          </>
        }
      />

      <div className="pb-5">
        <SaringLaporan pelanggan={pelanggan} />
      </div>

      <PapanAngka className="mb-4">
        <KartuAngka
          label="Penjualan diakui"
          nilai={rupiah(ringkasan.penjualanDiakui)}
          keterangan={`dari ${ringkasan.jumlahTagihan} invoice senilai ${rupiah(ringkasan.nilaiTagihan)}`}
          nada="info"
          menonjol
        />
        <KartuAngka label="Diterima di muka" nilai={rupiah(ringkasan.diterimaDiMuka)} keterangan="sudah dibayar, acaranya belum terjadi" />
        <KartuAngka label="Proyeksi penjualan" nilai={rupiah(ringkasan.proyeksiPenjualan)} keterangan="belum dibayar, acaranya belum terjadi" />
        <KartuAngka
          label="Piutang"
          nilai={rupiah(ringkasan.totalPiutang)}
          keterangan={ringkasan.jumlahJatuhTempo > 0 ? `${ringkasan.jumlahJatuhTempo} invoice lewat tempo` : "belum ada yang lewat tempo"}
          nada={ringkasan.jumlahJatuhTempo > 0 ? "perhatian" : "netral"}
          href={ringkasan.jumlahJatuhTempo > 0 ? "/laporan/piutang" : undefined}
        />
      </PapanAngka>

      <div className="mb-4">
        <StripRingkasan
          judul="Quotation di rentang ini"
          ikon={FileText}
          isi={[
            ["Dibuat", ringkasan.jumlahPenawaran],
            ["Disetujui", ringkasan.penawaranDisetujui],
            ["Nilai", rupiah(ringkasan.nilaiPenawaran)],
          ]}
        />
      </div>

      <BingkaiTabel>
        {baris.length === 0 ? (
          <KeadaanKosong
            judul="Tidak ada invoice pada rentang ini"
            keterangan="Ubah rentang tanggal atau pilih customer yang lain."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <ThUrut kolom="nomor" className="w-44">Nomor</ThUrut>
                <ThUrut kolom="tanggal" className="hidden w-28 md:table-cell">Tanggal</ThUrut>
                <ThUrut kolom="customer">Customer</ThUrut>
                <ThUrut kolom="nilai" kanan className="w-40">Nilai</ThUrut>
                <Th className="hidden w-36 text-right lg:table-cell">Terbayar</Th>
                <ThUrut kolom="sisa" kanan className="w-40">Sisa</ThUrut>
                <Th className="w-32">Status</Th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                  <Td>
                    <Link
                      href={`/tagihan/${b.id}`}
                      className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                    >
                      {b.nomor}
                    </Link>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                    {format(b.tanggal, "d MMM yy", { locale: localeId })}
                  </Td>
                  <Td>
                    <span className="font-medium">{b.pelanggan}</span>
                    {[b.acara, ringkasTanggalAcaraPendek(b.tanggalAcara)].some(Boolean) ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {[b.acara, ringkasTanggalAcaraPendek(b.tanggalAcara)].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-right font-mono">{rupiah(b.total)}</Td>
                  <Td className="hidden text-right font-mono text-muted-foreground lg:table-cell">
                    {rupiah(b.dibayar)}
                  </Td>
                  <Td className="uang text-right">
                    {b.status === "cancelled" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      rupiah(b.sisa)
                    )}
                  </Td>
                  <Td>
                    <StatusTagihan status={b.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>

      {baris.length > 0 ? (
        <RingkasanTabel>
          {baris.length} baris ditampilkan · tagihan dibatalkan tidak dihitung dalam ringkasan
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
