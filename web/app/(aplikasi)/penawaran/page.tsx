import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BingkaiTabel,
  Halaman,
  KeadaanKosong,
  KepalaHalaman,
  Pil,
  RingkasanTabel,
  Td,
  Th,
} from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { StatusPenawaran } from "@/components/lencana-status";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { BarisKontak } from "@/components/baris-kontak";
import { ringkasTanggalAcaraPendek, tanggalAcaraDokumen } from "@/lib/tanggal";
import { cariPic, namaPic } from "@/lib/kontak";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

import { tandaiKadaluarsa } from "./actions";
import { AksiBaris } from "./aksi-baris";

export const metadata: Metadata = { title: "Quotation" };
export const dynamic = "force-dynamic";

const STATUS = [
  { nilai: "", label: "Semua" },
  { nilai: "draft", label: "Draft" },
  { nilai: "sent", label: "Terkirim" },
  { nilai: "approved", label: "Disetujui" },
  { nilai: "rejected", label: "Ditolak" },
  { nilai: "expired", label: "Kadaluarsa" },
];

export default async function HalamanPenawaran({ searchParams }: PageProps<"/penawaran">) {
  const sesi = await wajibIzin("penawaran");

  // Menandai yang masa berlakunya lewat sebelum daftar digambar, supaya
  // status di layar tidak pernah bertentangan dengan tanggalnya.
  await tandaiKadaluarsa();

  const { cari, status, urut } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = typeof status === "string" ? status : "";

  // Status disaring sesudah terambil: angka panel & jumlah per tab memakai
  // daftar yang sama (hanya tersaring pencarian), jadi selalu cocok.
  const semua = await prisma.quotations.findMany({
    where: {
      ...hanyaMiliknya(sesi),
      ...(kunci
        ? {
            OR: [
              { quotation_number: { contains: kunci, mode: "insensitive" } },
              { customers: { name: { contains: kunci, mode: "insensitive" } } },
              { event_type: { contains: kunci, mode: "insensitive" } },
              // Nama PIC ikut dicari, dengan aturan yang sama persis dengan
              // yang menentukan nama mana yang TAMPIL di barisnya.
              ...cariPic(kunci),
            ],
          }
        : {}),
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      quotation_number: true,
      quotation_date: true,
      valid_until: true,
      // Kolom lamanya ikut diambil — lihat catatan di tanggalAcaraDokumen().
      event_date: true,
      event_days: true,
      quotation_event_dates: { select: { event_date: true } },
      event_type: true,
      grand_total: true,
      status: true,
      owner_approval: true,
      contact_person: true,
      customers: { select: { name: true, pic_name: true } },
    },
  });

  const { kolom, arah } = bacaUrut(urut, ["nomor", "customer", "tanggal", "nilai"] as const, "-nomor");
  const daftar = urutkan(
    saring ? semua.filter((p) => p.status === saring) : semua,
    (p) => (kolom === "nomor" ? Number(p.id) : kolom === "customer" ? p.customers.name : kolom === "tanggal" ? p.quotation_date : Number(p.grand_total)),
    arah,
  );
  const nilaiTotal = daftar.reduce((jumlah, p) => jumlah + Number(p.grand_total), 0);
  const per = (st: string) => semua.filter((p) => p.status === st);
  const nilai = (xs: typeof semua) => rupiah(xs.reduce((j, p) => j + Number(p.grand_total), 0));
  const tunggu = semua.filter((p) => p.owner_approval === "perlu");

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileText}
        jumlah={semua.length}
        judul="Quotation"
        keterangan="Quotation harga yang dikirim ke customer sebelum menjadi invoice."
        aksi={
          <Button render={<Link href="/penawaran/baru" />}>
            <Plus className="size-4" />
            Buat quotation
          </Button>
        }
      />

      <PapanAngka className="mb-5">
        <KartuAngka label="Draft" nilai={String(per("draft").length)} keterangan={`${nilai(per("draft"))} belum dikirim`} />
        <KartuAngka label="Menunggu jawaban" nilai={nilai(per("sent"))} keterangan={`${per("sent").length} quotation terkirim`} />
        <KartuAngka label="Disetujui" nilai={nilai(per("approved"))} keterangan={`${per("approved").length} quotation`} nada="info" />
        <KartuAngka
          label="Menunggu owner"
          nilai={String(tunggu.length)}
          keterangan={tunggu.length ? "Untung di bawah batas — perlu persetujuan" : "Tidak ada yang menunggu"}
          nada={tunggu.length ? "perhatian" : "netral"}
        />
      </PapanAngka>

      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <SaringStatus pilihan={STATUS.map((x) => ({ ...x, jumlah: x.nilai ? per(x.nilai).length : semua.length }))} />
        <div className="w-full sm:w-80">
          <Pencarian placeholder="Cari nomor, customer, atau acara…" />
        </div>
      </div>

      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci || saring ? "Tidak ada yang cocok" : "Belum ada quotation"}
            keterangan={
              kunci || saring
                ? "Coba ubah kata kunci atau penyaring statusnya."
                : "Buat quotation pertama untuk mulai mencatat penjualan."
            }
            aksi={
              kunci || saring ? undefined : (
                <Button size="sm" render={<Link href="/penawaran/baru" />}>
                  <Plus className="size-4" />
                  Buat quotation
                </Button>
              )
            }
          />
        ) : (
          // Pola tabel daftar (D-161): Customer kolom fleksibel (nama boleh 2 baris, keterangan terpotong rapi),
          // kolom lain selebar isinya & tidak turun baris. Di layar sempit tabel digeser.
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b">
                <ThUrut kolom="nomor" className="w-px">Nomor</ThUrut>
                <ThUrut kolom="customer" className="w-full">Customer</ThUrut>
                <Th className="w-px">Berlaku sampai</Th>
                <Th className="w-px">Status</Th>
                <ThUrut kolom="nilai" kanan className="w-px">Nilai</ThUrut>
                <Th className="w-px"><span className="sr-only">Tindakan</span></Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id.toString()} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/penawaran/${p.id}`}
                      className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                    >
                      {p.quotation_number}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{format(p.quotation_date, "d MMM yyyy", { locale: localeId })}</span>
                  </Td>
                  <Td className="max-w-0">
                    <Link href={`/penawaran/${p.id}`} className="line-clamp-2 font-medium underline-offset-4 hover:text-primary hover:underline" title={p.customers.name}>
                      {p.customers.name}
                    </Link>
                    <BarisKontak
                      pic={namaPic(p.contact_person, p.customers.pic_name)}
                      acara={p.event_type}
                      tanggalAcara={ringkasTanggalAcaraPendek(tanggalAcaraDokumen(p.quotation_event_dates, p.event_date, p.event_days))}
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {format(p.valid_until, "d MMM yyyy", { locale: localeId })}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPenawaran status={p.status} />
                      {p.owner_approval === "perlu" ? <Pil nada="perhatian">Menunggu owner</Pil> : null}
                    </div>
                  </Td>
                  <Td className="uang text-right whitespace-nowrap">
                    {rupiah(p.grand_total)}
                  </Td>
                  <Td className="text-right">
                    <AksiBaris
                      id={p.id.toString()}
                      nomor={p.quotation_number}
                      status={p.status}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </BingkaiTabel>

      {daftar.length > 0 ? (
        <RingkasanTabel>
          {daftar.length} quotation · nilai {rupiah(nilaiTotal)}
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
