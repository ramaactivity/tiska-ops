import { ArrowLeft, MapPin, MessageCircle, Pencil, Plus, QrCode, TriangleAlert, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { BagianForm, Halaman, Pil } from "@/components/halaman";
import { StatusTagihan } from "@/components/lencana-status";
import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { asalSitus } from "@/lib/asal-situs";
import {
  ASAL_PESANAN,
  type AsalPesanan,
  draftKonfirmasi,
  nadaStatus,
  perluKonfirmasi,
  peringatanPaket,
  rekapPorsi,
  STATUS_PROGRAM,
  type StatusProgram,
  tautanWa,
  teksFlyer,
} from "@/lib/hitung/ikut-menu-pesta";
import { laporanProgram, untungProgram } from "@/lib/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { aksesPenuh, bolehSetujuiProgram, bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { type KloterTampil, PenugasanEvent } from "../../event/[id]/penugasan";
import { AksiPesanan, AntarPesanan, KonfirmasiPesanan } from "./aksi-pesanan";
import { KeputusanProgram } from "./keputusan";

export const metadata: Metadata = { title: "Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
const tglWib = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
const WARNA = { baik: "text-lunas", perhatian: "text-perhatian", bahaya: "text-destructive", netral: "text-muted-foreground" } as const;

export default async function HalamanProgram({ params }: PageProps<"/ikut-menu-pesta/[id]">) {
  const sesi = await wajibIzin("ikut-menu-pesta");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const p = await prisma.retail_programs.findUnique({
    where: { id: BigInt(id) },
    include: {
      events: { select: { id: true, name: true, first_date: true, customers: { select: { name: true } } } },
      users_retail_programs_proposed_byTousers: { select: { name: true } },
      users_retail_programs_decided_byTousers: { select: { name: true } },
      retail_program_sets: {
        orderBy: { sort: "asc" },
        include: { retail_program_set_items: { orderBy: { sort: "asc" }, include: { menus: { select: { category: true } } } } },
      },
      retail_orders: {
        orderBy: { id: "desc" },
        include: {
          retail_order_items: { include: { retail_program_sets: { select: { title: true } } } },
          invoices: { select: { id: true, invoice_number: true, status: true, grand_total: true, delivery_amount: true } },
          users_retail_orders_delivered_byTousers: { select: { name: true } },
          users_retail_orders_area_decided_byTousers: { select: { name: true } },
        },
      },
    },
  });
  if (!p) notFound();
  const aktif = p.retail_orders.filter((o) => o.status === "aktif");
  const rekap = rekapPorsi(
    p.retail_program_sets.map((s) => ({ idSet: s.id.toString(), judul: s.title, isi: s.retail_program_set_items.map((i) => i.name) })),
    aktif.filter((o) => o.area_status !== "ditolak").flatMap((o) => o.retail_order_items.map((i) => ({ idSet: i.set_id.toString(), pax: i.pax }))),
  );
  const ditutup = p.order_deadline < new Date();

  // Pengiriman (D-117): kloter antar program menumpang event induk — mesin penugasan yang sama.
  const [kloterProgram, orang, kendaraan] =
    p.status === "disetujui"
      ? await Promise.all([
          prisma.event_kloters.findMany({
            where: { program_id: p.id },
            orderBy: [{ depart_time: "asc" }, { no: "asc" }],
            include: {
              event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } }, vehicles: { select: { name: true } } } },
              kloter_tracking: { orderBy: { at: "asc" }, include: { users: { select: { name: true } } } },
            },
          }),
          prisma.users.findMany({ where: { is_active: true, role: { in: ["captain", "driver", "field", "dapur", "kepala_dapur", "gudang"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
          prisma.vehicles.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        ])
      : [[], [], []];
  const kloter: KloterTampil[] = kloterProgram.map((k) => ({
    id: k.id.toString(),
    tanggal: k.date.toISOString().slice(0, 10),
    no: k.no,
    jam: k.depart_time,
    catatan: k.note,
    lacak: k.kloter_tracking.map((x) => ({ id: x.id.toString(), status: x.status, jam: jamWib.format(x.at).replace(":", "."), foto: Boolean(x.photo_path), oleh: x.users?.name ?? null })),
    anggota: k.event_assignments.map((a) => ({ id: a.id.toString(), nama: a.users?.name ?? a.person_name ?? "?", peran: a.role, kendaraan: a.vehicles?.name ?? null, tugas: a.task_note, siap: Boolean(a.confirmed_at) })),
  }));
  const lap = p.status === "disetujui" ? (await laporanProgram(sesi, [p.id]))[0] : null;
  const pilihanKloter = kloter.map((k) => ({ nilai: k.id, label: `Kloter ${k.no} · ${k.jam}` }));
  const belumKloter = aktif.filter((o) => !o.kloter_id && o.area_status !== "ditolak" && o.area_status !== "menunggu").length;
  const untung = await untungProgram(sesi, p.id); // null untuk peran tanpa izin biaya — HPP tidak dikirim
  const perSet = new Map(untung?.paket.map((x) => [x.idSet, x]) ?? []);
  const bisaUbah = p.status === "diusulkan" || p.status === "dikembalikan";
  const tanggalKirim = p.delivery_date.toISOString().slice(0, 10);
  // Form pesan online (D-119): link publik + draf WA konfirmasi per pesanan (admin sendiri yang menekan kirim).
  const [asal, perusahaan, angka] = await Promise.all([asalSitus(), prisma.company_settings.findUnique({ where: { id: BigInt(1) } }), bacaPengaturanBisnis()]);
  const linkOnline = p.slug ? `${asal}/pesan/${p.slug}` : null;
  const qr = linkOnline ? await QRCode.toDataURL(linkOnline, { width: 240, margin: 1 }) : null;
  const rekening = perusahaan?.bank_account_number
    ? `${perusahaan.bank_name ?? ""} ${perusahaan.bank_account_number}${perusahaan.bank_account_holder ? ` a.n. ${perusahaan.bank_account_holder}` : ""}`.trim()
    : null;
  const waPesanan = (o: (typeof p.retail_orders)[number]) =>
    tautanWa(
      o.phone,
      draftKonfirmasi({
        nama: o.recipient_name,
        program: p.name,
        paket: o.retail_order_items.map((i) => `${i.retail_program_sets.title} × ${i.pax} pax`),
        total: Number(o.invoices?.grand_total ?? 0),
        ongkir: Number(o.invoices?.delivery_amount ?? 0),
        tanggalKirim,
        jam: o.receive_time,
        alamat: o.address,
        bayar: o.payment_mode,
        rekening,
        link: o.public_token ? `${asal}/pesanan/${o.public_token}` : null,
      }),
    );
  const flyer = teksFlyer({
    tanggalKirim,
    batasOrder: { tanggal: tglWib.format(p.order_deadline), jam: jamWib.format(p.order_deadline).replace(":", ".") },
    paket: p.retail_program_sets.map((s) => ({ judul: s.title, isi: s.retail_program_set_items.map((i) => i.name) })),
    harga: Number(p.price_per_pax),
    minPax: p.min_pax,
    area: p.area,
    kontak: p.contact,
    link: linkOnline,
  });

  return (
    <Halaman>
      <div className="pb-5">
        <Link href="/ikut-menu-pesta" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Semua program
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <UtensilsCrossed className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-primary-strong sm:text-[1.875rem]">{p.name}</h1>
            <Pil nada={nadaStatus(p.status)}>{STATUS_PROGRAM[p.status as StatusProgram] ?? p.status}</Pil>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ikut acara{" "}
            <Link href={`/event/${p.events.id}`} className="text-primary underline-offset-4 hover:underline">
              {p.events.customers.name}
            </Link>
            {[p.events.first_date ? hari.format(p.events.first_date) : null, p.events.name].filter(Boolean).map((x) => ` · ${x}`)}
          </p>
        </div>
        {bisaUbah ? (
          <Button variant="outline" className="rounded-full bg-card" render={<Link href={`/ikut-menu-pesta/${p.id}/ubah`} />}>
            <Pencil className="size-4" />
            Ubah usulan
          </Button>
        ) : null}
      </header>

      {p.decision_note || p.decided_at ? (
        <p className={cn("mb-5 rounded-2xl border px-4 py-3 text-sm", p.status === "disetujui" ? "bg-lunas-halus" : "border-perhatian-garis bg-perhatian-halus")}>
          <b className="font-semibold">{STATUS_PROGRAM[p.status as StatusProgram]}</b>
          {p.users_retail_programs_decided_byTousers ? ` oleh ${p.users_retail_programs_decided_byTousers.name}` : ""}
          {p.decided_at ? ` · ${waktu.format(p.decided_at)}` : ""}
          {p.decision_note ? ` — ${p.decision_note}` : ""}
        </p>
      ) : null}

      <div className="grid gap-3.5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3.5 lg:col-span-2">
          <BagianForm judul="Jadwal & aturan pesan">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
              <Data label="Tanggal kirim" isi={hari.format(p.delivery_date)} />
              <Data label="Batas order" isi={`${waktu.format(p.order_deadline)} WIB`} />
              <Data label="Harga per pax" isi={`${rupiah(p.price_per_pax.toString())} + PBJT`} />
              <Data label="Minimal order" isi={`${p.min_pax} pax`} />
              <Data label="Kuota" isi={p.max_pax ? `${p.max_pax} pax` : "Tanpa batas"} />
              <Data label="Area gratis kirim" isi={p.area} />
              <Data label="Kontak pemesanan" isi={p.contact ?? "—"} />
              <Data label="Diusulkan" isi={`${p.users_retail_programs_proposed_byTousers?.name ?? "—"} · ${waktu.format(p.proposed_at)}`} />
            </dl>
            {p.notes ? <p className="rounded-[12px] bg-muted/40 px-4 py-3 text-[0.9375rem]">{p.notes}</p> : null}
          </BagianForm>

          {p.retail_program_sets.map((s) => {
            const u = perSet.get(s.id.toString());
            const peringatan = peringatanPaket(s.retail_program_set_items.map((i) => ({ nama: i.name, kategori: i.menus?.category ?? null })));
            return (
              <BagianForm key={s.id.toString()} judul={s.title}>
                <table className="w-full text-[0.9375rem]">
                  <tbody>
                    {s.retail_program_set_items.map((i, j) => (
                      <tr key={i.id.toString()} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          {i.name}
                          {!i.from_event ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">bukan masakan acara</span> : null}
                        </td>
                        {u ? (
                          <td className="py-2 text-right whitespace-nowrap">
                            {u.hppPerMenu[j]?.hpp != null ? (
                              <span className="font-mono tabular-nums">{rupiah(u.hppPerMenu[j].hpp!)}</span>
                            ) : (
                              <span className="text-sm text-perhatian">HPP belum ada</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {u ? (
                  <div className="grid grid-cols-2 gap-3 rounded-[12px] bg-muted/40 p-4 text-[0.9375rem] sm:grid-cols-4">
                    <Angka label="Biaya per pax" isi={u.biayaPerPax != null ? rupiah(u.biayaPerPax) : "—"} sub={`HPP + kemasan ${rupiah(untung!.kemasan)}`} />
                    <Angka label="Untung per pax" isi={u.untungPerPax != null ? rupiah(u.untungPerPax) : "—"} warna={WARNA[u.nada]} />
                    <Angka label="Untung" isi={u.untungPct != null ? `${u.untungPct.toLocaleString("id-ID")}%` : "—"} warna={WARNA[u.nada]} sub={`aman ≥ ${untung!.amanPct}% · min ${untung!.minPct}%`} />
                    <Angka label="Titik impas" isi={u.impasPax != null ? `${u.impasPax} pax` : "—"} sub={`biaya antar ${rupiah(untung!.biayaAntar)}`} />
                  </div>
                ) : null}
                {u && u.menuTanpaHpp ? <p className="text-sm text-perhatian">{u.menuTanpaHpp} menu belum punya HPP (belum ada di master Menu, atau resepnya belum lengkap) — untung tidak ditebak.</p> : null}
                {peringatan.length ? (
                  <p className="flex items-start gap-2 text-sm text-perhatian">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {peringatan.join(" ")}
                  </p>
                ) : null}
              </BagianForm>
            );
          })}

          {lap ? (
            <BagianForm
              judul="Laporan program"
              keterangan={
                lap.biaya
                  ? `Nilai makanan tanpa PBJT. Untung = nilai makanan + Delivery Fee − HPP − kemasan − biaya antar${lap.antarPerkiraan ? " (biaya antar masih perkiraan Angka Bisnis — honor driver belum dikunci)" : " (honor driver yang sudah dikunci)"}.`
                  : "Ringkasan pesanan & pembayaran."
              }
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Angka label="Pesanan" isi={`${lap.pesanan}`} sub={`${lap.pax} pax`} />
                <Angka label="Nilai makanan" isi={rupiah(lap.omzet)} sub={lap.ongkir ? `+ Delivery Fee ${rupiah(lap.ongkir)}` : "tanpa PBJT"} />
                <Angka label="Sudah dibayar" isi={rupiah(lap.dibayar)} sub={`dari tagihan ${rupiah(lap.tagihan)}`} />
                <Angka label="Tunai di driver" isi={rupiah(lap.tunaiBelumDisetor)} sub="belum dicatat di Payment" warna={lap.tunaiBelumDisetor ? "text-perhatian" : undefined} />
                {lap.biaya ? (
                  <>
                    <Angka label="HPP" isi={lap.hpp != null ? rupiah(lap.hpp) : "—"} sub={lap.hpp == null ? "ada menu tanpa HPP" : "resep saat ini"} />
                    <Angka label="Kemasan + antar" isi={rupiah(lap.kemasan + lap.antar)} sub={`kemasan ${rupiah(lap.kemasan)} · antar ${rupiah(lap.antar)}`} />
                    <Angka
                      label="Untung bersih"
                      isi={lap.untung != null ? rupiah(lap.untung) : "—"}
                      sub={lap.untungPerPax != null ? `${rupiah(lap.untungPerPax)} per pax` : undefined}
                      warna={lap.untung == null ? undefined : lap.untung < 0 ? "text-destructive" : "text-lunas"}
                    />
                    <Angka label="Untung" isi={lap.untungPct != null ? `${lap.untungPct.toLocaleString("id-ID")}%` : "—"} sub="dari nilai makanan" />
                  </>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Pembeli baru {lap.pembeliBaru} · langganan {lap.pesanan - lap.pembeliBaru}
                {Object.keys(lap.asal).length ? ` · dari ${Object.entries(lap.asal).map(([k, n]) => `${ASAL_PESANAN[k as AsalPesanan] ?? k} ${n}`).join(", ")}` : ""}
              </p>
            </BagianForm>
          ) : null}

          {p.status === "disetujui" ? (
            <BagianForm
              judul={`Pesanan · ${aktif.length} pesanan · ${rekap.totalPax} pax${p.max_pax ? ` dari kuota ${p.max_pax}` : ""}`}
              keterangan={
                ditutup
                  ? `Batas order sudah lewat (${waktu.format(p.order_deadline)}). Pesanan baru tetap bisa dicatat dan diberi tanda "telat".`
                  : `Dibuka sampai ${waktu.format(p.order_deadline)} WIB. Tiap pesanan langsung jadi customer + invoice retail.`
              }
            >
              <div>
                <Button className="rounded-full" render={<Link href={`/ikut-menu-pesta/${p.id}/pesanan/baru`} />}>
                  <Plus className="size-4" />
                  Catat pesanan
                </Button>
              </div>
              {p.retail_orders.length === 0 ? (
                <p className="text-[0.9375rem] text-muted-foreground">Belum ada pesanan.</p>
              ) : (
                <ul className="flex flex-col">
                  {p.retail_orders.map((o) => (
                    <li key={o.id.toString()} className={cn("flex flex-col gap-1.5 border-b py-3.5 last:border-0", o.status === "batal" && "opacity-60")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{o.recipient_name}</span>
                        <span className="text-sm text-muted-foreground">{o.phone}</span>
                        {o.status === "batal" ? <Pil>Batal</Pil> : null}
                        {o.status === "aktif" && perluKonfirmasi(o) ? <Pil nada="perhatian">Baru — perlu dikonfirmasi</Pil> : null}
                        {o.is_late ? <Pil nada="perhatian">Telat</Pil> : null}
                        {o.payment_mode === "cod" ? <Pil>Bayar saat kirim</Pil> : null}
                        {o.outside_area ? (
                          <Pil nada={o.area_status === "disetujui" ? "baik" : "perhatian"}>
                            Luar area · {o.area_status === "menunggu" ? "menunggu Mba Ari" : o.area_status === "disetujui" ? "disetujui" : "ditolak"}
                          </Pil>
                        ) : null}
                      </div>
                      <p className="text-[0.9375rem]">{o.retail_order_items.map((i) => `${i.retail_program_sets.title} × ${i.pax} pax`).join(" · ")}</p>
                      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          {o.address}
                          {o.receive_time ? ` · terima ${o.receive_time}` : ""}
                          {` · ${ASAL_PESANAN[o.source as AsalPesanan] ?? o.source}`}
                          {o.notes ? ` · ${o.notes}` : ""}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          {o.invoices ? (
                            <>
                              <Link href={`/tagihan/${o.invoices.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                                {o.invoices.invoice_number}
                              </Link>
                              <span className="font-mono font-semibold tabular-nums">{rupiah(o.invoices.grand_total.toString())}</span>
                              <StatusTagihan status={o.invoices.status} />
                            </>
                          ) : null}
                          {o.status === "batal" && o.cancel_reason ? <span className="text-muted-foreground">— {o.cancel_reason}</span> : null}
                          {o.transfer_proof && o.invoices?.status !== "paid" ? (
                            <a href={`/ikut-menu-pesta/foto/${o.id}?jenis=transfer`} target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-4">
                              Bukti transfer dari pembeli
                            </a>
                          ) : null}
                          {o.transfer_proof && o.invoices && o.invoices.status !== "paid" ? (
                            <Link href={`/pembayaran/baru?tagihan=${o.invoices.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                              Catat di Payment
                            </Link>
                          ) : null}
                        </span>
                        {o.status === "aktif" && !o.delivered_at && o.area_status !== "menunggu" && o.area_status !== "ditolak" ? (
                          <AntarPesanan id={o.id.toString()} kloter={pilihanKloter} terpilih={o.kloter_id?.toString() ?? null} />
                        ) : null}
                        {o.delivered_at ? (
                          <span className="text-sm text-lunas">
                            ✅ Diantar {waktu.format(o.delivered_at)}
                            {o.users_retail_orders_delivered_byTousers ? ` · ${o.users_retail_orders_delivered_byTousers.name}` : ""}
                            {o.delivery_photo ? (
                              <>
                                {" · "}
                                <a href={`/ikut-menu-pesta/foto/${o.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">
                                  foto
                                </a>
                              </>
                            ) : null}
                            {o.payment_mode === "cod"
                              ? o.cod_collected !== null
                                ? ` · tunai ${rupiah(o.cod_collected.toString())} diterima driver`
                                : " · belum bayar"
                              : ""}
                          </span>
                        ) : null}
                        {o.cod_collected !== null && o.invoices && o.invoices.status !== "paid" ? (
                          <Link href={`/pembayaran/baru?tagihan=${o.invoices.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                            Catat setoran tunai di Payment
                          </Link>
                        ) : null}
                        {o.status === "aktif" && perluKonfirmasi(o) ? (
                          <KonfirmasiPesanan id={o.id.toString()} nama={o.recipient_name} luar={o.outside_area} ongkirBawaan={angka.delivery_fee.jabodetabek} wa={waPesanan(o)} />
                        ) : o.status === "aktif" && !o.delivered_at ? (
                          <Button size="sm" variant="ghost" className="rounded-full" render={<a href={waPesanan(o)} target="_blank" rel="noopener" />}>
                            <MessageCircle className="size-3.5" />
                            Chat WA
                          </Button>
                        ) : null}
                        {o.status === "aktif" ? (
                          <AksiPesanan id={o.id.toString()} nama={o.recipient_name} bolehArea={aksesPenuh(sesi.peran)} menungguArea={o.area_status === "menunggu"} />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </BagianForm>
          ) : null}

          {p.status === "disetujui" ? (
            <BagianForm
              judul="Pengiriman"
              keterangan={`Kloter antar ${hari.format(p.delivery_date)}: driver & mobil, lalu masukkan pesanan ke kloter di daftar pesanan. Driver melapor per alamat dari HP (Jadwal saya).${belumKloter ? ` ${belumKloter} pesanan belum masuk kloter.` : ""}`}
            >
              <PenugasanEvent
                idEvent={p.events.id.toString()}
                idProgram={p.id.toString()}
                tanggal={[tanggalKirim]}
                kloter={kloter}
                orang={orang.map((u) => ({ id: u.id.toString(), label: u.name }))}
                kendaraan={kendaraan.map((v) => ({ nilai: v.id.toString(), label: v.name }))}
                ubah={bolehUbahEvent(sesi.peran)}
              />
            </BagianForm>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {untung && (untung.kemasan === 0 || untung.biayaAntar === 0) ? (
            <p className="rounded-2xl border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
              {[untung.kemasan === 0 ? "biaya kemasan per pax" : null, untung.biayaAntar === 0 ? "biaya antar per program" : null].filter(Boolean).join(" dan ")} belum
              diisi — untung terlihat lebih besar dari aslinya.{" "}
              <Link href="/angka-bisnis" className="underline underline-offset-4">
                Isi di Angka Bisnis
              </Link>
            </p>
          ) : null}
          {p.status === "diusulkan" && bolehSetujuiProgram(sesi.peran) ? (
            <BagianForm judul="Keputusan" keterangan="Apakah HPP-nya masuk dengan harga jual ini?">
              <KeputusanProgram id={p.id.toString()} />
            </BagianForm>
          ) : null}
          {p.status === "disetujui" ? (
            <BagianForm judul="Untuk dapur" keterangan="Porsi dari pesanan aktif — ikut masuk Kebutuhan Bahan, Belanja (PR), dan Layar Dapur di tanggal kirim.">
              <ul className="flex flex-col gap-1 text-[0.9375rem]">
                {rekap.paket.map((x) => (
                  <li key={x.idSet} className="flex justify-between gap-3">
                    <span>{x.judul}</span>
                    <span className="font-mono font-semibold tabular-nums">{x.pax} pax</span>
                  </li>
                ))}
              </ul>
              {rekap.menu.length ? (
                <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
                  {rekap.menu.map((m) => (
                    <li key={m.nama} className="flex justify-between gap-3">
                      <span>{m.nama}</span>
                      <span className="font-mono tabular-nums">{m.porsi} porsi</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </BagianForm>
          ) : null}
          <BagianForm
            judul="Bahan flyer"
            keterangan={p.status === "disetujui" ? "Untuk tim sosmed — salin, lalu pakai untuk desain flyer." : "Bisa disalin setelah program disetujui."}
          >
            {linkOnline ? (
              <div className="flex flex-col gap-2 rounded-[12px] border p-3.5">
                <p className="text-sm text-muted-foreground">Link form pesan online — taruh di flyer (QR), bio IG, atau bagikan ke pembeli:</p>
                <a href={linkOnline} target="_blank" rel="noopener" className="font-medium break-all text-primary underline-offset-4 hover:underline">
                  {linkOnline}
                </a>
                <div className="flex flex-wrap items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL kecil, bukan gambar yang perlu dioptimasi */}
                  {qr ? <img src={qr} alt="QR link pesan online" width={120} height={120} className="rounded-lg border bg-white p-1" /> : null}
                  <div className="flex flex-wrap gap-2">
                    <SalinTeks teks={linkOnline} label="Salin link" />
                    <Button size="sm" variant="outline" className="rounded-full" render={<a href={`/ikut-menu-pesta/${p.id}/qr`} download />}>
                      <QrCode className="size-4" />
                      Unduh QR
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <pre className="rounded-[12px] bg-muted/40 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">{flyer}</pre>
            {p.status === "disetujui" ? <SalinTeks teks={flyer} label="Salin bahan flyer" /> : null}
          </BagianForm>
        </div>
      </div>
    </Halaman>
  );
}

function Data({ label, isi }: { label: string; isi: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{isi}</dd>
    </div>
  );
}

function Angka({ label, isi, sub, warna }: { label: string; isi: string; sub?: string; warna?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-lg font-semibold tabular-nums", warna)}>{isi}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
