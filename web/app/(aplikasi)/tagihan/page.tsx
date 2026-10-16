import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Filter, Plus, ReceiptText } from "lucide-react";
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
import { StatusTagihan } from "@/components/lencana-status";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { BarisKontak } from "@/components/baris-kontak";
import { cariPic, namaPic } from "@/lib/kontak";
import {
  cocokSaringPengakuan,
  LABEL_SARING_PENGAKUAN,
  pengakuanDokumen,
  saringPengakuanSah,
} from "@/lib/pengakuan";
import { tanggalAcaraDokumen } from "@/lib/tanggal";
import { bolehKelolaUang as kelolaUang } from "@/lib/peran";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { d, rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

import { tandaiJatuhTempo } from "./actions";
import { AksiBaris } from "./aksi-baris";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

const STATUS = [
  { nilai: "", label: "Semua" },
  { nilai: "unpaid", label: "Belum dibayar" },
  { nilai: "partial", label: "Sebagian" },
  { nilai: "overdue", label: "Jatuh tempo" },
  { nilai: "paid", label: "Lunas" },
  { nilai: "cancelled", label: "Dibatalkan" },
];

export default async function HalamanTagihan({ searchParams }: PageProps<"/tagihan">) {
  const sesi = await wajibIzin("tagihan");

  await tandaiJatuhTempo();

  const { cari, status, pengakuan, urut } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = typeof status === "string" ? status : "";

  // Penyaring dari kartu Dashboard. Keputusannya diambil di lib/pengakuan.ts,
  // modul yang sama yang dipakai Dashboard untuk menghitung kartunya —
  // kalau keduanya menyaring sendiri-sendiri, kartunya menyebut sebelas
  // sementara daftarnya berisi sembilan, tanpa galat apa pun.
  const saringPengakuan =
    typeof pengakuan === "string" && saringPengakuanSah(pengakuan) ? pengakuan : null;

  const semua = await prisma.invoices.findMany({
    where: {
      ...hanyaMiliknya(sesi),
      ...(kunci
        ? {
            OR: [
              { invoice_number: { contains: kunci, mode: "insensitive" } },
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
      invoice_number: true,
      invoice_date: true,
      due_date: true,
      event_type: true,
      grand_total: true,
      paid_amount: true,
      status: true,
      contact_person: true,
      customers: { select: { name: true, pic_name: true } },
      // Hanya dibutuhkan penyaring pengakuan. Kolom lamanya ikut diambil:
      // sebagian besar invoice menyimpan tanggal acaranya HANYA di situ.
      event_date: true,
      event_days: true,
      invoice_event_dates: { select: { event_date: true } },
    },
  });

  // Disaring SESUDAH terambil, bukan di dalam kueri: pengakuan adalah
  // keputusan per dokumen yang tidak bisa dinyatakan sebagai syarat SQL.
  const sekarang = new Date();
  const dasar = saringPengakuan
    ? semua.filter((t) =>
        cocokSaringPengakuan(
          saringPengakuan,
          {
            hasil: pengakuanDokumen(
              {
                grand_total: t.grand_total,
                paid_amount: t.paid_amount,
                tanggalAcara: tanggalAcaraDokumen(
                  t.invoice_event_dates,
                  t.event_date,
                  t.event_days,
                ),
              },
              sekarang,
            ),
            dueDate: t.due_date,
            acaraTerakhir: tanggalAcaraDokumen(
              t.invoice_event_dates,
              t.event_date,
              t.event_days,
            ).reduce<Date | null>((a, b) => (a === null || b > a ? b : a), null),
          },
          sekarang,
        ),
      )
    : semua;

  // Status disaring sesudah terambil supaya panel angka & jumlah per tab
  // memakai himpunan yang sama dengan daftarnya.
  const sisaDari = (t: (typeof semua)[number]) => d(t.grand_total).minus(d(t.paid_amount));
  const { kolom, arah } = bacaUrut(urut, ["nomor", "customer", "tempo", "nilai", "sisa"] as const, "-nomor");
  const daftar = urutkan(
    saring ? dasar.filter((t) => t.status === saring) : dasar,
    (t) =>
      kolom === "nomor"
        ? Number(t.id)
        : kolom === "customer"
          ? t.customers.name
          : kolom === "tempo"
            ? t.due_date
            : kolom === "nilai"
              ? Number(t.grand_total)
              : t.status === "paid" || t.status === "cancelled"
                ? 0
                : sisaDari(t).toNumber(),
    arah,
  );
  const per = (...st: string[]) => dasar.filter((t) => st.includes(t.status));
  const jumlahSisa = (xs: typeof dasar) => rupiah(xs.reduce((j, t) => j.plus(sisaDari(t)), d(0)));
  const terlambat = per("overdue");

  const bolehKelolaUang = kelolaUang(sesi.peran);

  const sisaTotal = daftar
    .filter((t) => t.status !== "cancelled" && t.status !== "paid")
    .reduce((jumlah, t) => jumlah.plus(d(t.grand_total).minus(d(t.paid_amount))), d(0));

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ReceiptText}
        jumlah={dasar.length}
        judul="Invoice"
        keterangan="Invoice yang sudah terbit beserta sisa yang belum dibayar."
        aksi={
          <Button render={<Link href="/tagihan/baru" />}>
            <Plus className="size-4" />
            Buat invoice
          </Button>
        }
      />

      {/* Datang dari kartu Dashboard. Tanpa keterangan ini, daftar yang
          isinya lebih sedikit daripada biasanya terbaca sebagai dokumen
          yang hilang — dan tidak ada petunjuk bahwa ia sedang disaring,
          apalagi cara melepasnya. */}
      {saringPengakuan ? (
        <div className="mb-4 flex min-h-12 flex-wrap items-center gap-2.5 rounded-[12px] border border-info-garis bg-info-halus py-1.5 pr-2 pl-4 text-[0.9375rem] text-primary-strong">
          <Filter className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          <span>
            Dari Dashboard: <b className="font-semibold">{LABEL_SARING_PENGAKUAN[saringPengakuan]}</b> · {dasar.length} invoice
          </span>
          <Button variant="outline" size="sm" className="ml-auto" render={<Link href="/tagihan" />}>
            Tampilkan semua
          </Button>
        </div>
      ) : null}

      <PapanAngka className="mb-5">
        <KartuAngka label="Belum dibayar" nilai={jumlahSisa(per("unpaid", "partial", "overdue"))} keterangan={`${per("unpaid", "partial", "overdue").length} invoice masih bersisa`} menonjol />
        <KartuAngka
          label="Lewat jatuh tempo"
          nilai={jumlahSisa(terlambat)}
          keterangan={terlambat.length ? `${terlambat.length} invoice perlu ditagih` : "Tidak ada yang terlambat"}
          nada={terlambat.length ? "perhatian" : "netral"}
          href={terlambat.length ? "/laporan/piutang" : undefined}
        />
        <KartuAngka label="Dibayar sebagian" nilai={jumlahSisa(per("partial"))} keterangan={`${per("partial").length} invoice · sisa`} />
        <KartuAngka label="Lunas" nilai={rupiah(per("paid").reduce((j, t) => j.plus(d(t.grand_total)), d(0)))} keterangan={`${per("paid").length} invoice`} nada="info" />
      </PapanAngka>

      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <SaringStatus pilihan={STATUS.map((x) => ({ ...x, jumlah: x.nilai ? per(x.nilai).length : dasar.length }))} />
        <div className="w-full sm:w-80">
          <Pencarian placeholder="Cari nomor, customer, atau acara…" />
        </div>
      </div>

      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci || saring ? "Tidak ada yang cocok" : "Belum ada invoice"}
            keterangan={
              kunci || saring
                ? "Coba ubah kata kunci atau penyaring statusnya."
                : "Invoice biasanya dibuat dari quotation yang sudah disetujui."
            }
            aksi={
              kunci || saring ? undefined : (
                <Button size="sm" render={<Link href="/tagihan/baru" />}>
                  <Plus className="size-4" />
                  Buat invoice
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
                <ThUrut kolom="tempo" className="hidden w-32 lg:table-cell">Jatuh tempo</ThUrut>
                <ThUrut kolom="nilai" kanan className="w-40">Nilai</ThUrut>
                <ThUrut kolom="sisa" kanan className="w-40">Sisa</ThUrut>
                <Th className="w-32">Status</Th>
                <Th className="w-12"><span className="sr-only">Tindakan</span></Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => {
                const sisa = sisaDari(t);
                const lunas = t.status === "paid";
                return (
                  <tr key={t.id.toString()} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                    <Td>
                      <Link
                        href={`/tagihan/${t.id}`}
                        className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                      >
                        {t.invoice_number}
                      </Link>
                      {/* Tanggal terbitnya ditaruh di bawah nomornya, bukan
                          sebagai kolom tersendiri: kolom Jatuh tempo justru
                          disembunyikan di layar sempit, dan tanggal invoice
                          adalah keterangan yang dicari bersama nomornya —
                          "invoice bulan lalu yang mana". */}
                      <span className="block text-xs text-muted-foreground">
                        {format(t.invoice_date, "d MMM yyyy", { locale: localeId })}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium">{t.customers.name}</span>
                      <BarisKontak
                        pic={namaPic(t.contact_person, t.customers.pic_name)}
                        acara={t.event_type}
                      />
                    </Td>
                    <Td className={`hidden lg:table-cell ${t.status === "overdue" ? "font-medium text-tempo" : "text-muted-foreground"}`}>
                      {format(t.due_date, "d MMM yyyy", { locale: localeId })}
                    </Td>
                    <Td className="text-right font-mono text-muted-foreground">
                      {rupiah(t.grand_total)}
                    </Td>
                    <Td className="uang text-right">
                      {lunas || t.status === "cancelled" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        rupiah(sisa)
                      )}
                    </Td>
                    <Td>
                      <StatusTagihan status={t.status} />
                    </Td>
                    <Td className="text-right">
                      <AksiBaris
                        id={t.id.toString()}
                        nomor={t.invoice_number}
                        status={t.status}
                        sudahDibayar={Number(t.paid_amount) > 0}
                        bolehKelolaUang={bolehKelolaUang}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </BingkaiTabel>

      {daftar.length > 0 ? (
        <RingkasanTabel>
          {daftar.length} tagihan · sisa belum dibayar {rupiah(sisaTotal)}
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
