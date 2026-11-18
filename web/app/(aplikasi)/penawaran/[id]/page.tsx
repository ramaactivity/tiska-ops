import { JENIS_ACARA, type JenisAcara } from "@/lib/hitung/acara";
import { TeksSyarat } from "@/components/teks-syarat";
import { ISTILAH, JENIS_PESANAN, type JenisPesanan, labelLayanan, labelLokasi, labelPajak, labelPpn } from "@/lib/istilah";
import { Fragment } from "react";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Calculator, CalendarCheck, ChefHat, ChevronRight, CircleCheck, CopyPlus, FileSpreadsheet, FileText, Lock, PencilLine, Printer, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil, Td, Th } from "@/components/halaman";
import { BarisIsiPaket } from "@/components/isi-paket";
import { SaringStatus } from "@/components/saring-status";
import { StatusPenawaran } from "@/components/lencana-status";
import { Button } from "@/components/ui/button";
import { HangatkanPdf } from "@/components/hangatkan-pdf";
import { fotoDokumen } from "@/lib/foto-menu";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { namaRekanan, opsiRekanan } from "@/lib/rekanan";
import { prisma } from "@/lib/prisma";
import { labelSesi } from "@/lib/sesi";
import { CARA_SETUJU, type CaraSetuju } from "@/lib/persetujuan-klien";

import { jumlahHariAcara, ringkasTanggalAcara } from "@/lib/tanggal";
import { LABEL_PITA } from "@/lib/hitung/paket";
import { aksesPenuh, bolehLihatBiaya, bolehUbahEvent } from "@/lib/peran";
import { untungPenawaran } from "@/lib/untung-penawaran";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";

import { StripFoto } from "../../foto-menu/strip-foto";
import { AksiStatusPenawaran, TombolBuatEvent, TombolSetujuiHarga } from "./aksi-status";
import { nilaiKelompok, perluTotalKelompok, romawi, rupiah, teksJumlahBaris } from "@/lib/uang";
import { KotakRekanan } from "../../rekanan/kotak-rekanan";

const waktuJakarta = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export const metadata: Metadata = { title: "Detail quotation" };
export const dynamic = "force-dynamic";

export default async function HalamanDetailPenawaran({
  params,
  searchParams,
}: PageProps<"/penawaran/[id]">) {
  const sesi = await wajibIzin("penawaran");

  // Margin memperlihatkan biaya dan untung-rugi, jadi hanya untuk yang memang
  // mengurus uang. Sales melihat penawarannya, bukan marginnya.
  const bolehLihatMargin = bolehLihatBiaya(sesi.peran);

  const { id } = await params;
  const { tab: t } = await searchParams;

  const p = await prisma.quotations.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    include: {
      customers: true,
      users_quotations_client_approved_byTousers: { select: { name: true } },
      // Siapa yang menolaknya, untuk catatan penolakan.
      users_quotations_cancelled_byTousers: { select: { name: true } },
      events: { select: { id: true } },
      // Di skema, satu penawaran bisa punya banyak tagihan. Dalam praktiknya
      // hanya satu, jadi cukup ambil yang pertama.
      invoices: { take: 1, select: { id: true, invoice_number: true } },
      quotation_charges: { orderBy: { id: "asc" } },
      quotation_event_dates: { orderBy: { event_date: "asc" } },
      quotation_items: {
        where: { parent_id: null },
        orderBy: { id: "asc" },
        include: {
          other_quotation_items: {
            orderBy: { id: "asc" },
            select: { id: true, item_name: true, unit: true, day: true, qty: true, pax: true, price: true, subtotal: true, menu_id: true },
          },
        },
      },
    },
  });

  if (!p) notFound();

  // Rekanan pembawa order (D-132).
  const lihatRekanan = bolehBuka(sesi.peran, "rekanan", await bacaIzin());
  const [nmRekanan, pilihRekanan] = lihatRekanan ? await Promise.all([namaRekanan([p.partner_id, p.customers.partner_id]), opsiRekanan()]) : [new Map<string, string>(), []];
  const opsiDari = (x: bigint | null | undefined) => (x && nmRekanan.has(x.toString()) ? { id: x.toString(), label: nmRekanan.get(x.toString())! } : null);

  // Foto untuk klien (D-125): paket + menu di quotation; baris teks saja dicocokkan lewat nama.
  const semuaBaris = p.quotation_items.flatMap((b) => [b, ...b.other_quotation_items]);
  const foto = bolehBuka(sesi.peran, "foto-menu", await bacaIzin())
    ? await fotoDokumen({
        paket: p.quotation_items.flatMap((b) => (b.package_id ? [b.package_id] : [])),
        menu: semuaBaris.flatMap((b) => (b.menu_id ? [b.menu_id] : [])),
        nama: p.quotation_items.filter((b) => !b.menu_id && !b.package_id && !b.other_quotation_items.length).map((b) => b.item_name),
      })
    : [];

  const tagihan = p.invoices[0] ?? null;

  // Untung makanan hanya dihitung untuk yang boleh melihat biaya; sales cukup
  // tahu statusnya (menunggu owner), tanpa angka.
  const untung = bolehLihatMargin ? await untungPenawaran(sesi, p.id) : null;

  const hariAcara = jumlahHariAcara(p.quotation_event_dates.map((b) => b.event_date));

  const acara = [
    ["Nama acara", p.event_type],
    ["Jenis acara", p.event_category ? (JENIS_ACARA[p.event_category as JenisAcara] ?? p.event_category) : null],
    // Diringkas dengan fungsi yang sama persis dengan yang dipakai dokumen
    // cetaknya, supaya layar dan cetakan tidak pernah menyebut hari berbeda.
    ["Tanggal acara", ringkasTanggalAcara(p.quotation_event_dates.map((b) => b.event_date))],
    ["Jumlah hari", hariAcara > 0 ? `${hariAcara} hari` : null],
    ["Jam", p.event_time],
    ["Jumlah tamu", p.guest_count ? `${p.guest_count} orang` : null],
    ["Jenis pesanan", p.order_type ? JENIS_PESANAN[p.order_type as JenisPesanan] : null],
    [labelLokasi(p.order_type), p.venue],
    ["F&B planner", p.fnb_planner],
  ].filter(([, nilai]) => Boolean(nilai)) as [string, string][];

  // Tab (D-173): halaman detail dipecah supaya tidak memanjang ~6.000 px (keluhan Rama: numpuk, jelimet).
  const adaSyarat = Boolean(p.show_payment_terms && p.payment_terms);
  const TAB = ["isi", ...(adaSyarat ? ["syarat"] : []), ...(foto.length ? ["foto"] : [])];
  const tab = typeof t === "string" && TAB.includes(t) ? t : "";
  const jumlahBaris = p.quotation_items.length;

  // Pemberitahuan status dikumpulkan di satu kartu, bukan kotak bertumpuk di atas halaman.
  const kabar: { nada: "baik" | "perhatian" | "netral"; isi: React.ReactNode }[] = [];
  if (p.status === "approved" && p.client_approval_method)
    kabar.push({
      nada: "baik",
      isi: (
        <>
          <span className="font-medium text-foreground">Disetujui customer</span> lewat {CARA_SETUJU[p.client_approval_method as CaraSetuju] ?? p.client_approval_method}
          {p.client_approved_at ? `, ${waktuJakarta.format(p.client_approved_at)}` : ""}
          {p.users_quotations_client_approved_byTousers ? `, dicatat ${p.users_quotations_client_approved_byTousers.name}` : ""}.{" "}
          {p.client_approval_proof ? (
            <a href={`/penawaran/${p.id}/bukti`} target="_blank" rel="noopener" className="font-medium text-primary underline-offset-4 hover:underline">
              Lihat bukti
            </a>
          ) : (
            "Tanpa bukti."
          )}
          {p.client_approval_note ? <span className="mt-1 block">{p.client_approval_note}</span> : null}
        </>
      ),
    });
  if (p.status === "rejected")
    kabar.push({
      nada: "perhatian",
      isi: (
        <>
          {/* Alasannya ditampilkan di sini, bukan hanya tersimpan. */}
          <span className="font-medium text-foreground">Ditandai ditolak</span>
          {p.cancelled_at ? ` pada ${format(p.cancelled_at, "d MMMM yyyy", { locale: localeId })}` : ""}
          {p.users_quotations_cancelled_byTousers ? ` oleh ${p.users_quotations_cancelled_byTousers.name}` : ""}
          {p.cancel_reason ? `: ${p.cancel_reason}` : ". Alasannya tidak tercatat; penolakan ini terjadi sebelum alasannya diwajibkan."}
        </>
      ),
    });
  if (p.status === "approved")
    kabar.push({
      nada: "netral",
      isi: <>Rinciannya terkunci karena sudah disetujui dan menjadi dasar invoice. Kalau masih perlu berubah, buat quotation baru untuk customer yang sama.</>,
    });
  if (!bolehLihatMargin && p.owner_approval === "perlu")
    kabar.push({ nada: "perhatian", isi: <>Harga di bawah batas untung. <b>Tunggu persetujuan owner</b> sebelum dikirim ke customer.</> });

  return (
    <Halaman>
      <HangatkanPdf />
      <Link href="/penawaran" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary">
        <ArrowLeft className="size-4" />
        Semua quotation
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 pt-5 pb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <FileText className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="font-mono text-xl font-bold tracking-tight text-primary-strong sm:text-[1.75rem]">{p.quotation_number}</h1>
            <StatusPenawaran status={p.status} />
          </div>
          <p className="mt-2 text-[0.9375rem] text-muted-foreground">
            <span className="font-medium text-foreground">{p.customers.name}</span>{" · "}
            {format(p.quotation_date, "d MMMM yyyy", { locale: localeId })} · berlaku sampai{" "}
            {format(p.valid_until, "d MMMM yyyy", { locale: localeId })}
            {p.revision > 0 ? (
              <>
                {" · "}
                <Link href={`/penawaran/${p.id}/riwayat`} className="underline underline-offset-4 hover:text-foreground">
                  Revisi ke-{p.revision} · lihat riwayat
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/penawaran/${p.id}/cetak`} target="_blank" rel="noopener" />}
          >
            <Printer className="size-4" />
            Cetak
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/penawaran/${p.id}/excel`} />}
          >
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/penawaran/${p.id}/dapur`} target="_blank" rel="noopener" />}
          >
            <ChefHat className="size-4" />
            Dapur
          </Button>
          {p.status !== "approved" ? (
            <Button variant="outline" size="sm" render={<Link href={`/penawaran/${p.id}/ubah`} />}>
              <PencilLine className="size-4" />
              Ubah
            </Button>
          ) : null}
          {/* Pesanan berulang (D-202): quotation baru berisi menu & harga yang sama, tanggalnya diisi ulang. */}
          <Button variant="outline" size="sm" render={<Link href={`/penawaran/baru?salin=${p.id}`} />}>
            <CopyPlus className="size-4" />
            Pakai lagi
          </Button>
          {bolehLihatMargin ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/penawaran/${p.id}/margin`} />}
            >
              <Calculator className="size-4" />
              Perkiraan biaya
            </Button>
          ) : null}
          <AksiStatusPenawaran
            id={p.id.toString()}
            nomor={p.quotation_number}
            status={p.status}
          />
          {p.status === "approved" && p.events ? (
            <Button variant="outline" size="sm" render={<Link href={`/event/${p.events.id}`} />}>
              <CalendarCheck className="size-4" />
              Lihat event
            </Button>
          ) : p.status === "approved" && bolehUbahEvent(sesi.peran) ? (
            <TombolBuatEvent id={p.id.toString()} label={p.order_type === "retail" ? "Buat jadwal kirim" : "Buat event"} />
          ) : null}
          {p.status === "approved" && !tagihan ? (
            <Button size="sm" render={<Link href={`/tagihan/baru?dari=${p.id}`} />}>
              <FileSpreadsheet className="size-4" />
              Buat invoice
            </Button>
          ) : null}
        </div>
      </header>

      <SaringStatus
        parameter="tab"
        pilihan={[
          { nilai: "", label: "Ringkasan" },
          { nilai: "isi", label: "Rincian & harga", jumlah: jumlahBaris },
          ...(adaSyarat ? [{ nilai: "syarat", label: "Syarat pembayaran" }] : []),
          ...(foto.length ? [{ nilai: "foto", label: "Foto menu" }] : []),
        ]}
      />

      <div className="pt-6">
        {tab === "" ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
              <section className="kartu p-5 sm:p-7">
                <p className="text-sm text-muted-foreground">Total quotation</p>
                <p className="angka pt-1 text-[clamp(1.75rem,4vw,2.25rem)] leading-tight font-bold tracking-tight text-primary-strong tabular-nums">{rupiah(p.grand_total)}</p>
                <p className="pt-2 text-sm text-muted-foreground">
                  {jumlahBaris} baris pesanan · subtotal <span className="angka tabular-nums">{rupiah(p.subtotal)}</span>
                </p>
                <Link href={`/penawaran/${p.id}?tab=isi`} scroll={false} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Lihat rincian & harga
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
                {tagihan || p.events ? (
                  <ul className="mt-5 flex flex-col gap-1 border-t pt-4">
                    {tagihan ? (
                      <li>
                        <Link href={`/tagihan/${tagihan.id}`} className="group -mx-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-[background-color,transform] duration-200 ease-out hover:bg-muted/60 active:scale-[0.99]">
                          <FileSpreadsheet className="size-[18px] text-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span className="flex-1 text-[0.9375rem]">
                            Sudah dijadikan invoice <span className="nomor-dokumen text-primary">{tagihan.invoice_number}</span>
                          </span>
                          <ChevronRight className="size-4 text-subtle-foreground group-hover:text-primary" aria-hidden="true" />
                        </Link>
                      </li>
                    ) : null}
                    {p.events ? (
                      <li>
                        <Link href={`/event/${p.events.id}`} className="group -mx-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-[background-color,transform] duration-200 ease-out hover:bg-muted/60 active:scale-[0.99]">
                          <CalendarCheck className="size-[18px] text-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span className="flex-1 text-[0.9375rem]">Pesanan & event: progres, tim, dan dokumen</span>
                          <ChevronRight className="size-4 text-subtle-foreground group-hover:text-primary" aria-hidden="true" />
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </section>

              {kabar.length || (untung && (untung.pita || untung.tanpaHpp > 0)) ? (
                <section className="kartu p-5 sm:p-7">
                  <h2 className="eyebrow pb-3">Status</h2>
                  <ul className="flex flex-col gap-3 text-[0.9375rem] text-muted-foreground">
                    {kabar.map((k, i) => (
                      <li key={i} className="flex gap-3">
                        {k.nada === "baik" ? (
                          <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-lunas" aria-hidden="true" />
                        ) : k.nada === "perhatian" ? (
                          <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-perhatian" aria-hidden="true" />
                        ) : (
                          <Lock className="mt-0.5 size-[18px] shrink-0 text-subtle-foreground" aria-hidden="true" />
                        )}
                        <span className="min-w-0">{k.isi}</span>
                      </li>
                    ))}
                    {untung && (untung.pita || untung.tanpaHpp > 0) ? (
                      <li className="flex flex-wrap items-start justify-between gap-3 border-t pt-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">Untung makanan</span>
                            {untung.pct ? (
                              <>
                                <span className="font-semibold tabular-nums text-foreground">{untung.pct.toFixed(1).replace(".", ",")}%</span>
                                {untung.pita === "rendah" && p.owner_approval === "disetujui" ? null : (
                                  <Pil nada={untung.pita === "aman" ? "baik" : "perhatian"}>{LABEL_PITA[untung.pita!]}</Pil>
                                )}
                              </>
                            ) : (
                              <Pil>Belum bisa dinilai</Pil>
                            )}
                            {p.owner_approval === "disetujui" ? <Pil nada="baik">Disetujui owner</Pil> : null}
                          </div>
                          <p className="mt-1 text-sm">
                            {untung.dinilai > 0
                              ? `Dari ${untung.dinilai} baris paket · nilai ${rupiah(untung.nilaiDinilai)} · HPP ${rupiah(untung.hpp)}.`
                              : "Belum ada baris dari \u201cTambah dari paket\u201d dengan HPP lengkap."}
                            {untung.tanpaHpp > 0 ? ` ${untung.tanpaHpp} baris lain tidak dinilai (HPP belum diketahui).` : ""}
                          </p>
                        </div>
                        {p.owner_approval === "perlu" && aksesPenuh(sesi.peran) ? <TombolSetujuiHarga id={p.id.toString()} /> : null}
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}

              {p.notes ? (
                <Kotak judul="Catatan">
                  <p className="text-[0.9375rem] whitespace-pre-wrap text-muted-foreground">{p.notes}</p>
                </Kotak>
              ) : null}
            </div>

            <aside className="flex min-w-0 flex-col gap-6 lg:gap-8">
              <Kotak judul="Customer">
                <p className="font-medium">{p.customers.name}</p>
                <p className="nomor-dokumen text-muted-foreground">{p.customers.customer_code}</p>
                {p.customers.address ? <p className="mt-3 text-[0.9375rem] whitespace-pre-wrap text-muted-foreground">{p.customers.address}</p> : null}
                {p.contact_person || p.contact_phone ? (
                  <p className="mt-3 text-[0.9375rem] text-muted-foreground">{[p.contact_person, p.contact_phone].filter(Boolean).join(" · ")}</p>
                ) : null}
                {p.contact_cc_name || p.contact_cc_phone ? (
                  <p className="mt-0.5 text-[0.9375rem] text-muted-foreground">CC: {[p.contact_cc_name, p.contact_cc_phone].filter(Boolean).join(" · ")}</p>
                ) : null}
              </Kotak>

              {acara.length > 0 ? (
                <Kotak judul={p.order_type === "retail" ? "Pengiriman" : "Detail acara"}>
                  <dl className="flex flex-col gap-3 text-[0.9375rem]">
                    {acara.map(([label, nilai]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right">{nilai}</dd>
                      </div>
                    ))}
                  </dl>
                </Kotak>
              ) : null}

              {lihatRekanan ? (
                <KotakRekanan jenis="quotation" idDokumen={id} nilai={opsiDari(p.partner_id)} usulan={opsiDari(p.customers.partner_id)} opsi={pilihRekanan} />
              ) : null}
            </aside>
          </div>
        ) : null}

        {tab === "isi" ? (
          <div className="overflow-hidden kartu">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <Th className="w-12">No</Th>
                    <Th>Uraian</Th>
                    <Th className="w-16 text-right">Hari</Th>
                    <Th className="w-24 text-right">Jumlah</Th>
                    <Th className="w-32 text-right">Harga</Th>
                    <Th className="w-36 text-right">Nilai</Th>
                  </tr>
                </thead>
                <tbody>
                  {p.quotation_items.map((b, i) => {
                    // Sub-item berharga mendapat barisnya sendiri, bernomor
                    // V.1, V.2 — sama seperti di dokumen cetak.
                    const berharga = b.other_quotation_items.filter(
                      (a) => Number(a.subtotal) > 0,
                    );
                    const rincian = b.other_quotation_items.filter(
                      (a) => Number(a.subtotal) <= 0,
                    );
                    // Judul adalah baris yang tidak menagih apa pun —
                    // ditentukan oleh angkanya sendiri, bukan oleh anaknya.
                    // Aturan yang sama persis dengan dokumen cetaknya.
                    const judulKelompok = Number(b.qty) * Number(b.price) <= 0;

                    // Dinilai dengan aturan yang sama persis dengan dokumen
                    // cetaknya — dua tempat yang menghitung sendiri-sendiri
                    // akan menyimpang tanpa ada yang menegur.
                    const kelompok = {
                      subtotal: b.subtotal,
                      anak: b.other_quotation_items.map((a) => ({ subtotal: a.subtotal })),
                    };

                    return (
                      <Fragment key={b.id.toString()}>
                    <tr className={`${rincian.length ? "" : "border-b"} last:border-0 [&>td]:align-top`}>
                      <Td className="nomor-dokumen text-muted-foreground">{romawi(i + 1)}</Td>
                      <Td>
                        <span className="font-medium">{b.item_name}</span>
                        {b.is_compliment ? (
                          <span className="ml-2 text-xs text-muted-foreground">(compliment)</span>
                        ) : null}
                        {b.session_date || b.session_label || b.session_time ? (
                          <div className="text-xs font-medium text-muted-foreground">
                            {labelSesi({ tanggal: b.session_date, jenis: b.session_label, jam: b.session_time })}
                          </div>
                        ) : null}
                        {b.charge_ppn ? (
                          <span className="ml-2 text-xs text-muted-foreground">(sewa alat · PPN)</span>
                        ) : !b.charge_service ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (tanpa layanan)
                          </span>
                        ) : null}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : Number(b.day).toLocaleString("id-ID")}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : teksJumlahBaris(b)}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : rupiah(b.price)}
                      </Td>
                      <Td className="angka text-right font-medium tabular-nums">
                        {judulKelompok ? (
                          ""
                        ) : b.is_compliment ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          rupiah(b.subtotal)
                        )}
                      </Td>
                    </tr>
                    {/* Isi paket selebar tabel, mengalir ke beberapa kolom (D-174). */}
                    <BarisIsiPaket rincian={rincian} rentang={5} />

                        {berharga.map((a, j) => (
                          <tr key={a.id.toString()} className="border-b align-top last:border-0">
                            <Td className="nomor-dokumen text-muted-foreground">
                              {`${romawi(i + 1)}.${j + 1}`}
                            </Td>
                            <Td className="pl-7">{a.item_name}</Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {Number(a.day).toLocaleString("id-ID")}
                            </Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {teksJumlahBaris(a)}
                            </Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {rupiah(a.price)}
                            </Td>
                            <Td className="angka text-right font-medium tabular-nums">
                              {b.is_compliment ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                rupiah(a.subtotal)
                              )}
                            </Td>
                          </tr>
                        ))}
                        {perluTotalKelompok(kelompok) ? (
                          <tr className="border-b bg-muted/30 last:border-0">
                            <Td>{""}</Td>
                            <Td className="font-medium">Total {romawi(i + 1)}</Td>
                            <Td>{""}</Td>
                            <Td>{""}</Td>
                            <Td>{""}</Td>
                            <Td className="angka text-right font-semibold tabular-nums">
                              {rupiah(nilaiKelompok(kelompok))}
                            </Td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <dl className="flex flex-col gap-1.5 border-t bg-muted/20 px-4 py-4 text-sm">
              <BarisTotal label="Subtotal" nilai={rupiah(p.subtotal)} />
              {Number(p.service_charge_amount) > 0 ? (
                <BarisTotal
                  label={labelLayanan(p.service_charge_percent?.toString(), p.service_charge_minimum?.toString())}
                  nilai={rupiah(p.service_charge_amount)}
                />
              ) : null}
              {p.pb1_enabled && Number(p.pb1_amount) > 0 ? (
                <BarisTotal
                  label={labelPajak(p.pb1_percent?.toString())}
                  nilai={rupiah(p.pb1_amount)}
                />
              ) : null}
              {/* Delivery dan biaya tambahan ditaruh SESUDAH kedua pungutan,
                  urutan yang sama dengan dokumen cetaknya — supaya angka di
                  layar bisa dicocokkan baris demi baris dengan yang dikirim. */}
              {Number(p.ppn_amount) > 0 ? (
                <BarisTotal label={labelPpn(p.ppn_percent?.toString())} nilai={rupiah(p.ppn_amount)} />
              ) : null}
              {Number(p.delivery_amount) > 0 ? (
                <BarisTotal label={ISTILAH.delivery} nilai={rupiah(p.delivery_amount)} />
              ) : null}
              {p.quotation_charges.map((b) => (
                <BarisTotal key={b.id.toString()} label={b.label} nilai={rupiah(b.amount)} />
              ))}
              <div className="mt-1.5 flex items-baseline justify-between border-t pt-2.5">
                <dt className="font-medium">Total quotation</dt>
                <dd className="angka text-base font-semibold tabular-nums">
                  {rupiah(p.grand_total)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {tab === "syarat" ? (
          <Kotak judul="Syarat pembayaran">
            <TeksSyarat teks={p.payment_terms ?? ""} lapang className="max-w-[80ch] text-[0.9375rem] leading-relaxed text-muted-foreground" />
          </Kotak>
        ) : null}

        {tab === "foto" ? <StripFoto kelompok={foto} judul={p.customers.name} /> : null}
      </div>
    </Halaman>
  );
}

function BarisTotal({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="angka tabular-nums">{nilai}</dd>
    </div>
  );
}

function Kotak({
  judul,
  children,
  className,
}: {
  judul: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`kartu p-5 sm:p-7 ${className ?? ""}`}>
      <h2 className="eyebrow pb-3">{judul}</h2>
      {children}
    </section>
  );
}
