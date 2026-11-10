import { Tent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { hariIniWib } from "@/lib/kalender";
import { JENIS_SEWA, type JenisSewa } from "@/lib/hitung/sewa";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { FormSewa, TombolBatalSewa } from "./form-sewa";

export const metadata: Metadata = { title: "Biaya Sewa" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Biaya Sewa per event (D-147): Tiya mencatat, langsung jadi biaya nyata di Margin event-nya. */
export default async function HalamanBiayaSewa() {
  await wajibIzin("biaya-sewa");
  const hariIni = hariIniWib();
  const sejak = new Date(Date.parse(`${hariIni}T00:00:00Z`) - 60 * 86_400_000);
  const [event, riwayat] = await Promise.all([
    prisma.events.findMany({
      where: { status: { not: "batal" }, OR: [{ first_date: null }, { first_date: { gte: sejak } }] },
      orderBy: [{ first_date: "desc" }, { id: "desc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        first_date: true,
        customers: { select: { name: true } },
        invoices: { select: { invoice_number: true } },
        event_equipment: { where: { equipment_id: null, rental_cost: { gt: 0 } }, select: { item_name: true, vendor_name: true, rental_cost: true } },
      },
    }),
    prisma.rental_costs.findMany({
      orderBy: [{ paid_at: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        kind: true,
        vendor: true,
        paid_at: true,
        amount: true,
        note: true,
        proof_paths: true,
        status: true,
        cancel_reason: true,
        users_rental_costs_created_byTousers: { select: { name: true } },
        events: { select: { id: true, name: true, invoices: { select: { id: true, invoice_number: true } } } },
      },
    }),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Tent}
        judul="Biaya Sewa"
        keterangan="Sewa alat makan, tenda, kendaraan, venue, dekorasi untuk event tertentu. Begitu disimpan, langsung masuk sebagai biaya nyata di laporan Margin event itu."
      />
      <div className="flex flex-col gap-5">
        <FormSewa
          hariIni={hariIni}
          event={event.map((e) => ({
            id: e.id.toString(),
            label: e.name,
            sub: [e.customers.name, e.first_date ? hari.format(e.first_date) : null, e.invoices?.invoice_number].filter(Boolean).join(" · "),
            invoice: e.invoices?.invoice_number ?? null,
            sewaAlat: e.event_equipment.map((a) => ({ nama: a.item_name, vendor: a.vendor_name, biaya: Number(a.rental_cost) })),
          }))}
        />

        <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="eyebrow border-b p-4">Riwayat · 100 terakhir</h2>
          {!riwayat.length ? (
            <KeadaanKosong judul="Belum ada biaya sewa." keterangan="Catat lewat form di atas." />
          ) : (
            <ul className="divide-y">
              {riwayat.map((s) => (
                <li key={s.id.toString()} className={`flex flex-wrap items-start gap-x-4 gap-y-2 p-4 ${s.status === "batal" ? "opacity-60" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {JENIS_SEWA[s.kind as JenisSewa]?.label ?? s.kind}
                      {s.vendor ? <span className="font-normal text-muted-foreground"> · {s.vendor}</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Link href={`/event/${s.events.id}`} className="underline-offset-4 hover:underline">
                        {s.events.name}
                      </Link>
                      {s.events.invoices ? (
                        <>
                          {" · "}
                          <Link href={`/tagihan/${s.events.invoices.id}/margin`} className="font-mono underline-offset-4 hover:underline">
                            Margin {s.events.invoices.invoice_number}
                          </Link>
                        </>
                      ) : (
                        <span className="text-perhatian"> · belum ada invoice</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[`Dibayar ${hari.format(s.paid_at)}`, s.users_rental_costs_created_byTousers?.name, s.note].filter(Boolean).join(" · ")}
                    </p>
                    {(s.proof_paths as string[]).length ? (
                      <p className="flex gap-2 pt-1 text-xs">
                        {(s.proof_paths as string[]).map((_, i) => (
                          <a key={i} href={`/biaya-sewa/bukti/${s.id}/${i}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            Bukti {i + 1}
                          </a>
                        ))}
                      </p>
                    ) : null}
                    {s.status === "batal" ? <p className="pt-1 text-xs">Dibatalkan: {s.cancel_reason}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono tabular-nums ${s.status === "batal" ? "line-through" : ""}`}>{rupiah(s.amount)}</span>
                    {s.status === "batal" ? <Pil nada="netral">Batal</Pil> : <TombolBatalSewa id={s.id.toString()} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Halaman>
  );
}
