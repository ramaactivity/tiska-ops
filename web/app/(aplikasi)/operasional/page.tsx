import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { CARA_LAYANAN } from "@/lib/hitung/event";
import { peringatanEvent } from "@/lib/hitung/operasional";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { LABEL_STATUS_DAPUR, LABEL_STATUS_KIRIM, STATUS_DAPUR, STATUS_KIRIM } from "@/lib/tim";

export const metadata: Metadata = { title: "Operasional Hari Ini" };
export const dynamic = "force-dynamic";

const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/* Operasional Hari Ini (01-SPEC G, D-058): semua event hari ini & besok + peringatan. Owner/admin. */
export default async function HalamanOperasional() {
  await wajibIzin("operasional");
  const sekarang = new Date();
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(sekarang);
  const besok = new Date(Date.parse(`${hariIni}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const tgl = [hariIni, besok].map((t) => new Date(`${t}T00:00:00Z`));
  const iso = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);

  const event = await prisma.events.findMany({
    where: {
      status: { not: "batal" },
      OR: [{ first_date: { in: tgl } }, { event_items: { some: { session_date: { in: tgl } } } }, { event_kloters: { some: { date: { in: tgl } } } }],
    },
    include: {
      customers: { select: { name: true } },
      quotations: { select: { quotation_number: true } },
      event_items: { select: { session_date: true, item_name: true, qty: true, unit: true } },
      event_kloters: {
        where: { date: { in: tgl } },
        orderBy: [{ date: "asc" }, { no: "asc" }],
        include: { event_assignments: { select: { role: true, confirmed_at: true } }, kloter_tracking: { select: { status: true } } },
      },
    },
  });

  const bagian = [hariIni, besok].map((t) => {
    const daftar = event
      .filter((e) => iso(e.first_date) === t || e.event_items.some((i) => iso(i.session_date) === t) || e.event_kloters.some((k) => iso(k.date) === t))
      .map((e) => {
        const kloter = e.event_kloters
          .filter((k) => iso(k.date) === t)
          .map((k) => {
            const status = k.kloter_tracking.map((x) => x.status);
            return {
              no: k.no,
              jam: k.depart_time,
              adaCaptain: k.event_assignments.some((a) => a.role === "captain"),
              anggota: k.event_assignments.length,
              belumSiap: k.event_assignments.filter((a) => !a.confirmed_at).length,
              status,
              dapur: [...STATUS_DAPUR].reverse().find((s) => status.includes(s)),
              kirim: [...STATUS_KIRIM].reverse().find((s) => status.includes(s)),
            };
          });
        const items = e.event_items.filter((i) => (iso(i.session_date) ?? iso(e.first_date)) === t);
        return { e, kloter, items, peringatan: peringatanEvent({ tanggal: t, kloter, status: e.status }, sekarang) };
      })
      .sort((a, b) => (a.kloter[0]?.jam ?? "99").localeCompare(b.kloter[0]?.jam ?? "99"));
    return { t, daftar };
  });
  const totalPeringatan = bagian.reduce((s, b) => s + b.daftar.reduce((x, d) => x + d.peringatan.length, 0), 0);

  return (
    <Halaman>
      <KepalaHalaman
        judul="Operasional Hari Ini"
        keterangan={`${bagian[0].daftar.length} event hari ini · ${bagian[1].daftar.length} besok · ${totalPeringatan ? `${totalPeringatan} peringatan` : "tanpa peringatan"}`}
      />
      <div className="flex flex-col gap-8">
        {bagian.map(({ t, daftar }) => (
          <section key={t} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">
              {t === hariIni ? "Hari ini" : "Besok"} · {hariPanjang(t)}
            </h2>
            {daftar.length === 0 ? (
              <div className="rounded-2xl border bg-card">
                <KeadaanKosong judul="Tidak ada event." />
              </div>
            ) : (
              daftar.map(({ e, kloter, items, peringatan }) => (
                <article key={e.id.toString()} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/event/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                      {e.customers.name}
                    </Link>
                    <span className="nomor-dokumen text-xs text-muted-foreground">{e.quotations.quotation_number}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN], e.venue, items.map((i) => `${i.item_name} ${Number(i.qty).toLocaleString("id-ID")} ${i.unit ?? ""}`.trim()).join(" · ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {kloter.length ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {kloter.map((k) => (
                        <li key={k.no} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold tabular-nums">⏰ {k.jam}</span>
                          <span>Kloter {k.no}</span>
                          <span className="text-muted-foreground">
                            👥 {k.anggota - k.belumSiap}/{k.anggota} siap
                          </span>
                          {k.dapur ? <Pil>{LABEL_STATUS_DAPUR[k.dapur]}</Pil> : null}
                          {k.kirim ? <Pil nada="baik">{LABEL_STATUS_KIRIM[k.kirim]}</Pil> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {peringatan.length ? (
                    <ul className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {peringatan.map((p) => (
                        <li key={p}>⚠️ {p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">✅ Aman</p>
                  )}
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </Halaman>
  );
}
