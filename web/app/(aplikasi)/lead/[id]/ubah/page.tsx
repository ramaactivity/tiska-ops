import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { leadMiliknya } from "@/lib/lead-akses";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormLead } from "../../form-lead";

export const metadata: Metadata = { title: "Ubah lead" };
export const dynamic = "force-dynamic";

const tgl = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : "");

export default async function HalamanUbahLead({ params }: PageProps<"/lead/[id]/ubah">) {
  const sesi = await wajibIzin("lead");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const l = await prisma.leads.findFirst({ where: { id: BigInt(id), ...leadMiliknya(sesi) } });
  if (!l) notFound();
  return (
    <Halaman>
      <KepalaHalaman ikon={Inbox} judul={`Ubah lead ${l.name}`} />
      <FormLead
        batalHref={`/lead/${l.id}`}
        isi={{
          id: l.id.toString(),
          name: l.name,
          phone: l.phone ?? "",
          source: l.source,
          event_type: l.event_type ?? "",
          event_date: tgl(l.event_date),
          location: l.location ?? "",
          pax: l.pax?.toString() ?? "",
          service_form: l.service_form ?? "",
          budget: l.budget ?? "",
          next_followup_at: tgl(l.next_followup_at),
          notes: l.notes ?? "",
        }}
      />
    </Halaman>
  );
}
