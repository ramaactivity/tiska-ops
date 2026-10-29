import { Coins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { feeUsulan, statusKerja, STATUS_KERJA } from "@/lib/hitung/honor";
import { PERAN_TUGAS, type PeranTugas } from "@/lib/hitung/penugasan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { BayarKloter, FormTarif, KunciKloter, PilihStatusKerja } from "./kelola-honor";

export const metadata: Metadata = { title: "Honor & DW" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const TAB = { "": "Perlu dikunci", bayar: "Belum dibayar", lunas: "Sudah dibayar", tarif: "Tarif & status kerja" } as const;
const STATUS_TAB = { "": "diajukan", bayar: "dikunci", lunas: "dibayar" } as const;

/* Honor tim & DW (D-091): absen captain → Finance kunci fee → tandai dibayar. */
export default async function HalamanHonor({ searchParams }: PageProps<"/honor">) {
  await wajibIzin("honor");
  const { tab: t } = await searchParams;
  const tab = (typeof t === "string" && t in TAB ? t : "") as keyof typeof TAB;
  const hitung = await prisma.event_assignments.groupBy({ by: ["honor_status"], where: { honor_status: { not: null } }, _count: true });
  const jumlah = new Map(hitung.map((h) => [h.honor_status, h._count]));
  const tarif = await prisma.honor_rates.findMany();

  let isi: React.ReactNode;
  if (tab === "tarif") {
    const tim = await prisma.users.findMany({
      where: { is_active: true, role: { in: ["captain", "driver", "field", "dapur", "kepala_dapur", "gudang"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, employment_type: true },
    });
    isi = (
      <div className="flex flex-col gap-4">
        <FormTarif
          peran={Object.entries(PERAN_TUGAS).map(([k, v]) => ({ kunci: k, label: v }))}
          tarif={tarif.map((x) => ({ peran: x.role, status: x.employment, jumlah: Number(x.amount) }))}
        />
        <section className="rounded-[14px] border bg-card">
          <h2 className="eyebrow border-b p-4">Status kerja tim lapangan</h2>
          <p className="px-4 pt-3 text-sm text-muted-foreground">Menentukan tarif yang dipakai. DW tanpa akun selalu dihitung {STATUS_KERJA.freelance}.</p>
          <ul className="divide-y">
            {tim.map((u) => (
              <li key={u.id.toString()} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  {u.name} <span className="text-xs text-muted-foreground">· {u.role}</span>
                </span>
                <PilihStatusKerja id={u.id.toString()} status={u.employment_type === "freelance" ? "freelance" : "tetap"} />
              </li>
            ))}
            {!tim.length ? <li className="p-4 text-sm text-muted-foreground">Belum ada akun tim lapangan.</li> : null}
          </ul>
        </section>
      </div>
    );
  } else {
    const status = STATUS_TAB[tab];
    const baris = await prisma.event_assignments.findMany({
      where: { honor_status: status },
      orderBy: [{ kloter_id: "asc" }, { sort: "asc" }, { id: "asc" }],
      include: {
        users: { select: { name: true, employment_type: true } },
        event_kloters: { select: { id: true, no: true, date: true, depart_time: true, events: { select: { id: true, name: true } }, retail_programs: { select: { id: true } } } },
        users_event_assignments_paid_byTousers: { select: { name: true } },
      },
      take: 500,
    });
    const perKloter = new Map<string, typeof baris>();
    for (const b of baris) perKloter.set(b.kloter_id.toString(), [...(perKloter.get(b.kloter_id.toString()) ?? []), b]);
    isi = !perKloter.size ? (
      <div className="rounded-[14px] border bg-card">
        <KeadaanKosong judul={tab === "" ? "Tidak ada absen yang menunggu." : tab === "bayar" ? "Semua honor yang dikunci sudah dibayar." : "Belum ada honor yang dibayar."} keterangan="Captain mengirim absen & DW dari HP (Jadwal saya → Absen & DW)." />
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {[...perKloter.entries()].map(([kid, rows]) => {
          const k = rows[0].event_kloters;
          const total = rows.reduce((s, r) => s + Number(r.fee ?? 0), 0);
          const data = rows.map((r) => {
            const sk = statusKerja(Boolean(r.user_id), r.users?.employment_type ?? null);
            return {
              id: r.id.toString(),
              nama: r.users?.name ?? r.person_name ?? "—",
              peran: r.role === "dw" && r.task_note ? `DW · ${r.task_note}` : (PERAN_TUGAS[r.role as PeranTugas] ?? r.role),
              statusKerja: STATUS_KERJA[sk],
              hadir: r.attended,
              jam: r.attended ? [r.arrive_time, r.leave_time].filter(Boolean).join("–") : "",
              hp: r.contact_phone,
              fee: r.fee != null ? Number(r.fee) : feeUsulan(tarif, r.role, sk, r.attended),
              catatan: r.fee_note ?? "",
              dibayar: r.paid_at ? `${hari.format(r.paid_at)}${r.users_event_assignments_paid_byTousers ? ` · ${r.users_event_assignments_paid_byTousers.name}` : ""}` : null,
              bukti: r.proof_path ? `/honor/bukti/${r.id}` : null,
            };
          });
          return (
            <section key={kid} className="rounded-[14px] border bg-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b p-4">
                <Link href={k.retail_programs ? `/ikut-menu-pesta/${k.retail_programs.id}` : `/event/${k.events.id}`} className="font-medium underline-offset-4 hover:underline">
                  {k.retail_programs ? "Antar Ikut Menu Pesta" : k.events.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {hari.format(k.date)} · kloter {k.no} ({k.depart_time}) · total {rupiah(total)}
                </span>
              </div>
              {tab === "" ? <KunciKloter idKloter={kid} baris={data} /> : <BayarKloter baris={data} bisaBayar={tab === "bayar"} />}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <Halaman>
      <KepalaHalaman ikon={Coins} judul="Honor & DW" keterangan="Captain mengirim absen & DW dari HP → Finance mengunci fee (usulan dari tarif) → tandai sudah dibayar + bukti. Honor = biaya event." />
      <div className="pb-4">
        <SaringStatus
          parameter="tab"
          pilihan={(Object.entries(TAB) as [keyof typeof TAB, string][]).map(([k, label]) => ({
            nilai: k,
            label,
            jumlah: k === "tarif" ? tarif.length : (jumlah.get(STATUS_TAB[k as keyof typeof STATUS_TAB]) ?? 0),
          }))}
        />
      </div>
      {isi}
    </Halaman>
  );
}
