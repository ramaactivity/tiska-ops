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
import { SaringPeriode } from "@/components/saring-periode";
import { SaringStatus } from "@/components/saring-status";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { kwitansiBelumBermeterai } from "@/lib/kwitansi";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { ringkasTanggalAcaraPendek, tanggalAcaraDokumen } from "@/lib/tanggal";
import { d, rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

import { AksiBaris } from "./aksi-baris";
import { CentangPayment, PilihPayment } from "./pilih-payment";

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

  const { cari, urut, metode, dari, sampai } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const tgl = (t: unknown) => (typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "");
  const [dariT, sampaiT] = [tgl(dari), tgl(sampai)];
  const metodeT = typeof metode === "string" && metode in LABEL_METODE ? metode : "";

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
      // Tanggal acara ada di invoice yang dibayar (satu payment bisa menutup beberapa). Kolom lama ikut — lihat tanggalAcaraDokumen().
      payment_details: { select: { invoices: { select: { event_date: true, event_days: true, invoice_event_dates: { select: { event_date: true } } } } } },
    },
  });

  // Saringan periode & cara bayar (D-196) di memori — ponytail: ratusan baris; pindah ke where Prisma bila ribuan.
  // payment_date bertipe DATE (UTC tengah malam), jadi cukup dibandingkan sebagai "YYYY-MM-DD".
  const diPeriode = semua.filter((p) => {
    const t = p.payment_date.toISOString().slice(0, 10);
    return (!dariT || t >= dariT) && (!sampaiT || t <= sampaiT);
  });
  const tersaring = metodeT ? diPeriode.filter((p) => p.payment_method === metodeT) : diPeriode;
  const adaSaring = Boolean(kunci || dariT || sampaiT || metodeT);
  const caraAda = Object.entries(LABEL_METODE)
    .map(([nilai, label]) => ({ nilai, label, jumlah: diPeriode.filter((p) => p.payment_method === nilai).length }))
    .filter((m) => m.jumlah > 0 || m.nilai === metodeT);

  const { kolom, arah } = bacaUrut(urut, ["nomor", "customer", "tanggal", "jumlah"] as const, "-nomor");
  const daftar = urutkan(
    tersaring,
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

  // Kwitansi wajib meterai yang belum diberi meterai (D-130) — supaya tidak lupa unggah / tandai.
  const belumMeterai = await kwitansiBelumBermeterai();

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
        <KartuAngka label={adaSaring ? "Hasil saringan" : "Semua tercatat"} nilai={rupiah(total)} keterangan={`${daftar.length} payment`} />
      </PapanAngka>

      {belumMeterai.length ? (
        <section className="mb-5 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3">
          <p className="text-[0.9375rem] font-medium">⚠️ {belumMeterai.length} kwitansi wajib meterai belum diberi meterai</p>
          <p className="pb-2 text-sm text-muted-foreground">Buka payment-nya → bagian Meterai kwitansi → ikuti langkahnya (e-meterai atau meterai tempel).</p>
          <ul className="flex flex-wrap gap-1.5">
            {belumMeterai.map((m) => (
              <li key={m.id}>
                <Link href={`/pembayaran/${m.id}`} className="inline-flex min-h-9 items-center rounded-full border bg-card px-3.5 text-sm hover:bg-accent">
                  {m.nomor} · {m.pelanggan} · <span className="ml-1 font-mono tabular-nums">{rupiah(m.jumlah)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mb-4 flex flex-col gap-3">
        <SaringPeriode />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <Pencarian placeholder="Cari nomor, customer, atau bank…" />
          </div>
          {/* Hanya bila ada lebih dari satu cara bayar di periode ini — "Semua 34 | Transfer 34" tidak membantu. */}
          {metodeT || caraAda.length > 1 ? (
            <SaringStatus parameter="metode" pilihan={[{ nilai: "", label: "Semua cara", jumlah: diPeriode.length }, ...caraAda]} />
          ) : null}
        </div>
      </div>

      <PilihPayment>
        <BingkaiTabel>
          {daftar.length === 0 ? (
            <KeadaanKosong
              judul={adaSaring ? "Tidak ada yang cocok" : "Belum ada payment"}
              keterangan={
                adaSaring
                  ? kunci
                    ? `Tidak ditemukan payment untuk "${kunci}" dengan saringan ini.`
                    : "Tidak ada payment dengan saringan ini. Pilih “Semua” untuk melihat semuanya."
                  : "Payment dicatat dari halaman invoice atau lewat tombol di atas."
              }
              aksi={
                adaSaring ? undefined : (
                  <Button size="sm" render={<Link href="/pembayaran/baru" />}>
                    <Plus className="size-4" />
                    Catat pembayaran
                  </Button>
                )
              }
            />
          ) : (
            // Pola tabel daftar (D-161): Customer kolom fleksibel (nama boleh 2 baris, keterangan terpotong rapi),
            // kolom lain selebar isinya & tidak turun baris. Di layar sempit tabel digeser.
            <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <Th className="w-px pr-0"><span className="sr-only">Pilih</span></Th>
                  <ThUrut kolom="nomor" className="w-px">Nomor</ThUrut>
                  <ThUrut kolom="customer" className="w-full">Customer</ThUrut>
                  <ThUrut kolom="tanggal" className="w-px">Tanggal</ThUrut>
                  <Th className="w-px">Cara bayar</Th>
                  <ThUrut kolom="jumlah" kanan className="w-px">Jumlah</ThUrut>
                  <Th className="w-px"><span className="sr-only">Tindakan</span></Th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id.toString()} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                    <Td className="pr-0">
                      <CentangPayment id={p.id.toString()} nomor={p.payment_number} jumlah={Number(p.total_amount)} />
                    </Td>
                    <Td className="whitespace-nowrap">
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
                    <Td className="max-w-0">
                      <Link href={`/pembayaran/${p.id}`} className="line-clamp-2 font-medium underline-offset-4 hover:text-primary hover:underline" title={p.customers.name}>
                        {p.customers.name}
                      </Link>
                      {acaraPayment(p.payment_details) ? (
                        <span className="block truncate text-xs text-muted-foreground">{acaraPayment(p.payment_details)}</span>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {format(p.payment_date, "d MMM yyyy", { locale: localeId })}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {LABEL_METODE[p.payment_method] ?? p.payment_method}
                      {p.bank_cash ? (
                        <span className="block text-xs">{p.bank_cash}</span>
                      ) : null}
                    </Td>
                    <Td className="uang text-right whitespace-nowrap">
                      {rupiah(p.total_amount)}
                    </Td>
                    <Td className="text-right">
                      <AksiBaris id={p.id.toString()} nomor={p.payment_number} />
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
            {daftar.length} payment · total {rupiah(total)}
          </RingkasanTabel>
        ) : null}
      </PilihPayment>
    </Halaman>
  );
}

/** Tanggal acara di balik satu payment: dikumpulkan dari semua invoice yang dibayarnya, diringkas sekali. */
function acaraPayment(rincian: { invoices: { event_date: Date | null; event_days: number | null; invoice_event_dates: { event_date: Date }[] } }[]): string | null {
  return ringkasTanggalAcaraPendek(rincian.flatMap((r) => tanggalAcaraDokumen(r.invoices.invoice_event_dates, r.invoices.event_date, r.invoices.event_days)));
}
