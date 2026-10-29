import { ArrowLeft, MapPin, Pencil, Plus, TriangleAlert, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BagianForm, Halaman, Pil } from "@/components/halaman";
import { StatusTagihan } from "@/components/lencana-status";
import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { ASAL_PESANAN, type AsalPesanan, nadaStatus, peringatanPaket, rekapPorsi, STATUS_PROGRAM, type StatusProgram, teksFlyer } from "@/lib/hitung/ikut-menu-pesta";
import { untungProgram } from "@/lib/ikut-menu-pesta";
import { aksesPenuh, bolehSetujuiProgram } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { AksiPesanan } from "./aksi-pesanan";
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
          invoices: { select: { id: true, invoice_number: true, status: true, grand_total: true } },
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
  const untung = await untungProgram(sesi, p.id); // null untuk peran tanpa izin biaya — HPP tidak dikirim
  const perSet = new Map(untung?.paket.map((x) => [x.idSet, x]) ?? []);
  const bisaUbah = p.status === "diusulkan" || p.status === "dikembalikan";
  const tanggalKirim = p.delivery_date.toISOString().slice(0, 10);
  const flyer = teksFlyer({
    tanggalKirim,
    batasOrder: { tanggal: tglWib.format(p.order_deadline), jam: jamWib.format(p.order_deadline).replace(":", ".") },
    paket: p.retail_program_sets.map((s) => ({ judul: s.title, isi: s.retail_program_set_items.map((i) => i.name) })),
    harga: Number(p.price_per_pax),
    minPax: p.min_pax,
    area: p.area,
    kontak: p.contact,
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
                        </span>
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
