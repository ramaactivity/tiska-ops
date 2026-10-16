import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { SUMBER_LEAD, statusFollowup, TAHAP_AKTIF, TAHAP_LEAD, type TahapLead } from "@/lib/lead";
import { leadMiliknya } from "@/lib/lead-akses";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Pipeline lead (D-047). Bawaan: lead aktif, yang follow-up-nya lewat paling atas. */
export default async function HalamanLead({ searchParams }: PageProps<"/lead">) {
  const sesi = await wajibIzin("lead");
  const { cari, tahap } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = typeof tahap === "string" && tahap in TAHAP_LEAD ? tahap : "";

  const milik = leadMiliknya(sesi);
  const [daftar, hitung] = await Promise.all([
    prisma.leads.findMany({
      where: {
        ...milik,
        ...(saring ? { stage: saring } : { stage: { in: TAHAP_AKTIF } }),
        ...(kunci
          ? { OR: [{ name: { contains: kunci, mode: "insensitive" } }, { phone: { contains: kunci } }, { event_type: { contains: kunci, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: [{ next_followup_at: { sort: "asc", nulls: "last" } }, { updated_at: "desc" }],
      take: 200,
      include: { users_leads_owner_user_idTousers: { select: { name: true } } },
    }),
    prisma.leads.groupBy({ by: ["stage"], where: milik, _count: true }),
  ]);
  const jumlah = new Map(hitung.map((h) => [h.stage, h._count]));
  const aktif = TAHAP_AKTIF.reduce((s, t) => s + (jumlah.get(t) ?? 0), 0);

  return (
    <Halaman>
      <KepalaHalaman
        judul="Lead"
        keterangan="Calon customer dari chat pertama sampai acara selesai."
        aksi={
          <Button render={<Link href="/lead/baru" />}>
            <Plus className="size-4" />
            Lead baru
          </Button>
        }
      />
      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari nama, nomor HP, atau jenis acara…" />
        <SaringStatus
          parameter="tahap"
          pilihan={[
            { nilai: "", label: "Aktif", jumlah: aktif },
            ...(Object.entries(TAHAP_LEAD) as [TahapLead, string][]).map(([k, label]) => ({ nilai: k, label, jumlah: jumlah.get(k) ?? 0 })),
          ]}
        />
      </div>

      {daftar.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <KeadaanKosong
            judul={kunci || saring ? "Tidak ada lead yang cocok." : "Belum ada lead."}
            keterangan={kunci || saring ? "Coba ubah kata kunci atau tahapnya." : "Catat calon customer pertama dari WA atau Instagram."}
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {daftar.map((l) => {
            const fu = statusFollowup(l.next_followup_at, l.stage);
            return (
              <li key={l.id.toString()}>
                <Link href={`/lead/${l.id}`} className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{l.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {fu === "terlambat" ? <Pil nada="perhatian">Follow-up terlambat</Pil> : fu === "hari_ini" ? <Pil nada="perhatian">Follow-up hari ini</Pil> : null}
                      <Pil nada={l.stage === "selesai" ? "baik" : "netral"}>{TAHAP_LEAD[l.stage as TahapLead] ?? l.stage}</Pil>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[
                      l.event_type,
                      l.event_date ? tanggal.format(l.event_date) : null,
                      l.pax ? `${l.pax} pax` : null,
                      l.service_form,
                      l.location,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Detail acara belum diisi"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SUMBER_LEAD[l.source as keyof typeof SUMBER_LEAD] ?? l.source}
                    {l.next_followup_at ? ` · follow-up ${tanggal.format(l.next_followup_at)}` : ""}
                    {l.users_leads_owner_user_idTousers ? ` · ${l.users_leads_owner_user_idTousers.name}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Halaman>
  );
}
