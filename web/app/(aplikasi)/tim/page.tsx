import { Clock, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { ChipStatus } from "@/components/lencana-status";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { PERAN_TUGAS, type PeranTugas } from "@/lib/hitung/penugasan";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { STATUS_KIRIM } from "@/lib/tim";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tim" };
export const dynamic = "force-dynamic";

/** Bagian kerja per peran — pengelompokan di layar saja. */
const BAGIAN: Record<Peran, string> = {
  admin: "Kantor",
  owner: "Kantor",
  direksi: "Kantor",
  finance: "Kantor",
  sales: "Kantor",
  bizdev: "Kantor",
  cost: "Kantor",
  kepala_dapur: "Dapur",
  dapur: "Dapur",
  captain: "Event",
  field: "Event",
  driver: "Pengantaran",
  gudang: "Gudang",
};
const DAFTAR_BAGIAN = ["Kantor", "Dapur", "Event", "Pengantaran", "Gudang"];

type Tugas = { idEvent: string; event: string; kloter: number; jam: string; peran: string; kendaraan: string | null; kirim: string | null };

/* Tim (D-061): siapa saja yang punya akun + tugas hari ini dari penugasan kloter (D-051). Owner/admin. */
export default async function HalamanTim({ searchParams }: PageProps<"/tim">) {
  await wajibIzin("tim");
  const sp = await searchParams;
  const tab = sp.tab === "jadwal" ? "jadwal" : "";
  const bagian = typeof sp.bagian === "string" && DAFTAR_BAGIAN.includes(sp.bagian) ? sp.bagian : "";
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  const [pengguna, kloter] = await Promise.all([
    prisma.users.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true, created_at: true } }),
    prisma.event_kloters.findMany({
      where: { date: new Date(`${hariIni}T00:00:00Z`), events: { status: { not: "batal" } } },
      orderBy: [{ depart_time: "asc" }, { no: "asc" }],
      include: {
        events: { select: { id: true, name: true, venue: true, customers: { select: { name: true } } } },
        event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } },
        kloter_tracking: { select: { status: true } },
      },
    }),
  ]);

  const tugas = new Map<string, Tugas[]>();
  for (const k of kloter) {
    const kirim = [...STATUS_KIRIM].reverse().find((s) => k.kloter_tracking.some((t) => t.status === s)) ?? null;
    for (const a of k.event_assignments) {
      if (!a.user_id) continue;
      const id = a.user_id.toString();
      tugas.set(id, [
        ...(tugas.get(id) ?? []),
        {
          idEvent: k.events.id.toString(),
          event: k.events.venue || k.events.customers.name,
          kloter: k.no,
          jam: k.depart_time,
          peran: PERAN_TUGAS[a.role as PeranTugas] ?? a.role,
          kendaraan: a.vehicles?.name ?? null,
          kirim,
        },
      ]);
    }
  }

  const anggota = pengguna.map((u) => {
    const t = tugas.get(u.id.toString()) ?? [];
    const jalan = t.find((x) => x.kirim === "berangkat" || x.kirim === "tiba");
    const status = jalan
      ? { label: jalan.kirim === "tiba" ? "Di lokasi" : "Di jalan", nada: "info" as const }
      : t.some((x) => x.kirim !== "selesai")
        ? { label: "Bertugas", nada: "lunas" as const }
        : t.length
          ? { label: "Tugas selesai", nada: "netral" as const }
          : null;
    const peran = u.role as Peran;
    return { ...u, id: u.id.toString(), bagian: BAGIAN[peran] ?? "Kantor", label: LABEL_PERAN[peran] ?? u.role, tugas: t, status };
  });
  const tampil = bagian ? anggota.filter((a) => a.bagian === bagian) : anggota;
  const bertugas = anggota.filter((a) => a.tugas.length).length;
  const hariPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${hariIni}T00:00:00Z`),
  );

  return (
    <Halaman>
      <KepalaHalaman
        ikon={UsersRound}
        judul="Tim"
        jumlah={anggota.length}
        keterangan="Orang yang menjalankan kantor, dapur, pengantaran, dan event Tiska, beserta tugasnya hari ini."
        aksi={
          <>
            <Button variant="outline" render={<Link href="/operasional" />}>
              Atur jadwal
            </Button>
            <Button render={<Link href="/pengguna" />}>Tambah anggota</Button>
          </>
        }
      />

      <div className="pb-5">
        <SaringStatus
          parameter="tab"
          pilihan={[
            { nilai: "", label: "Anggota", jumlah: anggota.length },
            { nilai: "jadwal", label: "Jadwal hari ini", jumlah: kloter.length },
          ]}
        />
      </div>

      {tab === "jadwal" ? (
        <section>
          <p className="pb-3 text-[0.9375rem] font-semibold text-primary-strong">
            {hariPanjang} <span className="font-normal text-muted-foreground">· {bertugas} orang bertugas</span>
          </p>
          {kloter.length ? (
            <ul className="overflow-hidden rounded-[14px] border bg-card">
              {kloter.map((k) => (
                <li key={k.id.toString()} className="flex flex-col gap-2 border-b border-border-row px-4 py-3.5 last:border-0 sm:flex-row sm:items-start sm:gap-5">
                  <span className="w-16 shrink-0 font-mono text-lg font-semibold text-primary-strong">{k.depart_time}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/event/${k.events.id}`} className="font-medium hover:underline">
                      {k.events.venue || k.events.customers.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {k.events.customers.name} · kloter {k.no}
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5 sm:max-w-[55%] sm:justify-end">
                    {k.event_assignments.length ? (
                      k.event_assignments.map((a) => (
                        <li key={a.id.toString()} className="rounded-full bg-secondary px-2.5 py-1 text-[0.8125rem]">
                          <span className="font-medium">{a.users?.name ?? a.person_name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {PERAN_TUGAS[a.role as PeranTugas] ?? a.role}
                            {a.vehicles ? ` · ${a.vehicles.name}` : ""}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-perhatian">Belum ada anggota</li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[14px] border bg-card">
              <KeadaanKosong judul="Tidak ada kloter hari ini" keterangan="Jadwal tim dibuat dari halaman Event → Kloter & tim." />
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-4 [scrollbar-width:none]">
            {["", ...DAFTAR_BAGIAN].map((b) => {
              const n = b ? anggota.filter((a) => a.bagian === b).length : anggota.length;
              return (
                <Link
                  key={b || "semua"}
                  href={b ? `/tim?bagian=${b}` : "/tim"}
                  aria-current={bagian === b ? "true" : undefined}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    bagian === b ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b || "Semua"}
                  <span className={cn("font-mono text-xs", bagian === b ? "text-primary-foreground/80" : "text-subtle-foreground")}>{n}</span>
                </Link>
              );
            })}
          </div>
          {tampil.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {tampil.map((a) => (
                <article key={a.id} className="flex min-w-0 flex-col gap-3 rounded-[14px] border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.9375rem] font-semibold text-primary-strong">
                      {a.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    {a.status ? <ChipStatus label={a.status.label} nada={a.status.nada} /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.label}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-[0.8125rem]">
                    <div className="min-w-0">
                      <dt className="text-xs text-subtle-foreground">Bagian</dt>
                      <dd className="truncate font-medium">{a.bagian}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-subtle-foreground">Bergabung</dt>
                      <dd className="truncate font-medium">
                        {a.created_at ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(a.created_at) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-1 border-t border-border-row pt-2.5 text-[0.8125rem] text-muted-foreground">
                    {a.tugas.length ? (
                      a.tugas.map((t) => (
                        <Link key={`${t.idEvent}-${t.kloter}`} href={`/event/${t.idEvent}`} className="flex min-w-0 items-center gap-1.5 hover:text-foreground">
                          <Clock className="size-4 shrink-0 text-subtle-foreground" strokeWidth={1.75} />
                          <span className="truncate">
                            <b className="font-mono font-semibold text-foreground">{t.jam}</b> · {t.event} · {t.peran}
                            {t.kendaraan ? ` · ${t.kendaraan}` : ""}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4 shrink-0 text-subtle-foreground" strokeWidth={1.75} />
                        Tidak ada tugas event hari ini
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border bg-card">
              <KeadaanKosong judul="Belum ada anggota di bagian ini" keterangan="Tambahkan akunnya lewat menu User." />
            </div>
          )}
        </section>
      )}
    </Halaman>
  );
}
