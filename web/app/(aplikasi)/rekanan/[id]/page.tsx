import { ChevronLeft, Handshake, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Button } from "@/components/ui/button";
import { tautanWa } from "@/lib/hitung/ikut-menu-pesta";
import { JENIS_REKANAN, type JenisRekanan, LABEL_STATUS_FEE } from "@/lib/hitung/rekanan";
import { hariIniWib } from "@/lib/kalender";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { aksesPenuh, bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { orderRekanan, statistik } from "@/lib/rekanan";
import { rupiah } from "@/lib/uang";

import { AktifRekanan } from "../aktif-rekanan";
import { TombolBatalFee, TombolBayarFee } from "../bayar-fee";
import { TombolRekanan } from "../dialog-rekanan";

export const metadata: Metadata = { title: "Rekanan" };
export const dynamic = "force-dynamic";

const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const t = (s: string) => tgl.format(new Date(`${s}T00:00:00Z`));

/* Satu rekanan (D-132): statistik, order & Partner Fee per invoice (bayar setelah klien lunas), klien yang dibawa. */
export default async function HalamanDetailRekanan({ params }: PageProps<"/rekanan/[id]">) {
  const sesi = await wajibIzin("rekanan");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [r, order, atur] = await Promise.all([
    prisma.referral_partners.findUnique({ where: { id: BigInt(id) }, include: { customers: { orderBy: { name: "asc" }, select: { id: true, name: true } } } }),
    orderRekanan({ idRekanan: BigInt(id) }),
    bacaPengaturanBisnis(),
  ]);
  if (!r) notFound();
  const s = statistik(id, order, r.customers.map((c) => c.id.toString()));
  const klien = new Map<string, { id: string; nama: string; order: number }>();
  for (const c of r.customers) klien.set(c.id.toString(), { id: c.id.toString(), nama: c.name, order: 0 });
  for (const o of order) {
    const k = klien.get(o.customer.id) ?? { id: o.customer.id, nama: o.customer.nama, order: 0 };
    klien.set(o.customer.id, { ...k, order: k.order + 1 });
  }
  const bayar = bolehKelolaUang(sesi.peran);
  const pct = r.fee_pct === null ? atur.partner_fee_pct : Number(r.fee_pct);
  const persen = (n: number) => `${String(n).replace(".", ",")}%`;

  return (
    <Halaman>
      <Link href="/rekanan" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Rekanan
      </Link>
      <KepalaHalaman
        ikon={Handshake}
        judul={r.name}
        keterangan={[JENIS_REKANAN[r.kind as JenisRekanan] ?? r.kind, r.contact_name ? `PIC ${r.contact_name}` : null, `Partner Fee ${persen(pct)}${r.fee_pct === null ? " (bawaan)" : ""}`, r.active ? null : "nonaktif"].filter(Boolean).join(" · ")}
        aksi={
          <>
            {r.phone ? (
              <Button variant="outline" className="rounded-full bg-card" render={<a href={tautanWa(r.phone)} target="_blank" rel="noopener" />}>
                <MessageCircle className="size-4" />
                Chat WA
              </Button>
            ) : null}
            <TombolRekanan
              feeBawaan={atur.partner_fee_pct}
              rekanan={{ id, nama: r.name, jenis: r.kind, pic: r.contact_name ?? "", hp: r.phone ?? "", email: r.email ?? "", instagram: r.instagram ?? "", rekening: r.bank_account ?? "", feePct: r.fee_pct === null ? "" : String(Number(r.fee_pct)).replace(".", ","), catatan: r.notes ?? "" }}
            />
            <AktifRekanan id={id} aktif={r.active} />
          </>
        }
      />
      <PapanAngka kolom={3} className="mb-5">
        <KartuAngka label="Omzet" nilai={rupiah(s.omzet)} keterangan={`${s.klien} klien · ${s.order} order${s.terakhir ? ` · terakhir ${t(s.terakhir)}` : ""}`} />
        <KartuAngka label="Partner Fee siap dibayar" nilai={rupiah(s.siap)} nada={s.siap ? "perhatian" : "netral"} menonjol keterangan={s.menunggu ? `+ ${rupiah(s.menunggu)} menunggu klien lunas` : undefined} />
        <KartuAngka label="Partner Fee sudah dibayar" nilai={rupiah(s.dibayar)} />
      </PapanAngka>

      {r.bank_account || r.instagram || r.email || r.phone || r.notes ? (
        <p className="mb-5 rounded-[14px] border bg-card px-4 py-3 text-[0.9375rem]">
          {[r.bank_account ? `Rekening: ${r.bank_account}` : null, r.phone, r.instagram ? `IG ${r.instagram}` : null, r.email].filter(Boolean).join(" · ")}
          {r.notes ? <span className="block pt-1 text-sm whitespace-pre-wrap text-muted-foreground">{r.notes}</span> : null}
        </p>
      ) : null}

      <h2 className="eyebrow pb-2">Order &amp; Partner Fee</h2>
      <BingkaiTabel className="mb-6">
        {order.length ? (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th className="hidden text-right md:table-cell">Nilai makanan</Th>
                <Th className="text-right">Partner Fee</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {order.map((o) => (
                <tr key={o.idInvoice} className="border-b border-border-row align-top last:border-0">
                  <Td>
                    <Link href={`/tagihan/${o.idInvoice}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                      {o.nomor}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {t(o.tanggal)}
                      {o.acara ? ` · ${o.acara}` : ""}
                    </span>
                  </Td>
                  <Td>
                    <Link href={`/pelanggan/${o.customer.id}`} className="underline-offset-4 hover:underline">
                      {o.customer.nama}
                    </Link>
                  </Td>
                  <Td className="hidden text-right font-mono tabular-nums md:table-cell">{rupiah(o.nilaiMakanan)}</Td>
                  <Td className="text-right font-mono whitespace-nowrap tabular-nums">
                    {rupiah(o.fee.jumlah)}
                    <span className="block text-xs text-muted-foreground">{persen(o.fee.pct)}</span>
                  </Td>
                  <Td className="min-w-48">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pil nada={o.status === "dibayar" ? "baik" : o.status === "siap" ? "perhatian" : "netral"}>{LABEL_STATUS_FEE[o.status]}</Pil>
                      {o.dibayar ? (
                        <span className="text-xs text-muted-foreground">
                          {t(o.dibayar.tanggal)}
                          {o.dibayar.oleh ? ` · ${o.dibayar.oleh}` : ""}
                          {o.dibayar.bukti ? (
                            <>
                              {" · "}
                              <a href={`/rekanan/bukti/${o.idInvoice}`} target="_blank" rel="noopener" className="text-primary underline underline-offset-2">
                                bukti
                              </a>
                            </>
                          ) : null}
                        </span>
                      ) : null}
                      {o.status === "siap" && bayar ? <TombolBayarFee idInvoice={o.idInvoice} hariIni={hariIniWib()} jumlah={rupiah(o.fee.jumlah)} /> : null}
                      {o.status === "dibayar" && aksesPenuh(sesi.peran) ? <TombolBatalFee idInvoice={o.idInvoice} /> : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada order dari rekanan ini. Tandai rekanan di halaman Quotation / Invoice (kotak &quot;Rekanan&quot;).</p>
        )}
      </BingkaiTabel>

      <h2 className="eyebrow pb-2">Klien yang dibawa</h2>
      {klien.size ? (
        <ul className="flex flex-wrap gap-1.5">
          {[...klien.values()].map((k) => (
            <li key={k.id}>
              <Link href={`/pelanggan/${k.id}`} className="inline-flex min-h-9 items-center rounded-full border bg-card px-3.5 text-sm hover:bg-accent">
                {k.nama}
                {k.order ? <span className="ml-1 text-muted-foreground">· {k.order} order</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada. Tandai &quot;Dibawa oleh rekanan&quot; di form Customer.</p>
      )}
    </Halaman>
  );
}
