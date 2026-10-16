import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil } from "@/components/halaman";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";
import { bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { briefKonfirmasi, briefUpdate } from "@/lib/brief";

import { FormInfoEvent, PilihStatusEvent, SalinTeks, TombolPerbarui } from "./aksi-event";

export const metadata: Metadata = { title: "Detail event" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID");

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
    },
  });
  if (!e) notFound();
  const ubah = bolehUbahEvent(sesi.peran);
  const terkunci = Boolean(e.lock_at && e.lock_at < new Date());
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
  });

  // Jadwal: dikelompokkan per tanggal, lalu per sesi (urutan masuk dipertahankan).
  const kelompok = new Map<string, typeof e.event_items>();
  for (const it of e.event_items) {
    const k = it.session_date ? it.session_date.toISOString().slice(0, 10) : "";
    kelompok.set(k, [...(kelompok.get(k) ?? []), it]);
  }
  const urut = [...kelompok.entries()].sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"));

  return (
    <Halaman>
      <div className="pb-5">
        <Link href="/event" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" />
          Semua event
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{e.customers.name}</h1>
            <Pil nada={e.status === "selesai" ? "baik" : "netral"}>{STATUS_EVENT[e.status as keyof typeof STATUS_EVENT] ?? e.status}</Pil>
            {e.change_count > 0 ? <Pil nada="perhatian">UPDATE ke-{e.change_count}</Pil> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[e.first_date ? hari.format(e.first_date) : null, e.name, CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN]].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Link href={`/penawaran/${e.quotations.id}`} className="nomor-dokumen underline-offset-4 hover:underline">
              {e.quotations.quotation_number}
            </Link>
            {e.invoices ? ` · ${e.invoices.invoice_number}` : ""}
          </p>
        </div>
        {ubah ? <TombolPerbarui id={e.id.toString()} sumber={e.invoices ? "invoice" : "quotation"} /> : null}
      </header>

      {e.lock_at ? (
        <p className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${terkunci ? "bg-muted/50" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>
          {terkunci
            ? `Perubahan porsi/menu sudah ditutup sejak ${waktu.format(e.lock_at)}. Perubahan sesudahnya harus disetujui owner dan tercatat sebagai UPDATE.`
            : `Batas perubahan porsi/menu: ${waktu.format(e.lock_at)} WIB.`}
        </p>
      ) : null}

      {ubah ? (
        <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
          <PilihStatusEvent id={e.id.toString()} status={e.status} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {urut.map(([tgl, items]) => (
            <section key={tgl || "tanpa"} className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="pb-3 text-sm font-semibold">{tgl ? hari.format(new Date(`${tgl}T00:00:00Z`)) : "Tanggal sesi belum diisi"}</h2>
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
          {e.event_changes.length ? (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="pb-3 text-sm font-semibold">Riwayat perubahan</h2>
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
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3">
              <h2 className="text-sm font-semibold">Brief grup tim</h2>
              <SalinTeks teks={brief} />
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl bg-muted/50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{brief}</pre>
            <p className="mt-2 text-xs text-muted-foreground">Format Konfirmasi New Order — tanpa harga. Salin lalu kirim ke grup WA Kitchen/Captain.</p>
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="pb-3 text-sm font-semibold">Info lokasi & PIC</h2>
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
