import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Banknote, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BingkaiTabel,
  Halaman,
  KeadaanKosong,
  KepalaHalaman,
  RingkasanTabel,
  Td,
  Th,
} from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Pencarian } from "@/components/pencarian";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { d, rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

import { AksiBaris } from "./aksi-baris";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

const LABEL_METODE: Record<string, string> = {
  cash: "Tunai",
  transfer: "Transfer bank",
  giro: "Giro",
  lainnya: "Lainnya",
};

export default async function HalamanPembayaran({ searchParams }: PageProps<"/pembayaran">) {
  await wajibIzin("pembayaran");

  const { cari, urut } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";

  const semua = await prisma.payments.findMany({
    where: kunci
      ? {
          OR: [
            { payment_number: { contains: kunci, mode: "insensitive" } },
            { customers: { name: { contains: kunci, mode: "insensitive" } } },
            { bank_cash: { contains: kunci, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { id: "desc" },
    select: {
      id: true,
      payment_number: true,
      payment_date: true,
      payment_method: true,
      bank_cash: true,
      total_amount: true,
      customers: { select: { name: true } },
      _count: { select: { payment_details: true } },
    },
  });

  const { kolom, arah } = bacaUrut(urut, ["nomor", "customer", "tanggal", "jumlah"] as const, "-nomor");
  const daftar = urutkan(
    semua,
    (p) => (kolom === "nomor" ? Number(p.id) : kolom === "customer" ? p.customers.name : kolom === "tanggal" ? p.payment_date : Number(p.total_amount)),
    arah,
  );
  const total = daftar.reduce((jumlah, p) => jumlah.plus(d(p.total_amount)), d(0));
  // Bulan menurut WIB; payment_date bertipe DATE (UTC tengah malam).
  const bulanIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 7);
  const [th, bl] = bulanIni.split("-").map(Number);
  const bulanLalu = `${bl === 1 ? th - 1 : th}-${String(bl === 1 ? 12 : bl - 1).padStart(2, "0")}`;
  const diBulan = (b: string) => semua.filter((p) => p.payment_date.toISOString().slice(0, 7) === b);
  const jumlah = (xs: typeof semua) => rupiah(xs.reduce((j, p) => j.plus(d(p.total_amount)), d(0)));
  const namaBulan = (b: string) => format(new Date(`${b}-01T00:00:00Z`), "MMMM yyyy", { locale: localeId });

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Banknote}
        jumlah={semua.length}
        judul="Payment"
        keterangan="Setoran yang masuk dari customer beserta alokasinya ke invoice."
        aksi={
          <Button render={<Link href="/pembayaran/baru" />}>
            <Plus className="size-4" />
            Catat pembayaran
          </Button>
        }
      />

      <PapanAngka kolom={3} className="mb-5">
        <KartuAngka label="Masuk bulan ini" nilai={jumlah(diBulan(bulanIni))} keterangan={`${diBulan(bulanIni).length} payment · ${namaBulan(bulanIni)}`} nada={diBulan(bulanIni).length ? "info" : "netral"} menonjol />
        <KartuAngka label="Bulan lalu" nilai={jumlah(diBulan(bulanLalu))} keterangan={`${diBulan(bulanLalu).length} payment · ${namaBulan(bulanLalu)}`} />
        <KartuAngka label={kunci ? "Hasil pencarian" : "Semua tercatat"} nilai={rupiah(total)} keterangan={`${semua.length} payment`} />
      </PapanAngka>

      <div className="pb-4 sm:w-80">
        <Pencarian placeholder="Cari nomor, customer, atau bank…" />
      </div>

      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Belum ada payment"}
            keterangan={
              kunci
                ? `Tidak ditemukan payment untuk "${kunci}".`
                : "Payment dicatat dari halaman invoice atau lewat tombol di atas."
            }
            aksi={
              kunci ? undefined : (
                <Button size="sm" render={<Link href="/pembayaran/baru" />}>
                  <Plus className="size-4" />
                  Catat pembayaran
                </Button>
              )
            }
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <ThUrut kolom="nomor" className="w-44">Nomor</ThUrut>
                <ThUrut kolom="customer">Customer</ThUrut>
                <ThUrut kolom="tanggal" className="hidden w-32 md:table-cell">Tanggal</ThUrut>
                <Th className="hidden w-40 lg:table-cell">Cara bayar</Th>
                <ThUrut kolom="jumlah" kanan className="w-40">Jumlah</ThUrut>
                <Th className="w-12"><span className="sr-only">Tindakan</span></Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id.toString()} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                  <Td>
                    <Link
                      href={`/pembayaran/${p.id}`}
                      className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                    >
                      {p.payment_number}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {p._count.payment_details} invoice
                    </span>
                  </Td>
                  <Td className="font-medium">{p.customers.name}</Td>
                  <Td className="hidden text-muted-foreground md:table-cell">
                    {format(p.payment_date, "d MMM yyyy", { locale: localeId })}
                  </Td>
                  <Td className="hidden text-muted-foreground lg:table-cell">
                    {LABEL_METODE[p.payment_method] ?? p.payment_method}
                    {p.bank_cash ? (
                      <span className="block text-xs">{p.bank_cash}</span>
                    ) : null}
                  </Td>
                  <Td className="uang text-right">
                    {rupiah(p.total_amount)}
                  </Td>
                  <Td className="text-right">
                    <AksiBaris id={p.id.toString()} nomor={p.payment_number} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>

      {daftar.length > 0 ? (
        <RingkasanTabel>
          {daftar.length} payment · total {rupiah(total)}
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
