import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const metadata: Metadata = { title: "Event" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Daftar event (D-049): bawaan mendatang (hari ini ke depan), terdekat dulu. */
export default async function HalamanEvent({ searchParams }: PageProps<"/event">) {
  const sesi = await wajibIzin("event");
  const { lihat } = await searchParams;
  const mode = lihat === "lalu" || lihat === "semua" ? lihat : "mendatang";
  const hariIni = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())}T00:00:00Z`);

  const daftar = await prisma.events.findMany({
    where: {
      ...eventMiliknya(sesi),
      ...(mode === "mendatang" ? { OR: [{ first_date: { gte: hariIni } }, { first_date: null }], status: { notIn: ["selesai", "batal"] } } : {}),
      ...(mode === "lalu" ? { first_date: { lt: hariIni } } : {}),
    },
    orderBy: [{ first_date: mode === "lalu" ? "desc" : "asc" }, { id: "asc" }],
    take: 200,
    include: { customers: { select: { name: true } }, quotations: { select: { quotation_number: true } }, _count: { select: { event_items: true } } },
  });

  return (
    <Halaman>
      <KepalaHalaman judul="Event" keterangan="Pesanan yang sudah disetujui customer — jadwal, isi menu, dan batas perubahan. Tanpa harga." />
      <div className="pb-4">
        <SaringStatus
          parameter="lihat"
          pilihan={[
            { nilai: "", label: "Mendatang" },
            { nilai: "lalu", label: "Sudah lewat" },
            { nilai: "semua", label: "Semua" },
          ]}
        />
      </div>
      {daftar.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <KeadaanKosong judul="Belum ada event." keterangan="Event dibuat dari quotation yang sudah disetujui — tombol “Buat event” di halaman quotation." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {daftar.map((e) => {
            const terkunci = e.lock_at && e.lock_at < new Date();
            return (
              <li key={e.id.toString()}>
                <Link href={`/event/${e.id}`} className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {e.first_date ? tanggal.format(e.first_date) : "Tanggal belum ada"} · {e.customers.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {terkunci ? <Pil>Perubahan ditutup</Pil> : null}
                      {e.change_count > 0 ? <Pil nada="perhatian">UPDATE ke-{e.change_count}</Pil> : null}
                      <Pil nada={e.status === "selesai" ? "baik" : "netral"}>{STATUS_EVENT[e.status as keyof typeof STATUS_EVENT] ?? e.status}</Pil>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[e.name, CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN], e.guest_count ? `${e.guest_count} tamu` : null, e.venue, `${e._count.event_items} item`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="nomor-dokumen text-xs text-muted-foreground">{e.quotations.quotation_number}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Halaman>
  );
}
