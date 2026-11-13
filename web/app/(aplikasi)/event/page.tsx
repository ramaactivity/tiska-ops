import { CalendarCheck, CalendarPlus, ChevronDown, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { AvatarOrang } from "@/components/avatar-orang";
import { BilahProgres } from "@/components/progres-pesanan";
import { uraiAvatar } from "@/lib/avatar";
import { SaringStatus } from "@/components/saring-status";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";
import { progresEvent } from "@/lib/hitung/progres-event";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { dataProgres, hariIniWib, PILIH_PROGRES } from "@/lib/progres-event";
import { wajibIzin } from "@/lib/rbac";

import { TombolBuatEvent } from "../penawaran/[id]/aksi-status";
import { JUDUL, KARTU } from "./[id]/gaya";

export const metadata: Metadata = { title: "Pesanan & Event" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Pesanan & Event (D-049, D-171): pusat operasional — bawaan mendatang, terdekat dulu, dengan progres tiap pesanan. */
export default async function HalamanEvent({ searchParams }: PageProps<"/event">) {
  const sesi = await wajibIzin("event");
  const { lihat, siapa } = await searchParams;
  // "Pesanan saya" (D-175): yang penanggung jawabnya akun ini.
  const saya = siapa === "saya";
  const mode = lihat === "lalu" || lihat === "semua" ? lihat : "mendatang";
  const tglHariIni = hariIniWib();
  const hariIni = new Date(`${tglHariIni}T00:00:00Z`);
  const uang = bolehBuka(sesi.peran, "tagihan", await bacaIzin());

  // Quotation disetujui yang acaranya belum lewat tapi event-nya belum dibuat:
  // pesanan jadi yang belum masuk pusat operasional (pola Kebutuhan Bahan).
  const belumEvent =
    mode === "lalu"
      ? []
      : await prisma.quotations.findMany({
          where: {
            status: "approved",
            events: null,
            ...(sesi.peran === "sales" ? { created_by: BigInt(sesi.id) } : {}),
            OR: [{ event_date: { gte: hariIni } }, { event_date: null }],
          },
          orderBy: [{ event_date: "asc" }, { id: "asc" }],
          select: { id: true, quotation_number: true, order_type: true, event_date: true, customers: { select: { name: true } } },
        });

  const daftar = await prisma.events.findMany({
    where: {
      ...eventMiliknya(sesi),
      ...(saya ? { pic_user_id: BigInt(sesi.id) } : {}),
      ...(mode === "mendatang" ? { OR: [{ first_date: { gte: hariIni } }, { first_date: null }], status: { notIn: ["selesai", "batal"] } } : {}),
      ...(mode === "lalu" ? { first_date: { lt: hariIni } } : {}),
    },
    orderBy: [{ first_date: mode === "lalu" ? "desc" : "asc" }, { id: "asc" }],
    take: 200,
    select: {
      ...PILIH_PROGRES,
      id: true,
      name: true,
      guest_count: true,
      venue: true,
      change_count: true,
      customers: { select: { name: true } },
      users_events_pic_user_idTousers: { select: { name: true, username: true, avatar: true, gender: true } },
      quotations: { select: { quotation_number: true, ...PILIH_PROGRES.quotations.select } },
      _count: { select: { event_items: true, basts: true } },
    },
  });

  return (
    <Halaman>
      <KepalaHalaman
        ikon={CalendarCheck}
        judul="Pesanan & Event"
        keterangan="Semua pesanan yang sudah disetujui customer: progres tiap pesanan, jadwal, tim, dan dokumennya di satu tempat."
      />
      {belumEvent.length ? (
        <section className={`${KARTU} mb-10`}>
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-perhatian-halus text-perhatian">
              <CalendarPlus className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className={JUDUL}>{belumEvent.length} pesanan disetujui belum dibuatkan event</h2>
              <p className="pt-1 text-sm text-muted-foreground">
                Belum masuk jadwal dapur, tim, dan progres.{bolehUbahEvent(sesi.peran) ? " Buat event-nya supaya bisa dipantau di sini." : " Minta sales / admin membuatnya."}
              </p>
            </div>
          </div>
          <ul className="mt-5 flex flex-col divide-y rounded-2xl border">
            {belumEvent.slice(0, 3).map((q) => (
              <BarisBelumEvent key={q.id.toString()} q={q} boleh={bolehUbahEvent(sesi.peran)} />
            ))}
          </ul>
          {belumEvent.length > 3 ? (
            <details className="group mt-3">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                <span className="group-open:hidden">Lihat {belumEvent.length - 3} lainnya</span>
                <span className="hidden group-open:inline">Sembunyikan</span>
              </summary>
              <ul className="mt-2 flex flex-col divide-y rounded-2xl border">
                {belumEvent.slice(3).map((q) => (
                  <BarisBelumEvent key={q.id.toString()} q={q} boleh={bolehUbahEvent(sesi.peran)} />
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pb-6">
        <SaringStatus
          parameter="lihat"
          pilihan={[
            { nilai: "", label: "Mendatang" },
            { nilai: "lalu", label: "Sudah lewat" },
            { nilai: "semua", label: "Semua" },
          ]}
        />
        <SaringStatus
          parameter="siapa"
          pilihan={[
            { nilai: "", label: "Semua orang" },
            { nilai: "saya", label: "Pesanan saya" },
          ]}
        />
      </div>
      {daftar.length === 0 ? (
        <div className={KARTU}>
          <KeadaanKosong
            judul={saya ? "Belum ada pesanan yang dipegang akun ini." : mode === "lalu" ? "Belum ada pesanan yang sudah lewat." : "Belum ada pesanan mendatang."}
            keterangan={belumEvent.length ? "Buat event dari daftar pesanan disetujui di atas." : "Pesanan muncul di sini setelah quotation disetujui dan dibuatkan event."}
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((e) => {
            const terkunci = e.lock_at && e.lock_at < new Date();
            return (
              <li key={e.id.toString()}>
                <Link
                  href={`/event/${e.id}`}
                  className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 rounded-[20px] border bg-card p-4 shadow-[0_1px_2px_rgb(31_42_92/0.04)] transition-[box-shadow,border-color,transform] duration-200 ease-out active:scale-[0.995] hover:border-primary/30 hover:shadow-[0_1px_2px_rgb(31_42_92/0.04),0_10px_28px_-14px_rgb(31_42_92/0.18)] sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,22rem)_auto]"
                >
                  <BlokTanggal tanggal={e.first_date} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[1.0625rem] font-semibold text-primary-strong">{e.customers.name}</span>
                      <Pil nada={e.status === "selesai" ? "baik" : "netral"}>{STATUS_EVENT[e.status as keyof typeof STATUS_EVENT] ?? e.status}</Pil>
                      {e.change_count > 0 ? <Pil nada="perhatian">UPDATE ke-{e.change_count}</Pil> : null}
                      {terkunci ? <Pil>Menu dikunci</Pil> : null}
                    </div>
                    <p className="truncate pt-1 text-sm text-muted-foreground">
                      {[e.name === "Event" ? null : e.name, CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN], e.guest_count ? `${e.guest_count} tamu` : null, e.venue]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-xs text-subtle-foreground">
                      <span className="nomor-dokumen">{e.quotations.quotation_number}</span>
                      {e.users_events_pic_user_idTousers ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <AvatarOrang
                            pilihan={uraiAvatar(e.users_events_pic_user_idTousers.avatar, e.users_events_pic_user_idTousers.username, e.users_events_pic_user_idTousers.gender)}
                            nama={e.users_events_pic_user_idTousers.name}
                            className="size-5"
                          />
                          {e.users_events_pic_user_idTousers.name}
                        </span>
                      ) : (
                        <span>Belum ada penanggung jawab</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <BilahProgres progres={progresEvent(dataProgres(e), tglHariIni, uang)} />
                  </div>
                  <ChevronRight className="hidden size-5 text-subtle-foreground transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-primary lg:block" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Halaman>
  );
}

const bulan = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });
const hariSingkat = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });

/** Tanggal acara sebagai blok: hari, angka besar, bulan — mudah dipindai dari atas ke bawah. */
function BlokTanggal({ tanggal: t }: { tanggal: Date | null }) {
  return (
    <span className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-primary/[0.06] py-2 text-primary-strong">
      {t ? (
        <>
          <span className="text-[0.6875rem] font-medium text-muted-foreground">{hariSingkat.format(t)}</span>
          <span className="font-mono text-xl leading-tight font-semibold tabular-nums">{t.getUTCDate()}</span>
          <span className="text-[0.6875rem] font-medium text-muted-foreground">{bulan.format(t)}</span>
        </>
      ) : (
        <span className="py-2 text-xs text-muted-foreground">Belum</span>
      )}
    </span>
  );
}

function BarisBelumEvent({ q, boleh }: { q: { id: bigint; quotation_number: string; order_type: string | null; event_date: Date | null; customers: { name: string } }; boleh: boolean }) {
  return (
    <li className="flex flex-col items-start gap-x-4 gap-y-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
      <span className="min-w-0 sm:flex-1">
        <span className="block font-medium">{q.customers.name}</span>
        <span className="text-sm text-muted-foreground">
          {q.event_date ? tanggal.format(q.event_date) : "Tanggal belum ada"} ·{" "}
          <Link href={`/penawaran/${q.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
            {q.quotation_number}
          </Link>
        </span>
      </span>
      {boleh ? <TombolBuatEvent id={q.id.toString()} label={q.order_type === "retail" ? "Buat jadwal kirim" : "Buat event"} /> : null}
    </li>
  );
}
