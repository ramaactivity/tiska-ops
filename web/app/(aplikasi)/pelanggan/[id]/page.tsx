import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Building2, CalendarCheck, CalendarRange, ChevronRight, Gift, Handshake, type LucideIcon, MapPin, Phone, Printer, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KeadaanKosong, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { JENIS_KLIEN, type JenisKlien, tebakJenisKlien } from "@/lib/hitung/rekanan";
import { ambilKartuPiutang } from "@/lib/kartu-piutang";
import { hariIniWib } from "@/lib/kalender";
import { kartuPelanggan } from "@/lib/loyalti";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Kartu piutang customer" };
export const dynamic = "force-dynamic";

export default async function HalamanKartuCustomer({
  params,
  searchParams,
}: PageProps<"/pelanggan/[id]">) {
  const sesi = await wajibIzin("pelanggan");

  const { id } = await params;
  // Tab (D-176): mutasi yang panjang dipisah dari profil.
  const { tab: t } = await searchParams;
  const tab = t === "mutasi" ? "mutasi" : "";
  const kartu = await ambilKartuPiutang(id, hanyaMiliknya(sesi));
  if (!kartu) notFound();

  const { customer, baris, totalInvoice, totalBayar, sisa } = kartu;
  const lunas = sisa.lte(0);
  // Profil (D-132): jenis klien, kanal, rekanan pembawa, kartu loyalti.
  const [profil, loyalti] = await Promise.all([
    prisma.customers.findUniqueOrThrow({
      where: { id: BigInt(customer.id) },
      select: {
        name: true,
        client_type: true,
        referral_partners: { select: { id: true, name: true } },
        _count: { select: { retail_orders: { where: { status: "aktif" } }, invoices: { where: { OR: [{ order_type: "event" }, { order_type: null }], status: { not: "cancelled" } } } } },
      },
    }),
    kartuPelanggan(hariIniWib(), [BigInt(customer.id)]),
  ]);
  const jenisKlien = (profil.client_type ?? tebakJenisKlien(profil.name)) as JenisKlien;
  const invoiceBaris = baris.filter((b) => b.debit.gt(0));
  const kartuLoyalti = loyalti.get(customer.id.toString()) ?? [];

  const profilBaris: { ikon: LucideIcon; label: string; isi: React.ReactNode }[] = [
    {
      ikon: Building2,
      label: "Jenis klien",
      isi: (
        <>
          {JENIS_KLIEN[jenisKlien]}
          {profil.client_type ? "" : <span className="text-muted-foreground"> (tebakan)</span>}
        </>
      ),
    },
    {
      ikon: CalendarCheck,
      label: "Pesanan",
      isi:
        [profil._count.invoices ? `${profil._count.invoices} catering event` : null, profil._count.retail_orders ? `${profil._count.retail_orders} retail / Ikut Menu Pesta` : null].filter(Boolean).join(" · ") ||
        "Belum ada",
    },
    ...(invoiceBaris.length
      ? [
          {
            ikon: CalendarRange,
            label: "Invoice pertama sampai terakhir",
            isi: `${format(invoiceBaris[0].tanggal, "d MMM yyyy", { locale: localeId })} sampai ${format(invoiceBaris.at(-1)!.tanggal, "d MMM yyyy", { locale: localeId })}`,
          },
        ]
      : []),
    {
      ikon: Handshake,
      label: "Dibawa oleh rekanan",
      isi: profil.referral_partners ? (
        <Link href={`/rekanan/${profil.referral_partners.id}`} className="text-primary underline-offset-4 hover:underline">
          {profil.referral_partners.name}
        </Link>
      ) : (
        "Tidak ada"
      ),
    },
    ...kartuLoyalti.map(({ program: lp, kartu: k }) => ({
      ikon: Gift,
      label: lp.nama,
      isi: `${k.stempel} dari ${k.syarat} pesanan${k.hadiah.some((h) => h.status === "tersedia") ? ", punya hadiah" : ""}`,
    })),
  ];
  const kontak: { ikon: LucideIcon; label: string; isi: string | null | undefined }[] = [
    { ikon: UserRound, label: "PIC", isi: customer.pic },
    { ikon: Phone, label: "Telepon", isi: customer.telepon },
    { ikon: MapPin, label: "Alamat", isi: customer.alamat },
  ];

  return (
    <Halaman>
      <Link href="/pelanggan" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary">
        <ArrowLeft className="size-4" />
        Semua customer
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 pt-5 pb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Users className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="text-[1.375rem] leading-tight font-bold tracking-[-0.025em] text-balance text-primary-strong sm:text-[2.125rem]">{customer.nama}</h1>
          </div>
          <p className="mt-2 text-[0.9375rem] text-muted-foreground">
            <span className="nomor-dokumen">{customer.kode}</span>
            {customer.pic ? ` · ${customer.pic}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href={`/pelanggan/${customer.id}/cetak`} target="_blank" rel="noopener" />}>
          <Printer className="size-4" />
          Cetak kartu
        </Button>
      </header>

      <PapanAngka kolom={3} className="mb-8">
        <KartuAngka label="Total invoice" warna="biru" nilai={rupiah(totalInvoice)} />
        <KartuAngka label="Sudah dibayar" nilai={rupiah(totalBayar)} warna="hijau" />
        <KartuAngka label="Sisa piutang" nilai={rupiah(sisa)} menonjol warna={lunas ? "ungu" : "kuning"} keterangan={lunas ? "Lunas" : undefined} />
      </PapanAngka>

      <SaringStatus
        parameter="tab"
        pilihan={[
          { nilai: "", label: "Ringkasan" },
          { nilai: "mutasi", label: "Mutasi piutang", jumlah: baris.length },
        ]}
      />

      <div className="pt-6">
        {tab === "" ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
            <section className="kartu p-5 sm:p-7">
              <h2 className="eyebrow pb-5">Profil</h2>
              <dl className="flex flex-col gap-5">
                {profilBaris.map(({ ikon: Ikon, label, isi }) => (
                  <div key={label} className="flex gap-3.5">
                    <Ikon className="mt-0.5 size-[18px] shrink-0 text-subtle-foreground" strokeWidth={1.75} aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="pt-0.5 text-[0.9375rem] font-medium">{isi}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <Link href={`/pelanggan/${customer.id}?tab=mutasi`} scroll={false} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                Lihat mutasi piutang
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
            <section className="kartu p-5 sm:p-7">
              <h2 className="eyebrow pb-5">Kontak</h2>
              {kontak.some((x) => x.isi) ? (
                <dl className="flex flex-col gap-5">
                  {kontak
                    .filter((x) => x.isi)
                    .map(({ ikon: Ikon, label, isi }) => (
                      <div key={label} className="flex gap-3.5">
                        <Ikon className="mt-0.5 size-[18px] shrink-0 text-subtle-foreground" strokeWidth={1.75} aria-hidden="true" />
                        <div className="min-w-0">
                          <dt className="text-sm text-muted-foreground">{label}</dt>
                          <dd className="pt-0.5 text-[0.9375rem] whitespace-pre-line">{isi}</dd>
                        </div>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada kontak tercatat.</p>
              )}
            </section>
          </div>
        ) : (
          <>
            <p className="pb-4 text-sm text-muted-foreground">
              Seluruh invoice dan pembayaran berurutan waktu, termasuk yang sudah lunas. Invoice yang dibatalkan tidak ikut karena tidak pernah menjadi piutang.
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
                          <Td className="text-muted-foreground">{b.keterangan ?? ""}</Td>
                          <Td className="angka text-right tabular-nums">
                            {b.debit.gt(0) ? rupiah(b.debit) : ""}
                          </Td>
                          <Td className="angka text-right tabular-nums">
                            {b.kredit.gt(0) ? rupiah(b.kredit) : ""}
                          </Td>
                          <Td className="angka text-right font-medium tabular-nums">
                            {rupiah(b.saldo)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/40 font-semibold">
                        <Td className="whitespace-nowrap">Saldo akhir</Td>
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
          </>
        )}
      </div>
    </Halaman>
  );
}
