import { BellRing, ChevronLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { namaAcara } from "@/lib/aset";
import { KATEGORI_TAGIHAN, type KategoriTagihan, keadaanTagihan, labelSisa, sisaHari, ULANGI } from "@/lib/hitung/pengingat-bayar";
import { hariIniWib } from "@/lib/kalender";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { TombolBayar } from "../tombol-bayar";
import { AksiTagihan } from "./aksi-tagihan";

export const metadata: Metadata = { title: "Tagihan" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const pendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const berkas = (j: string) => `/pengingat-bayar/berkas?j=${encodeURIComponent(j)}`;

export default async function HalamanTagihan({ params }: PageProps<"/pengingat-bayar/[id]">) {
  await wajibIzin("pengingat-bayar");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await prisma.bills.findUnique({
    where: { id: BigInt(id) },
    include: {
      users_bills_pic_user_idTousers: { select: { name: true } },
      events: { select: { id: true, name: true, first_date: true, customers: { select: { name: true } } } },
      bill_payments: { orderBy: [{ due_date: "desc" }, { id: "desc" }], include: { users: { select: { name: true } } } },
    },
  });
  if (!b) notFound();
  const hariIni = hariIniWib();
  const jatuhTempo = b.next_due.toISOString().slice(0, 10);
  const sisa = sisaHari(jatuhTempo, hariIni);
  const nominal = b.amount === null ? null : Number(b.amount);

  const fakta: [string, React.ReactNode][] = [
    ["Kategori", KATEGORI_TAGIHAN[b.category as KategoriTagihan] ?? b.category],
    ["Bayar", ULANGI[String(b.repeat_months ?? 0) as keyof typeof ULANGI]],
    ["Nominal", nominal !== null ? <span className="font-mono tabular-nums">{rupiah(nominal)}</span> : "berubah-ubah"],
    ["Ingatkan", `mulai H-${b.remind_days}, tiap pagi`],
    ["PIC", b.users_bills_pic_user_idTousers?.name ?? "—"],
  ];

  return (
    <Halaman>
      <Link href="/pengingat-bayar" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Pengingat Bayar
      </Link>
      <KepalaHalaman
        ikon={BellRing}
        judul={b.name}
        aksi={
          <Button variant="outline" className="rounded-full bg-card" render={<Link href={`/pengingat-bayar/${id}/ubah`} />}>
            <Pencil className="size-4" />
            Ubah
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 lg:col-span-2">
          {b.status === "aktif" ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Jatuh tempo</span>
                <span className="text-lg font-semibold">{hari.format(b.next_due)}</span>
              </div>
              <Pil nada={keadaanTagihan(sisa, b.remind_days) === "nanti" ? "netral" : "perhatian"}>{labelSisa(sisa)}</Pil>
              <div className="ml-auto">
                <TombolBayar id={id} hariIni={hariIni} nominal={nominal} />
              </div>
            </div>
          ) : (
            <Pil>{b.status === "selesai" ? "Selesai — sudah lunas" : "Dihentikan — tidak diingatkan lagi"}</Pil>
          )}
          <dl className="grid gap-x-6 gap-y-2 border-t pt-4 text-[0.9375rem] sm:grid-cols-2">
            {fakta.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0.5">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {b.pay_code || b.pay_to ? (
            <div className="flex flex-col gap-3 border-t pt-4">
              {b.pay_code ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">ID pelanggan / kode bayar</span>
                  <span className="font-mono text-[0.9375rem] font-medium break-all">{b.pay_code}</span>
                  <SalinTeks teks={b.pay_code} />
                </div>
              ) : null}
              {b.pay_to ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rekening tujuan / cara bayar</span>
                  <span className="text-[0.9375rem] font-medium break-words">{b.pay_to}</span>
                  <SalinTeks teks={b.pay_to} />
                </div>
              ) : null}
            </div>
          ) : null}
          {b.events ? (
            <p className="border-t pt-4 text-[0.9375rem]">
              <span className="text-sm text-muted-foreground">Terkait acara: </span>
              <Link href={`/event/${b.events.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {namaAcara(b.events)}
              </Link>
            </p>
          ) : null}
          {b.note ? <p className="border-t pt-4 text-[0.9375rem] whitespace-pre-wrap">{b.note}</p> : null}
          {b.photo_paths.length ? (
            <ul className="flex flex-wrap gap-2 border-t pt-4">
              {b.photo_paths.map((j, i) => (
                <li key={j}>
                  <a href={berkas(j)} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden rounded-xl border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- tautan bertanda tangan sementara */}
                    <img src={berkas(j)} alt={`Foto tagihan ${i + 1}`} className="size-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <aside className="flex flex-col gap-3">
          <AksiTagihan id={id} status={b.status} bolehHapus={b.bill_payments.length === 0} />
        </aside>
      </div>

      <h2 className="eyebrow pt-6 pb-2">Riwayat bayar</h2>
      <BingkaiTabel>
        {b.bill_payments.length ? (
          <table className="w-full">
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th>Dibayar</Th>
                <Th className="text-right">Nominal</Th>
                <Th>Catatan</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {b.bill_payments.map((p) => (
                <tr key={p.id.toString()} className="border-t">
                  <Td className="whitespace-nowrap">{pendek.format(p.due_date)}</Td>
                  <Td className="text-sm whitespace-nowrap">
                    {pendek.format(p.paid_at)}
                    {p.users ? <span className="block text-xs text-muted-foreground">{p.users.name}</span> : null}
                  </Td>
                  <Td className="text-right font-mono whitespace-nowrap tabular-nums">{p.amount !== null ? rupiah(p.amount) : "—"}</Td>
                  <Td className="min-w-40 text-sm text-muted-foreground">{p.note ?? ""}</Td>
                  <Td className="text-right">
                    {p.proof_path ? (
                      <a href={berkas(p.proof_path)} target="_blank" rel="noreferrer" className="text-sm whitespace-nowrap text-primary underline-offset-4 hover:underline">
                        Bukti
                      </a>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum pernah dicatat dibayar.</p>
        )}
      </BingkaiTabel>
    </Halaman>
  );
}
