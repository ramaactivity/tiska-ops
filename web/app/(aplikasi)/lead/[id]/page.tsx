import { ArrowLeft, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { JENIS_AKTIVITAS, statusFollowup, SUMBER_LEAD, TAHAP_LEAD, type TahapLead } from "@/lib/lead";
import { leadMiliknya } from "@/lib/lead-akses";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { CatatAktivitas, PilihTahap, TombolBuatQuotation } from "./aksi-lead";

export const metadata: Metadata = { title: "Detail lead" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function HalamanDetailLead({ params }: PageProps<"/lead/[id]">) {
  const sesi = await wajibIzin("lead");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const l = await prisma.leads.findFirst({
    where: { id: BigInt(id), ...leadMiliknya(sesi) },
    include: {
      quotations: { select: { id: true, quotation_number: true, status: true } },
      customers: { select: { name: true, customer_code: true } },
      users_leads_owner_user_idTousers: { select: { name: true } },
      lead_activities: { orderBy: { created_at: "desc" }, include: { users: { select: { name: true } } } },
    },
  });
  if (!l) notFound();
  const fu = statusFollowup(l.next_followup_at, l.stage);
  const info: [string, string | null][] = [
    ["No. HP / WA", l.phone],
    ["Dari", SUMBER_LEAD[l.source as keyof typeof SUMBER_LEAD] ?? l.source],
    ["Jenis acara", l.event_type],
    ["Tanggal acara", l.event_date ? tanggal.format(l.event_date) : null],
    ["Lokasi", l.location],
    ["Perkiraan tamu", l.pax ? `${l.pax} pax` : null],
    ["Bentuk", l.service_form],
    ["Budget", l.budget],
    ["Dipegang", l.users_leads_owner_user_idTousers?.name ?? null],
    ["Customer", l.customers ? `${l.customers.name} (${l.customers.customer_code})` : null],
  ];

  return (
    <Halaman>
      <div className="pb-5">
        <Link href="/lead" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" />
          Semua lead
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{l.name}</h1>
            <Pil nada={l.stage === "selesai" ? "baik" : "netral"}>{TAHAP_LEAD[l.stage as TahapLead] ?? l.stage}</Pil>
            {fu ? <Pil nada="perhatian">{fu === "terlambat" ? "Follow-up terlambat" : "Follow-up hari ini"}</Pil> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {l.next_followup_at ? `Follow-up ${tanggal.format(l.next_followup_at)}` : "Belum ada jadwal follow-up"}
            {l.stage === "batal" && l.lost_reason ? ` · batal: ${l.lost_reason}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/lead/${l.id}/ubah`} />}>
            <PencilLine className="size-4" />
            Ubah
          </Button>
          {l.quotations ? (
            <Button size="sm" variant="outline" render={<Link href={`/penawaran/${l.quotations.id}`} />}>
              {l.quotations.quotation_number}
            </Button>
          ) : (
            <TombolBuatQuotation id={l.id.toString()} />
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="pb-3 text-sm font-semibold">Tahap</h2>
            <PilihTahap id={l.id.toString()} tahap={l.stage} />
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="pb-3 text-sm font-semibold">Catat aktivitas</h2>
            <CatatAktivitas id={l.id.toString()} />
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="pb-3 text-sm font-semibold">Riwayat</h2>
            {l.lead_activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {l.lead_activities.map((a) => (
                  <li key={a.id.toString()} className="border-l-2 pl-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Pil>{a.kind === "tahap" ? "Tahap" : (JENIS_AKTIVITAS[a.kind as keyof typeof JENIS_AKTIVITAS] ?? a.kind)}</Pil>
                      <span>
                        {waktu.format(a.created_at)}
                        {a.users ? ` · ${a.users.name}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-line">{a.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <dl className="flex flex-col gap-2 text-sm">
              {info
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
            </dl>
            {l.notes ? <p className="mt-3 border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">{l.notes}</p> : null}
          </section>
        </aside>
      </div>
    </Halaman>
  );
}
