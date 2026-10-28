import { ArrowLeft, Ban, CalendarCheck, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";
import { bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { briefJadwalTim, briefKonfirmasi, briefUpdate } from "@/lib/brief";
import { cariBentrok } from "@/lib/hitung/penugasan";

import { FormInfoEvent, PilihStatusEvent, SalinTeks, TombolPerbarui } from "./aksi-event";
import { type KloterTampil, PenugasanEvent } from "./penugasan";
import { PeralatanEvent } from "./peralatan-event";
import { KartuPembatalan } from "./kartu-pembatalan";
import { RekapEvent } from "./rekap-event";

export const metadata: Metadata = { title: "Detail event" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID");
const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function HalamanDetailEvent({ params }: PageProps<"/event/[id]">) {
  const sesi = await wajibIzin("event");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const e = await prisma.events.findFirst({
    where: { id: BigInt(id), ...eventMiliknya(sesi) },
    include: {
      customers: { select: { name: true } },
      quotations: { select: { id: true, quotation_number: true } },
      invoices: { select: { invoice_number: true } },
      event_items: { orderBy: { sort: "asc" } },
      event_changes: { orderBy: { change_no: "desc" }, include: { users: { select: { name: true } } } },
      basts: { orderBy: { signed_at: "asc" }, select: { id: true, bast_number: true, receiver_name: true, condition: true, note: true, signed_at: true, event_kloters: { select: { no: true } } } },
      event_kloters: {
        orderBy: [{ date: "asc" }, { no: "asc" }],
        include: {
          event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } },
          kloter_tracking: { orderBy: { at: "asc" }, include: { users: { select: { name: true } } } },
        },
      },
    },
  });
  if (!e) notFound();
  const ubah = bolehUbahEvent(sesi.peran);
  const terkunci = Boolean(e.lock_at && e.lock_at < new Date());
  const tgl = (t: Date) => t.toISOString().slice(0, 10);

  // Penugasan (D-051): tanggal event, kloter, orang & kendaraan, bentrok.
  const tanggalEvent = [...new Set([...e.event_items.map((i) => (i.session_date ? tgl(i.session_date) : null)), e.first_date ? tgl(e.first_date) : null].filter((x): x is string => Boolean(x)))].sort();
  const namaAnggota = (a: (typeof e.event_kloters)[number]["event_assignments"][number]) => a.users?.name ?? a.person_name ?? "?";
  const kloter: KloterTampil[] = e.event_kloters.map((k) => ({
    id: k.id.toString(),
    tanggal: tgl(k.date),
    no: k.no,
    jam: k.depart_time,
    catatan: k.note,
    lacak: k.kloter_tracking.map((x) => ({ id: x.id.toString(), status: x.status, jam: jamWib.format(x.at), foto: Boolean(x.photo_path), oleh: x.users?.name ?? null })),
    anggota: k.event_assignments.map((a) => ({ id: a.id.toString(), nama: namaAnggota(a), peran: a.role, kendaraan: a.vehicles?.name ?? null, tugas: a.task_note, siap: Boolean(a.confirmed_at) })),
  }));
  const [orang, kendaraan, tugasLain] = await Promise.all([
    prisma.users.findMany({ where: { is_active: true, role: { in: ["captain", "driver", "field", "dapur", "kepala_dapur", "gudang"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    prisma.vehicles.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    tanggalEvent.length
      ? prisma.event_kloters.findMany({
          where: { date: { in: tanggalEvent.map((t) => new Date(`${t}T00:00:00Z`)) } },
          include: { events: { select: { id: true, name: true, customers: { select: { name: true } }, quotations: { select: { quotation_number: true } } } }, event_assignments: { include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
  ]);
  const bentrok =
    cariBentrok(
      tugasLain.flatMap((k) =>
        k.event_assignments.map((a) => ({
          idEvent: k.events.id.toString(),
          namaEvent: `${k.events.customers.name} ${k.events.quotations.quotation_number}`,
          tanggal: tgl(k.date),
          kloter: k.no,
          jam: k.depart_time,
          orang: a.user_id ? `u:${a.user_id}` : `n:${(a.person_name ?? "").toLowerCase().trim()}`,
          namaOrang: a.users?.name ?? a.person_name ?? "?",
          kendaraan: a.vehicle_id?.toString() ?? null,
          namaKendaraan: a.vehicles?.name ?? null,
        })),
      ),
    ).get(e.id.toString()) ?? [];
  const briefTim = [...new Set(kloter.map((k) => k.tanggal))].map((t) => ({
    tanggal: t,
    teks: briefJadwalTim({
      judul: [e.customers.name, e.venue].filter(Boolean).join("-"),
      tanggal: t,
      picEo: e.eo_name,
      kloter: kloter.filter((k) => k.tanggal === t).map((k) => ({ no: k.no, jam: k.jam, catatan: k.catatan, anggota: k.anggota })),
    }),
  }));
  const brief = briefKonfirmasi({
    pemesan: e.customers.name,
    pic: e.pic_name,
    hp: e.pic_phone,
    acara: e.name === "Event" ? null : e.name,
    cara: e.service_mode as "antar" | "ambil" | "setup_service",
    venue: e.venue,
    alamat: e.address,
    catatan: null,
    items: e.event_items.map((it) => ({
      tanggal: it.session_date ? it.session_date.toISOString().slice(0, 10) : e.first_date ? e.first_date.toISOString().slice(0, 10) : null,
      sesi: it.session_label,
      jam: it.session_time,
      nama: it.item_name,
      qty: it.qty.toString(),
      unit: it.unit,
      pax: it.pax,
      isi: it.contents ? it.contents.split("\n") : [],
    })),
     berangkat: kloter.map((k) => ({ tanggal: k.tanggal, jam: k.jam })),
  });

  // Jadwal: dikelompokkan per tanggal, lalu per sesi (urutan masuk dipertahankan).
  const kelompok = new Map<string, typeof e.event_items>();
  for (const it of e.event_items) {
    // Baris tanpa sesi ikut tanggal acara pertama.
    const k = it.session_date ? it.session_date.toISOString().slice(0, 10) : e.first_date ? e.first_date.toISOString().slice(0, 10) : "";
    kelompok.set(k, [...(kelompok.get(k) ?? []), it]);
  }
  const urut = [...kelompok.entries()].sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"));

  return (
    <Halaman>
      <div className="pb-5">
        <Link href="/event" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Semua event
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarCheck className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-primary-strong sm:text-[1.875rem]">{e.customers.name}</h1>
            <Pil nada={e.status === "selesai" ? "baik" : "netral"}>{STATUS_EVENT[e.status as keyof typeof STATUS_EVENT] ?? e.status}</Pil>
            {e.change_count > 0 ? <Pil nada="perhatian">UPDATE ke-{e.change_count}</Pil> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[e.first_date ? hari.format(e.first_date) : null, e.name, CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN]].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Link href={`/penawaran/${e.quotations.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
              {e.quotations.quotation_number}
            </Link>
            {e.invoices ? ` · ${e.invoices.invoice_number}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {e.event_kloters.length === 0 ? (
            <Button variant="outline" className="rounded-full bg-card" render={<a href={`/event/${e.id}/delivery-order`} target="_blank" rel="noopener" />}>
              <FileText className="size-4" />
              Delivery order
            </Button>
          ) : null}
          {ubah ? <TombolPerbarui id={e.id.toString()} sumber={e.invoices ? "invoice" : "quotation"} /> : null}
        </div>
      </header>

      {e.lock_at ? (
        <p className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${terkunci ? "bg-muted/50" : "border-perhatian-garis bg-perhatian-halus text-perhatian"}`}>
          {terkunci
            ? `Perubahan porsi/menu sudah ditutup sejak ${waktu.format(e.lock_at)}. Perubahan sesudahnya harus disetujui owner dan tercatat sebagai UPDATE.`
            : `Batas perubahan porsi/menu: ${waktu.format(e.lock_at)} WIB.`}
        </p>
      ) : null}

      {e.status === "batal" ? (
        <KartuPembatalan idEvent={e.id} peran={sesi.peran} ubah={ubah} />
      ) : ubah ? (
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border bg-card p-4">
          <PilihStatusEvent id={e.id.toString()} status={e.status} />
          <Button variant="outline" size="sm" className="rounded-full text-destructive" render={<Link href={`/event/${e.id}/batal`} />}>
            <Ban className="size-4" />
            Batalkan event
          </Button>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {urut.map(([tgl, items]) => (
            <section key={tgl || "tanpa"} className="rounded-[14px] border bg-card p-5">
              <h2 className="eyebrow pb-3">{tgl ? hari.format(new Date(`${tgl}T00:00:00Z`)) : "Tanggal sesi belum diisi"}</h2>
              <ul className="flex flex-col gap-4">
                {items.map((it) => (
                  <li key={it.id.toString()} className="border-l-2 pl-3">
                    {it.session_label || it.session_time ? (
                      <p className="text-xs font-medium text-muted-foreground">{[it.session_label, it.session_time].filter(Boolean).join(" · ")}</p>
                    ) : null}
                    <p className="font-medium">{it.item_name}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {angka(it.qty)} {it.unit ?? ""}
                      {it.pax ? ` × ${it.pax} pax` : ""}
                      {Number(it.day) > 1 ? ` · ${angka(it.day)} hari` : ""}
                    </p>
                    {it.contents ? (
                      <ul className="mt-1 text-sm text-muted-foreground">
                        {it.contents.split("\n").map((m, i) => (
                          <li key={i}>– {m}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="rounded-[14px] border bg-card p-5">
            <h2 className="eyebrow pb-3">Penugasan tim & kendaraan</h2>
            {bentrok.length ? (
              <ul className="mb-3 flex flex-col gap-1 rounded-[12px] border border-perhatian-garis bg-perhatian-halus px-3 py-2 text-sm text-perhatian">
                {bentrok.map((b) => (
                  <li key={b}>⚠️ {b}</li>
                ))}
              </ul>
            ) : null}
            <PenugasanEvent
              idEvent={e.id.toString()}
              tanggal={tanggalEvent}
              kloter={kloter}
              orang={orang.map((o) => ({ id: o.id.toString(), label: `${o.name} · ${o.role}` }))}
              kendaraan={kendaraan.map((k) => ({ nilai: k.id.toString(), label: k.name }))}
              ubah={ubah}
            />
            {briefTim.map((b) => (
              <div key={b.tanggal} className="mt-4">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="text-sm font-medium">Brief Jadwal Tim Service · {hari.format(new Date(`${b.tanggal}T00:00:00Z`))}</span>
                  <SalinTeks teks={b.teks} />
                </div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-muted/50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{b.teks}</pre>
              </div>
            ))}
          </section>
          {e.basts.length ? (
            <section className="rounded-[14px] border bg-card p-5">
              <h2 className="eyebrow pb-3">BAST · serah terima</h2>
              <ul className="flex flex-col gap-3">
                {e.basts.map((b) => (
                  <li key={b.id.toString()} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="nomor-dokumen">{b.bast_number}</span> · kloter {b.event_kloters.no} · diterima <b>{b.receiver_name}</b> · {waktu.format(b.signed_at)}
                      {b.condition === "catatan" ? <span className="block text-perhatian">⚠️ {b.note}</span> : <span className="text-lunas"> · ✅ lengkap & baik</span>}
                    </span>
                    <Button variant="outline" size="sm" className="rounded-full" render={<a href={`/event/${e.id}/bast/${b.id}`} target="_blank" rel="noopener" />}>
                      <FileText className="size-4" />
                      Lihat / cetak
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <PeralatanEvent idEvent={e.id} tanggal={e.first_date} />
          <RekapEvent idEvent={e.id.toString()} status={e.recap_status} />
          {e.event_changes.length ? (
            <section className="rounded-[14px] border bg-card p-5">
              <h2 className="eyebrow pb-3">Riwayat perubahan</h2>
              <ol className="flex flex-col gap-3">
                {e.event_changes.map((c) => (
                  <li key={c.id.toString()} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Pil nada="perhatian">UPDATE ke-{c.change_no}</Pil>
                      {c.after_lock ? <Pil>sesudah batas</Pil> : null}
                      <span>
                        {waktu.format(c.created_at)}
                        {c.users ? ` · ${c.users.name}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line">{c.summary}</p>
                    <div className="mt-2">
                      <SalinTeks
                        label="Salin brief UPDATE"
                        teks={briefUpdate({ ke: c.change_no, pemesan: e.customers.name, acara: e.name === "Event" ? null : e.name, perubahan: c.summary })}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <section className="rounded-[14px] border bg-card p-5">
            <div className="flex items-center justify-between gap-2 pb-3">
              <h2 className="eyebrow">Brief grup tim</h2>
              <SalinTeks teks={brief} />
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl bg-muted/50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{brief}</pre>
            <p className="mt-2 text-xs text-muted-foreground">Format Konfirmasi New Order — tanpa harga. Salin lalu kirim ke grup WA Kitchen/Captain.</p>
          </section>
          <section className="rounded-[14px] border bg-card p-5">
            <h2 className="eyebrow pb-3">Info lokasi & PIC</h2>
            {ubah ? (
              <FormInfoEvent
                info={{
                  id: e.id.toString(),
                  service_mode: e.service_mode,
                  venue: e.venue ?? "",
                  address: e.address ?? "",
                  maps_url: e.maps_url ?? "",
                  pic_name: e.pic_name ?? "",
                  pic_phone: e.pic_phone ?? "",
                  eo_name: e.eo_name ?? "",
                  guest_count: e.guest_count?.toString() ?? "",
                  notes: e.notes ?? "",
                }}
              />
            ) : (
              <dl className="flex flex-col gap-2 text-sm">
                {(
                  [
                    ["Venue", e.venue],
                    ["Alamat", e.address],
                    ["PIC", [e.pic_name, e.pic_phone].filter(Boolean).join(" · ")],
                    ["EO / WO", e.eo_name],
                    ["Tamu", e.guest_count?.toString()],
                    ["Catatan", e.notes],
                  ] as [string, string | null | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right whitespace-pre-line">{v}</dd>
                    </div>
                  ))}
                {e.maps_url ? (
                  <a href={e.maps_url} target="_blank" rel="noopener" className="text-sm underline underline-offset-4">
                    Buka di Google Maps
                  </a>
                ) : null}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </Halaman>
  );
}
