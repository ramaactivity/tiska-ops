import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bolehAbsenKloter } from "@/lib/honor-akses";
import { LABEL_HONOR, type StatusHonor } from "@/lib/hitung/honor";
import { PERAN_TUGAS, type PeranTugas } from "@/lib/hitung/penugasan";
import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";

import { AbsenKloter } from "./absen-kloter";

export const metadata: Metadata = { title: "Absen & DW" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/* Absen tim & DW oleh captain (08-TIM-PWA §8, D-091). Tanpa angka fee. */
export default async function HalamanAbsen({ params }: PageProps<"/beranda/absen/[kloter]">) {
  await wajibSesi();
  const { kloter } = await params;
  if (!/^\d+$/.test(kloter)) notFound();
  const k = BigInt(kloter);
  if (!(await bolehAbsenKloter(k))) notFound();
  const [kl, dwLama] = await Promise.all([
    prisma.event_kloters.findUnique({
      where: { id: k },
      include: {
        events: { select: { name: true } },
        event_assignments: { orderBy: [{ sort: "asc" }, { id: "asc" }], include: { users: { select: { name: true } } } },
      },
    }),
    // Daftar DW lama untuk dipilih ulang (nama + HP).
    prisma.event_assignments.findMany({
      where: { role: "dw", user_id: null, person_name: { not: null } },
      distinct: ["person_name"],
      orderBy: { id: "desc" },
      take: 100,
      select: { person_name: true, contact_phone: true },
    }),
  ]);
  if (!kl) notFound();
  const status = kl.event_assignments.find((a) => a.honor_status)?.honor_status as StatusHonor | undefined;

  return (
    <Halaman>
      <div className="mx-auto w-full max-w-[480px]">
        <Link href="/beranda" className="text-sm text-primary">
          ← Jadwal saya
        </Link>
        <KepalaHalaman ikon={ClipboardCheck} judul="Absen & DW" keterangan={`${kl.events.name} · ${hari.format(kl.date)} · kloter ${kl.no} (${kl.depart_time})`} />
        <AbsenKloter
          idKloter={kloter}
          terkirim={status ? LABEL_HONOR[status] : null}
          dwLama={dwLama.map((d) => ({ id: `${d.person_name}|${d.contact_phone ?? ""}`, label: d.person_name!, sub: d.contact_phone ?? undefined }))}
          anggota={kl.event_assignments.map((a) => ({
            id: a.id.toString(),
            nama: a.users?.name ?? a.person_name ?? "—",
            peran: a.role === "dw" && a.task_note ? `DW · ${a.task_note}` : (PERAN_TUGAS[a.role as PeranTugas] ?? a.role),
            dw: a.role === "dw" && !a.user_id,
            hadir: a.attended,
            datang: a.arrive_time ?? "",
            pulang: a.leave_time ?? "",
          }))}
        />
      </div>
    </Halaman>
  );
}
