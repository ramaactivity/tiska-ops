import { CircleAlert, CircleCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, StripRingkasan } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { ChipStatus } from "@/components/lencana-status";
import { SaringStatus } from "@/components/saring-status";
import { geserJam } from "@/lib/brief";
import { CARA_LAYANAN } from "@/lib/hitung/event";
import { peringatanEvent } from "@/lib/hitung/operasional";
import { ringkasanMalam, ringkasanPagi, ringkasanSore } from "@/lib/hitung/ringkasan-owner";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { STATUS_DAPUR, STATUS_KIRIM } from "@/lib/tim";
import { d, rupiah, teksJumlahBaris } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { JadwalPersiapan } from "./jadwal-persiapan";
import { RingkasanOwner } from "./ringkasan-owner";

export const metadata: Metadata = { title: "Operasional Hari Ini" };
export const dynamic = "force-dynamic";

const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/* Operasional Hari Ini (01-SPEC G, D-058): semua event hari ini & besok + peringatan. Owner/admin. */
export default async function HalamanOperasional({ searchParams }: PageProps<"/operasional">) {
  await wajibIzin("operasional");
  const { hari } = await searchParams;
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
      quotations: { select: { quotation_number: true, event_time: true } },
      event_items: { orderBy: { sort: "asc" }, select: { session_date: true, session_time: true, item_name: true, qty: true, unit: true, pax: true } },
      event_kloters: {
        where: { date: { in: tgl } },
        orderBy: [{ date: "asc" }, { no: "asc" }],
        include: { event_assignments: { select: { role: true, confirmed_at: true, person_name: true, users: { select: { name: true } } } }, kloter_tracking: { select: { status: true } } },
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
              catatan: k.note,
              adaCaptain: k.event_assignments.some((a) => a.role === "captain"),
              captain: (() => {
                const c = k.event_assignments.find((a) => a.role === "captain");
                return c ? (c.users?.name ?? c.person_name ?? null) : null;
              })(),
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
  // Ringkasan harian owner (D-093): satu generator untuk halaman ini & Hermes nanti.
  const [prMenunggu, honorKloter, hutangJatuhTempo] = await Promise.all([
    prisma.purchase_requests.count({ where: { status: "diajukan" } }),
    prisma.event_assignments.groupBy({ by: ["kloter_id"], where: { honor_status: "diajukan" } }),
    prisma.supplier_payables.count({ where: { status: "belum", due_date: { lte: tgl[0] } } }),
  ]);
  const tindakan = { prMenunggu, honorMenunggu: honorKloter.length, hutangJatuhTempo };
  const keRingkas = (b: (typeof bagian)[number]) =>
    b.daftar.map(({ e, kloter, peringatan }) => ({
      nama: e.name,
      pelanggan: e.customers.name,
      venue: e.venue,
      kloter: kloter.map((k) => ({ no: k.no, jam: k.jam, captain: k.captain, status: k.status })),
      peringatan,
    }));
  const jamWib = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(sekarang));
  const ringkasan = {
    malam: ringkasanMalam(besok, keRingkas(bagian[1]), tindakan),
    pagi: ringkasanPagi(hariIni, keRingkas(bagian[0])),
    sore: ringkasanSore(hariIni, keRingkas(bagian[0]), tindakan),
    bawaan: (jamWib < 11 ? "pagi" : jamWib < 18 ? "sore" : "malam") as "pagi" | "sore" | "malam",
  };
  const totalPeringatan = bagian.reduce((s, b) => s + b.daftar.reduce((x, d) => x + d.peringatan.length, 0), 0);
  const pilih = hari === "besok" ? bagian[1] : bagian[0];
  const kloterHari = (b: (typeof bagian)[number]) => b.daftar.flatMap((x) => x.kloter);
  const kHariIni = kloterHari(bagian[0]);
  const orang = kHariIni.reduce((s, k) => s + k.anggota, 0);
  const siap = kHariIni.reduce((s, k) => s + k.anggota - k.belumSiap, 0);
  const perlu = pilih.daftar.filter((x) => x.peringatan.length);
  const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(sekarang);

  // Jadwal persiapan dapur (07-BRIEF §5): satu sesi per kloter; tanpa kloter → per jam di isi event.
  const ringkasIsi = (items: (typeof pilih.daftar)[number]["items"]) =>
    items.map((i) => `${teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" })} ${i.item_name.replace(/^\[[^\]]*\]\s*/, "")}`).join(" & ");
  const jamDari = (t: string | null) => {
    const j = t?.match(/\d{1,2}[.:]\d{2}/)?.[0];
    return j ? geserJam(j, 0) : null;
  };
  const sesiPerEvent = pilih.daftar.map(({ e, kloter, items }) => {
    const ambil = e.service_mode === "ambil";
    if (kloter.length)
      return {
        nama: e.customers.name,
        sesi: kloter.map((k) => {
          // Menu kloter ini = yang jamnya sama dengan jam berangkat; kalau tidak ada, catatan kloter; terakhir semua menu.
          const cocok = items.filter((i) => jamDari(i.session_time) === geserJam(k.jam, 0));
          return { judul: `${e.customers.name}${kloter.length > 1 ? ` (kloter ${k.no})` : ""}`, siap: k.jam, ambil, packing: cocok.length ? ringkasIsi(cocok) : k.catatan || ringkasIsi(items) };
        }),
      };
    const perJam = new Map<string, typeof items>();
    for (const i of items) {
      // Acara satu hari menyimpan jamnya di quotation, bukan di isi event.
      const j = jamDari(i.session_time || e.quotations.event_time);
      if (j) perJam.set(j, [...(perJam.get(j) ?? []), i]);
    }
    return { nama: e.customers.name, sesi: [...perJam].map(([j, isi]) => ({ judul: e.customers.name, siap: j, ambil, packing: ringkasIsi(isi) })) };
  });
  const sesiPersiapan = sesiPerEvent.flatMap((x) => x.sesi).sort((a, b) => geserJam(a.siap, 0).localeCompare(geserJam(b.siap, 0)));
  const tanpaJam = sesiPerEvent.filter((x) => !x.sesi.length).map((x) => x.nama);

  // Panel kanan: yang menunggu keputusan owner & tagihan lewat jatuh tempo.
  const [tungguOwner, terlambat] = await Promise.all([
    prisma.quotations.findMany({
      where: { owner_approval: "perlu" },
      orderBy: { id: "desc" },
      take: 4,
      select: { id: true, quotation_number: true, grand_total: true, customers: { select: { name: true } } },
    }),
    prisma.invoices.findMany({
      where: { status: "overdue" },
      orderBy: { due_date: "asc" },
      take: 4,
      select: { id: true, invoice_number: true, grand_total: true, paid_amount: true, due_date: true, customers: { select: { name: true } } },
    }),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Truck}
        judul="Operasional Hari Ini"
        keterangan={`Semua event hari ini dan besok: tim, dapur, dan pengantaran. ${hariPanjang(hariIni)} · ${jam}.`}
      />

      <PapanAngka className="mb-5">
        <KartuAngka label="Event hari ini" nilai={String(bagian[0].daftar.length)} keterangan={`${bagian[1].daftar.length} event besok`} />
        <KartuAngka label="Kloter hari ini" nilai={String(kHariIni.length)} keterangan={`${kHariIni.filter((k) => k.kirim === "selesai").length} sudah selesai`} />
        <KartuAngka label="Tim siap" nilai={`${siap}/${orang}`} keterangan={orang ? "orang sudah menekan Siap 👍" : "Belum ada yang ditugaskan"} />
        <KartuAngka
          label="Perlu tindakan"
          nilai={String(totalPeringatan)}
          keterangan={totalPeringatan ? "Selesaikan sebelum jam berangkat" : "Semua aman"}
          nada={totalPeringatan ? "perhatian" : "info"}
        />
      </PapanAngka>

      <div className="pb-4">
        <SaringStatus
          parameter="hari"
          pilihan={[
            { nilai: "", label: "Hari ini", jumlah: bagian[0].daftar.length },
            { nilai: "besok", label: "Besok", jumlah: bagian[1].daftar.length },
          ]}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <StripRingkasan
            judul={hariPanjang(pilih.t)}
            isi={[
              ["Event", pilih.daftar.length],
              ["Kloter", kloterHari(pilih).length],
              ["Orang", kloterHari(pilih).reduce((s, k) => s + k.anggota, 0)],
              ["Selesai", kloterHari(pilih).filter((k) => k.kirim === "selesai").length],
            ]}
          />

          {perlu.length ? (
            <section className="overflow-hidden rounded-[14px] border border-perhatian-garis bg-card">
              <div className="flex flex-wrap items-baseline gap-2 border-b border-perhatian-garis bg-perhatian-halus px-4 py-3">
                <h2 className="eyebrow text-perhatian">Perlu tindakan</h2>
                <span className="font-mono text-sm font-semibold text-perhatian">{perlu.reduce((s, x) => s + x.peringatan.length, 0)}</span>
                <span className="text-sm text-perhatian">Selesaikan sebelum jam berangkat.</span>
              </div>
              <ul>
                {perlu.map(({ e, peringatan }) => (
                  <li key={e.id.toString()} className="flex items-start gap-3 border-b border-border-row px-4 py-3 last:border-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-perhatian-halus text-perhatian">
                      <CircleAlert className="size-[18px]" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.customers.name}</p>
                      <ul className="text-sm text-muted-foreground">
                        {peringatan.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <Link href={`/event/${e.id}`} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/70">
                      Buka event
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : pilih.daftar.length ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-info-garis bg-info-halus px-4 py-3 text-[0.9375rem] text-primary-strong">
              <CircleCheck className="size-5 shrink-0" />
              <span>
                <b className="font-semibold">Semua event {pilih.t === hariIni ? "hari ini" : "besok"} siap.</b> Tim sudah lengkap dan konfirmasi.
              </span>
            </div>
          ) : null}

          {pilih.daftar.length === 0 ? (
            <div className="rounded-[14px] border bg-card">
              <KeadaanKosong judul={`Tidak ada event ${pilih.t === hariIni ? "hari ini" : "besok"}.`} />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border bg-card">
              {pilih.daftar.map(({ e, kloter, items, peringatan }) => {
                const pertama = kloter[0];
                const status = peringatan.length
                  ? { label: "Perlu tindakan", nada: "perhatian" as const }
                  : kloter.length && kloter.every((k) => k.kirim === "selesai")
                    ? { label: "Selesai", nada: "lunas" as const }
                    : kloter.some((k) => k.kirim)
                      ? { label: "Di jalan", nada: "info" as const }
                      : { label: "Siap", nada: "netral" as const };
                return (
                  <li key={e.id.toString()} className="flex items-start gap-3 border-b border-border-row px-4 py-4 last:border-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/event/${e.id}`} className="text-[1.0625rem] font-medium hover:underline">
                        {e.customers.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {[CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN], e.venue].filter(Boolean).join(" · ")}
                        <span className="nomor-dokumen ml-2 text-subtle-foreground">{e.quotations.quotation_number}</span>
                      </p>
                      {items.length ? (
                        <p className="mt-1 text-sm">
                          {items.map((i) => `${i.item_name} ${Number(i.qty).toLocaleString("id-ID")} ${i.unit ?? ""}`.trim()).join(" · ")}
                        </p>
                      ) : null}
                      {kloter.length ? (
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {kloter.map((k) => (
                            <li key={k.no} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                              <span className="font-mono font-semibold">{k.jam}</span>
                              <span className="text-muted-foreground">Kloter {k.no}</span>
                              <span className="text-muted-foreground">
                                {k.anggota - k.belumSiap}/{k.anggota} siap
                              </span>
                              <Langkah status={k.status} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-mono text-[1.1875rem] font-semibold">{pertama?.jam ?? "—"}</span>
                      <ChipStatus label={status.label} nada={status.nada} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <RingkasanOwner {...ringkasan} />
          {pilih.daftar.length ? (
            <JadwalPersiapan tanggal={pilih.t} besok={pilih.t !== hariIni} pemesan={pilih.daftar.map(({ e }) => e.customers.name)} sesi={sesiPersiapan} tanpaJam={tanpaJam} />
          ) : null}
          <section className="rounded-[14px] border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2 pb-2">
              <h2 className="eyebrow">Menunggu persetujuan owner</h2>
              <span className="font-mono text-sm font-semibold">{tungguOwner.length}</span>
            </div>
            {tungguOwner.length ? (
              <ul className="flex flex-col divide-y divide-border-row">
                {tungguOwner.map((q) => (
                  <li key={q.id.toString()} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/penawaran/${q.id}`} className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{q.customers.name}</span>
                      <span className="nomor-dokumen block text-primary">{q.quotation_number}</span>
                    </Link>
                    <span className="uang shrink-0 text-sm">{rupiah(q.grand_total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada quotation yang menunggu.</p>
            )}
          </section>

          <section className="rounded-[14px] border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2 pb-2">
              <h2 className="eyebrow">Lewat jatuh tempo</h2>
              <Link href="/laporan/piutang" className="text-sm font-medium text-primary hover:underline">
                Kartu Piutang
              </Link>
            </div>
            {terlambat.length ? (
              <ul className="flex flex-col divide-y divide-border-row">
                {terlambat.map((t) => (
                  <li key={t.id.toString()} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/tagihan/${t.id}`} className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{t.customers.name}</span>
                      <span className="nomor-dokumen block text-primary">{t.invoice_number}</span>
                    </Link>
                    <span className="uang shrink-0 text-sm text-tempo">{rupiah(d(t.grand_total).minus(d(t.paid_amount)))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada invoice yang terlambat.</p>
            )}
          </section>
        </aside>
      </div>
    </Halaman>
  );
}

/** Enam titik progres per kloter: dimasak → packing → siap angkut → berangkat → sampai → selesai. */
const LANGKAH = [...STATUS_DAPUR, ...STATUS_KIRIM];
const NAMA_LANGKAH: Record<string, string> = { dimasak: "Dimasak", packing: "Packing", siap: "Siap angkut", berangkat: "Berangkat", tiba: "Sampai", selesai: "Selesai" };
function Langkah({ status }: { status: string[] }) {
  const terakhir = LANGKAH.reduce((n, s, i) => (status.includes(s) ? i : n), -1);
  return (
    <span className="flex items-center gap-1.5" aria-label={terakhir >= 0 ? `Tahap: ${NAMA_LANGKAH[LANGKAH[terakhir]]}` : "Belum mulai"}>
      {LANGKAH.map((s, i) => (
        <span key={s} title={NAMA_LANGKAH[s]} className={cn("h-1.5 w-5 rounded-full", i <= terakhir ? "bg-primary" : "bg-secondary")} />
      ))}
      <span className="text-xs text-muted-foreground">{terakhir >= 0 ? NAMA_LANGKAH[LANGKAH[terakhir]] : "Belum mulai"}</span>
    </span>
  );
}
