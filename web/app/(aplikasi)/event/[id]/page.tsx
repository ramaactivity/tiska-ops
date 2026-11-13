import { ArrowLeft, Ban, CalendarDays, ChevronRight, ClipboardCheck, ExternalLink, FileText, MapPin, Pencil, PieChart, Phone, Receipt, ShoppingBasket, Truck, Users, UtensilsCrossed, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { StatusTagihan } from "@/components/lencana-status";
import { LangkahProgres } from "@/components/progres-pesanan";
import { Button } from "@/components/ui/button";
import { LABEL_STATUS_PR, type StatusPr } from "@/lib/belanja";
import { progresEvent } from "@/lib/hitung/progres-event";
import { dataProgres, hariIniWib, PILIH_PROGRES } from "@/lib/progres-event";
import { rupiah } from "@/lib/uang";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";
import { daftarFoto, opsiTujuan } from "@/lib/foto-menu";
import { aksesPenuh, bolehLihatBiaya, bolehUbahEvent } from "@/lib/peran";
import { daftarAset } from "@/lib/aset";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { briefJadwalTim, briefKonfirmasi, briefUpdate } from "@/lib/brief";
import { cariBentrok } from "@/lib/hitung/penugasan";

import { FormInfoEvent, PilihStatusEvent, SalinTeks, TombolPerbarui } from "./aksi-event";
import { type KloterTampil, PenugasanEvent } from "./penugasan";
import { PeralatanEvent } from "./peralatan-event";
import { KartuPembatalan } from "./kartu-pembatalan";
import { DaftarAset } from "../../aset/daftar-aset";
import { Galeri } from "../../foto-menu/galeri";
import { JUDUL, KARTU } from "./gaya";
import { RekapEvent } from "./rekap-event";

export const metadata: Metadata = { title: "Detail event" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID");
const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const tanggalPendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Satu baris dokumen: seluruh baris bisa diketuk — ikon, jenis & nomor, keterangan, status. */
function BarisDokumen({
  ikon: Ikon,
  label,
  href,
  nomor,
  teks,
  keterangan,
  baruTab,
  children,
}: {
  ikon: LucideIcon;
  label: string;
  href: string;
  nomor?: string;
  /** Judul biasa (bukan nomor dokumen) — tidak memakai huruf angka. */
  teks?: string;
  keterangan?: string;
  baruTab?: boolean;
  children?: React.ReactNode;
}) {
  const isi = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/[0.07] text-primary">
        <Ikon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="truncate font-medium text-foreground">{nomor ? <span className="nomor-dokumen">{nomor}</span> : (teks ?? "Buka")}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {children}
        {keterangan ? <span className="font-mono text-xs tabular-nums text-muted-foreground">{keterangan}</span> : null}
      </span>
      {baruTab ? (
        <ExternalLink className="size-4 shrink-0 text-subtle-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-subtle-foreground transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      )}
    </>
  );
  const kelas = "group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <li>
      {baruTab ? (
        <a href={href} target="_blank" rel="noopener" className={kelas}>
          {isi}
        </a>
      ) : (
        <Link href={href} className={kelas}>
          {isi}
        </Link>
      )}
    </li>
  );
}

export default async function HalamanDetailEvent({ params, searchParams }: PageProps<"/event/[id]">) {
  const sesi = await wajibIzin("event");
  const { id } = await params;
  const { tab: t, ubah: modeUbah } = await searchParams;
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
        // Kloter antar Ikut Menu Pesta dikelola di halaman programnya (D-117) — bukan bagian acara klien ini.
        where: { program_id: null },
        orderBy: [{ date: "asc" }, { no: "asc" }],
        include: {
          event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } },
          kloter_tracking: { orderBy: { at: "asc" }, include: { users: { select: { name: true } } } },
        },
      },
    },
  });
  if (!e) notFound();
  // Foto Menu (D-125): galeri foto acara ini — hanya untuk yang boleh membuka Foto Menu.
  // Link dokumentasi/berkas acara ini di Google Drive dsb. (D-127).
  const asetAcara = bolehBuka(sesi.peran, "aset", await bacaIzin()) ? await daftarAset({ event_id: e.id }) : null;
  const fotoAcara = bolehBuka(sesi.peran, "foto-menu", await bacaIzin())
    ? { foto: await daftarFoto({ event_id: e.id }), opsi: await opsiTujuan(e.id) }
    : null;
  // Pusat pesanan (D-171): progres + dokumen. Uang hanya untuk yang boleh membuka Invoice/Payment/Belanja.
  const izin = await bacaIzin();
  const [lihatTagihan, lihatBayar, lihatBelanja] = [bolehBuka(sesi.peran, "tagihan", izin), bolehBuka(sesi.peran, "pembayaran", izin), bolehBuka(sesi.peran, "belanja", izin)];
  const [dp, tagihan, belanja] = await Promise.all([
    prisma.events.findUniqueOrThrow({ where: { id: e.id }, select: PILIH_PROGRES }),
    lihatTagihan
      ? prisma.invoices.findMany({
          where: { quotation_id: e.quotation_id, status: { not: "cancelled" } },
          orderBy: { id: "asc" },
          select: {
            id: true,
            invoice_number: true,
            status: true,
            grand_total: true,
            paid_amount: true,
            payment_details: { orderBy: { id: "asc" }, select: { amount_applied: true, payments: { select: { id: true, payment_number: true, payment_date: true } } } },
          },
        })
      : Promise.resolve([]),
    lihatBelanja
      ? prisma.purchase_requests.findMany({ where: { event_ids: { has: e.id } }, orderBy: { need_date: "asc" }, select: { id: true, pr_number: true, status: true, need_date: true } })
      : Promise.resolve([]),
  ]);
  const progres = progresEvent(dataProgres(dp), hariIniWib(), lihatTagihan);
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


  const adaDokumentasi = Boolean(asetAcara || fotoAcara);
  const ambilSendiri = e.service_mode === "ambil";
  const TAB = ["menu", "tim", ...(adaDokumentasi ? ["dokumentasi"] : []), "riwayat"];
  const tab = typeof t === "string" && TAB.includes(t) ? t : "";
  const ubahInfo = ubah && modeUbah === "info";
  const catatanKunci = e.lock_at
    ? terkunci
      ? `Perubahan porsi/menu ditutup sejak ${waktu.format(e.lock_at)}. Perubahan sesudahnya harus disetujui owner dan tercatat sebagai UPDATE.`
      : `Porsi/menu masih bisa diubah sampai ${waktu.format(e.lock_at)} WIB.`
    : null;
  const infoBaca = [
    { ikon: MapPin, label: "Lokasi", isi: [e.venue, e.address].filter(Boolean).join("\n") },
    { ikon: Phone, label: "PIC di lokasi", isi: [e.pic_name, e.pic_phone].filter(Boolean).join(" · ") },
    { ikon: Users, label: "EO / WO", isi: e.eo_name },
    { ikon: Users, label: "Jumlah tamu", isi: e.guest_count ? `${e.guest_count} orang` : null },
    { ikon: FileText, label: "Catatan untuk tim", isi: e.notes },
  ].filter((x) => x.isi);

  return (
    <Halaman>
      <Link href="/event" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary">
        <ArrowLeft className="size-4" />
        Semua pesanan
      </Link>

      {/* Kepala: siapa, kapan, bagaimana — lalu progres. Dokumen pindah ke tab Ringkasan (D-171). */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-5 pb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-balance text-primary-strong sm:text-[2.125rem]">{e.customers.name}</h1>
            <Pil nada={e.status === "selesai" ? "baik" : "netral"}>{STATUS_EVENT[e.status as keyof typeof STATUS_EVENT] ?? e.status}</Pil>
            {e.change_count > 0 ? <Pil nada="perhatian">UPDATE ke-{e.change_count}</Pil> : null}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-muted-foreground">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 text-subtle-foreground" aria-hidden="true" />
              {e.first_date ? hari.format(e.first_date) : "Tanggal belum ada"}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-subtle-foreground" aria-hidden="true" />
              {CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN] ?? e.service_mode}
            </li>
            {e.venue ? (
              <li className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                <span className="truncate">{e.venue}</span>
              </li>
            ) : null}
            {e.name && e.name !== "Event" ? <li>{e.name}</li> : null}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ubah ? <TombolPerbarui id={e.id.toString()} sumber={e.invoices ? "invoice" : "quotation"} /> : null}
          {/* Program retail dari menu acara ini (D-115). */}
          {e.status !== "batal" && (!e.first_date || tgl(e.first_date) >= hariIniWib()) && bolehBuka(sesi.peran, "ikut-menu-pesta", izin) ? (
            <Button variant="outline" className="rounded-full bg-card" render={<Link href={`/ikut-menu-pesta/baru?event=${e.id}`} />}>
              <UtensilsCrossed className="size-4" />
              Usulkan Ikut Menu Pesta
            </Button>
          ) : null}
        </div>
      </header>

      <LangkahProgres progres={progres} />

      <div className="pt-10 pb-6">
        <SaringStatus
          gaya="pil"
          parameter="tab"
          pilihan={[
            { nilai: "", label: "Ringkasan" },
            { nilai: "menu", label: "Menu", jumlah: e.event_items.length },
            { nilai: "tim", label: ambilSendiri ? "Pengambilan" : "Tim & kirim" },
            ...(adaDokumentasi ? [{ nilai: "dokumentasi", label: "Dokumentasi" }] : []),
            { nilai: "riwayat", label: "Riwayat & rekap", ...(e.event_changes.length ? { jumlah: e.event_changes.length } : {}) },
          ]}
        />
      </div>

      {tab === "" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
          <section className={KARTU}>
            <h2 className={JUDUL}>Dokumen &amp; pembayaran</h2>
            <p className="pt-1 pb-4 text-sm text-muted-foreground">Semua berkas pesanan ini. Ketuk untuk membuka.</p>
            <ul className="flex flex-col gap-1">
              <BarisDokumen ikon={FileText} label="Quotation" href={`/penawaran/${e.quotations.id}`} nomor={e.quotations.quotation_number} />
              {lihatTagihan ? (
                tagihan.length ? (
                  tagihan.map((x) => (
                    <BarisDokumen key={x.id.toString()} ikon={Receipt} label="Invoice" href={`/tagihan/${x.id}`} nomor={x.invoice_number} keterangan={x.status !== "paid" ? `sisa ${rupiah(x.grand_total.minus(x.paid_amount))}` : undefined}>
                      <StatusTagihan status={x.status} />
                    </BarisDokumen>
                  ))
                ) : (
                  <li className="flex items-center gap-4 py-3 text-muted-foreground">
                    <span className="grid size-10 place-items-center rounded-xl border border-dashed">
                      <Receipt className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    Invoice belum dibuat
                  </li>
                )
              ) : null}
              {lihatBayar
                ? tagihan.flatMap((x) =>
                    x.payment_details.map((p) => (
                      <BarisDokumen
                        key={`${x.id}-${p.payments.id}`}
                        ikon={Wallet}
                        label={`Payment · ${tanggalPendek.format(p.payments.payment_date)}`}
                        href={`/pembayaran/${p.payments.id}`}
                        nomor={p.payments.payment_number}
                        keterangan={rupiah(p.amount_applied)}
                      />
                    )),
                  )
                : null}
              {belanja.map((b) => (
                <BarisDokumen key={b.id.toString()} ikon={ShoppingBasket} label={`Belanja · untuk ${tanggalPendek.format(b.need_date)}`} href={`/belanja/${b.id}`} nomor={b.pr_number}>
                  <Pil>{LABEL_STATUS_PR[b.status as StatusPr] ?? b.status}</Pil>
                </BarisDokumen>
              ))}
              {/* Surat jalan per kloter bila sudah ada kloter (D-077). */}
              {kloter.length ? (
                kloter.map((k) => (
                  <BarisDokumen key={k.id} ikon={Truck} label={`Delivery order · ${tanggalPendek.format(new Date(`${k.tanggal}T00:00:00Z`))}`} teks={`Kloter ${k.no}`} href={`/event/${e.id}/delivery-order?kloter=${k.id}`} baruTab />
                ))
              ) : (
                <BarisDokumen ikon={Truck} label="Delivery order" teks="Surat jalan" href={`/event/${e.id}/delivery-order`} baruTab />
              )}
              {e.basts.map((b) => (
                <BarisDokumen key={b.id.toString()} ikon={ClipboardCheck} label={`BAST · kloter ${b.event_kloters.no}`} href={`/event/${e.id}/bast/${b.id}`} nomor={b.bast_number} baruTab />
              ))}
              {bolehLihatBiaya(sesi.peran) ? <BarisDokumen ikon={PieChart} label="Biaya, honor & untung" teks="Rekap event" href={`/event/${e.id}/rekap`} /> : null}
            </ul>
          </section>

          <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
            {e.status === "batal" ? (
              <KartuPembatalan idEvent={e.id} peran={sesi.peran} ubah={ubah} />
            ) : (
              <section className={KARTU}>
                <h2 className={JUDUL}>Status</h2>
                {catatanKunci ? <p className="pt-1 text-sm text-muted-foreground">{catatanKunci}</p> : null}
                {ubah ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <PilihStatusEvent id={e.id.toString()} status={e.status} />
                    <Link href={`/event/${e.id}/batal`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline">
                      <Ban className="size-4" />
                      Batalkan pesanan
                    </Link>
                  </div>
                ) : null}
              </section>
            )}

            <section className={KARTU}>
              <div className="flex items-center justify-between gap-3">
                <h2 className={JUDUL}>Lokasi &amp; PIC</h2>
                {ubah && !ubahInfo ? (
                  <Button variant="ghost" size="sm" className="rounded-full text-primary" render={<Link href={`/event/${e.id}?ubah=info`} scroll={false} />}>
                    <Pencil className="size-4" />
                    Ubah
                  </Button>
                ) : null}
                {ubahInfo ? (
                  <Button variant="ghost" size="sm" className="rounded-full" render={<Link href={`/event/${e.id}`} scroll={false} />}>
                    Selesai
                  </Button>
                ) : null}
              </div>
              {ubahInfo ? (
                <div className="pt-4">
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
                </div>
              ) : infoBaca.length ? (
                <dl className="flex flex-col gap-5 pt-5">
                  {infoBaca.map(({ ikon: Ikon, label, isi }) => (
                    <div key={label} className="flex gap-3.5">
                      <Ikon className="mt-0.5 size-[18px] shrink-0 text-subtle-foreground" strokeWidth={1.75} aria-hidden="true" />
                      <div className="min-w-0">
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="pt-0.5 text-[0.9375rem] whitespace-pre-line">{isi}</dd>
                      </div>
                    </div>
                  ))}
                  {e.maps_url ? (
                    <a href={e.maps_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 pl-8 text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Buka di Google Maps
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </dl>
              ) : (
                <p className="pt-3 text-sm text-muted-foreground">Belum diisi.{ubah ? " Ketuk Ubah untuk melengkapi lokasi & PIC." : ""}</p>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {tab === "menu" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
          <section className={KARTU}>
            <h2 className={JUDUL}>Isi pesanan</h2>
            {catatanKunci ? <p className="pt-1 text-sm text-muted-foreground">{catatanKunci}</p> : null}
            <div className="flex flex-col gap-8 pt-6">
              {urut.map(([tg, items]) => (
                <div key={tg || "tanpa"}>
                  <h3 className="flex items-center gap-2 pb-4 font-semibold text-foreground">
                    <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                    {tg ? hari.format(new Date(`${tg}T00:00:00Z`)) : "Tanggal sesi belum diisi"}
                  </h3>
                  <ul className="flex flex-col divide-y rounded-2xl border">
                    {items.map((it) => (
                      <li key={it.id.toString()} className="flex flex-col gap-1 p-4 sm:px-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="font-medium">{it.item_name}</p>
                          <p className="font-mono text-sm tabular-nums text-primary-strong">
                            {angka(it.qty)} {it.unit ?? ""}
                            {it.pax ? ` × ${it.pax} pax` : ""}
                            {Number(it.day) > 1 ? ` · ${angka(it.day)} hari` : ""}
                          </p>
                        </div>
                        {it.session_label || it.session_time ? (
                          <p className="text-sm text-muted-foreground">{[it.session_label, it.session_time].filter(Boolean).join(" · ")}</p>
                        ) : null}
                        {it.contents ? <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{it.contents.split("\n").join(" · ")}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className={KARTU}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={JUDUL}>Brief grup tim</h2>
              <SalinTeks teks={brief} />
            </div>
            <p className="pt-1 pb-4 text-sm text-muted-foreground">Format Konfirmasi New Order, tanpa harga. Salin lalu kirim ke grup WA Kitchen/Captain.</p>
            <pre className="max-h-[32rem] overflow-auto rounded-2xl bg-muted/50 p-4 font-sans text-[0.8125rem] leading-relaxed whitespace-pre-wrap">{brief}</pre>
          </section>
        </div>
      ) : null}

      {tab === "tim" ? (
        <div className="flex flex-col gap-6 lg:gap-8">
          <section className={KARTU}>
            <h2 className={JUDUL}>{ambilSendiri ? "Jadwal pengambilan" : "Tim & kendaraan"}</h2>
            <p className="pt-1 pb-5 text-sm text-muted-foreground">Kloter berangkat, siapa ikut, dan kendaraannya. Bentrok jadwal ditandai otomatis.</p>
            {bentrok.length ? (
              <ul className="mb-5 flex flex-col gap-1.5 rounded-2xl bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
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
              <div key={b.tanggal} className="mt-6">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="text-sm font-medium">Brief Jadwal Tim Service · {hari.format(new Date(`${b.tanggal}T00:00:00Z`))}</span>
                  <SalinTeks teks={b.teks} />
                </div>
                <pre className="max-h-72 overflow-auto rounded-2xl bg-muted/50 p-4 font-sans text-[0.8125rem] leading-relaxed whitespace-pre-wrap">{b.teks}</pre>
              </div>
            ))}
          </section>
          {e.basts.length ? (
            <section className={KARTU}>
              <h2 className={`${JUDUL} pb-4`}>Serah terima (BAST)</h2>
              <ul className="flex flex-col gap-3">
                {e.basts.map((b) => (
                  <li key={b.id.toString()} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="nomor-dokumen">{b.bast_number}</span> · kloter {b.event_kloters.no} · diterima <b>{b.receiver_name}</b> · {waktu.format(b.signed_at)}
                      {b.condition === "catatan" ? <span className="block text-perhatian">⚠️ {b.note}</span> : <span className="text-lunas"> · lengkap & baik</span>}
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
        </div>
      ) : null}

      {tab === "dokumentasi" ? (
        <div className="flex flex-col gap-6 lg:gap-8">
          {asetAcara ? (
            <section className={KARTU}>
              <h2 className={JUDUL}>Berkas &amp; dokumentasi</h2>
              <p className="pt-1 pb-5 text-sm text-muted-foreground">Link folder Google Drive dokumentasi acara ini, atau berkas lain seperti desain dan rundown.</p>
              <DaftarAset aset={asetAcara} bolehUbah idEvent={e.id.toString()} kosong="Belum ada link. Unggah dokumentasinya ke Google Drive, lalu tempel link foldernya di sini." />
            </section>
          ) : null}
          {fotoAcara ? (
            <section className={KARTU}>
              <h2 className={JUDUL}>Foto menu acara ini</h2>
              <p className="pt-1 pb-5 text-sm text-muted-foreground">Foto masakan dari acara ini, termasuk kiriman captain/driver dari HP. Tandai ke menunya supaya masuk galeri Foto Menu.</p>
              <Galeri foto={fotoAcara.foto} judul={e.customers.name} tujuan={null} idEvent={e.id.toString()} opsiMenu={fotoAcara.opsi.menu} opsiPaket={fotoAcara.opsi.paket} bolehHapus={aksesPenuh(sesi.peran)} />
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "riwayat" ? (
        <div className="flex flex-col gap-6 lg:gap-8">
          <RekapEvent idEvent={e.id.toString()} status={e.recap_status} />
          <section className={KARTU}>
            <h2 className={`${JUDUL} pb-4`}>Riwayat perubahan</h2>
            {e.event_changes.length ? (
              <ol className="flex flex-col gap-6">
                {e.event_changes.map((c) => (
                  <li key={c.id.toString()} className="text-[0.9375rem]">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Pil nada="perhatian">UPDATE ke-{c.change_no}</Pil>
                      {c.after_lock ? <Pil>sesudah batas</Pil> : null}
                      <span>
                        {waktu.format(c.created_at)}
                        {c.users ? ` · ${c.users.name}` : ""}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line">{c.summary}</p>
                    <div className="mt-3">
                      <SalinTeks label="Salin brief UPDATE" teks={briefUpdate({ ke: c.change_no, pemesan: e.customers.name, acara: e.name === "Event" ? null : e.name, perubahan: c.summary })} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada perubahan sejak event dibuat.</p>
            )}
          </section>
        </div>
      ) : null}
    </Halaman>
  );
}
