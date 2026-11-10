import { FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { labelKategori } from "@/lib/biaya";
import { LABEL_HONOR, type StatusHonor } from "@/lib/hitung/honor";
import { PERAN_TUGAS, type PeranTugas } from "@/lib/hitung/penugasan";
import { LABEL_REKAP, type StatusRekap } from "@/lib/hitung/rekap-event";
import { bolehLihatBiaya } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";
import { dataRekapEvent } from "@/lib/rekap-event";
import { nilaiBiaya, rupiah } from "@/lib/uang";

import { AksiRekap } from "./aksi-rekap";

export const metadata: Metadata = { title: "Rekap event" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const hari = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border bg-card">
      <h2 className="eyebrow border-b p-4">{judul}</h2>
      <div className="p-4 text-sm">{children}</div>
    </section>
  );
}

/* Rekap event (01-SPEC I, D-092) — owner/Finance. Biaya nyata dari data operasional → laporan Margin. */
export default async function HalamanRekap({ params }: PageProps<"/event/[id]/rekap">) {
  const sesi = await wajibIzin("event");
  if (!bolehLihatBiaya(sesi.peran)) notFound();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await dataRekapEvent(BigInt(id));
  if (!r) notFound();
  const { e } = r;
  const status = e.recap_status as StatusRekap | null;
  const jejak = [
    e.recap_submitted_at ? `Diajukan ${e.users_events_recap_submitted_byTousers?.name ?? ""} · ${waktu.format(e.recap_submitted_at)}` : null,
    e.recap_approved_at ? `Disetujui ${e.users_events_recap_approved_byTousers?.name ?? ""} · ${waktu.format(e.recap_approved_at)}` : null,
    e.recap_locked_at ? `Dikunci ${e.users_events_recap_locked_byTousers?.name ?? ""} · ${waktu.format(e.recap_locked_at)}` : null,
  ].filter(Boolean);

  return (
    <Halaman>
      <Link href={`/event/${id}`} className="text-sm text-primary">
        ← {e.name}
      </Link>
      <KepalaHalaman
        ikon={FileSpreadsheet}
        judul="Rekap event"
        keterangan={`${e.name}${e.invoices ? ` · ${e.invoices.invoice_number}` : " · belum ada invoice"}${jejak.length ? ` · ${jejak.join(" · ")}` : ""}`}
        aksi={<Pil nada={status === "dikunci" ? "baik" : status ? "perhatian" : "netral"}>{status ? LABEL_REKAP[status] : "Belum diajukan"}</Pil>}
      />
      <div className="flex flex-col gap-4">
        {r.margin ? (
          <PapanAngka kolom={4}>
            <KartuAngka label="Penjualan (invoice)" nilai={rupiah(r.margin.net_sales)} />
            <KartuAngka label="Total biaya" nilai={rupiah(r.margin.total_cost)} keterangan="otomatis + manual" />
            <KartuAngka label="Untung" nilai={rupiah(r.margin.profit)} nada={r.margin.profit.lt(0) ? "perhatian" : "netral"} />
            <KartuAngka label="Margin" nilai={`${r.margin.margin_percent.toFixed(1)}%`} />
          </PapanAngka>
        ) : (
          <p className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">Event ini belum punya invoice — untung belum bisa dihitung dan biaya belum bisa masuk laporan Margin.</p>
        )}

        <AksiRekap
          id={id}
          status={status}
          adaInvoice={Boolean(e.invoices)}
          marginFinal={e.invoices?.invoice_margins?.status === "final"}
          bolehKunci={sesi.peran === "admin" || sesi.peran === "owner"}
          admin={sesi.peran === "admin"}
          peringatan={[
            r.honorBelumKunci ? `${r.honorBelumKunci} honor tim/DW belum dikunci Finance — belum ikut dihitung.` : null,
            r.alat.some((a) => a.status !== "kembali" && a.equipment_id) ? "Ada alat milik yang belum dicatat kembali." : null,
            !r.nota.length ? "Belum ada nota/penerimaan belanja yang tertaut PR event ini." : null,
          ].filter((x): x is string => Boolean(x))}
        />

        <Bagian judul="Biaya yang ditulis ke laporan Margin">
          <ul className="flex flex-col gap-1.5">
            {r.otomatis.map((b) => (
              <li key={b.category} className="flex justify-between gap-3">
                <span>
                  {labelKategori(b.category)} <span className="text-xs text-muted-foreground">· otomatis</span>
                </span>
                <span className="font-mono tabular-nums">{rupiah(b.amount)}</span>
              </li>
            ))}
            {r.manual.map((m, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {labelKategori(m.category)} — {m.description} <span className="text-xs text-muted-foreground">· {m.source === "rab" ? "dari RAB" : "manual"}</span>
                </span>
                <span className="font-mono tabular-nums">{rupiah(nilaiBiaya({ estimated_amount: m.estimated_amount?.toString() ?? null, actual_amount: m.actual_amount?.toString() ?? null }))}</span>
              </li>
            ))}
            {!r.otomatis.length && !r.manual.length ? <li className="text-muted-foreground">Belum ada biaya.</li> : null}
          </ul>
          {e.invoices ? (
            <Link href={`/tagihan/${e.invoices.id}/margin`} className="mt-3 inline-block text-primary underline-offset-4 hover:underline">
              Tambah biaya manual (transport, partner fee, PB1 disetor…) di halaman Margin
            </Link>
          ) : null}
        </Bagian>

        <Bagian judul="Bahan baku — rencana vs nyata">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Perkiraan HPP resep (quotation)</dt>
              <dd className="font-mono tabular-nums">{r.perkiraanBahan ? rupiah(r.perkiraanBahan) : "—"}</dd>
              {r.perkiraanTanpaHpp ? <dd className="text-xs text-muted-foreground">{r.perkiraanTanpaHpp} baris tanpa HPP</dd> : null}
            </div>
            <div>
              <dt className="text-muted-foreground">Perkiraan belanja (PR)</dt>
              <dd className="font-mono tabular-nums">{rupiah(r.estPr)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Belanja nyata</dt>
              <dd className="font-mono tabular-nums">{rupiah(r.bahan)}</dd>
            </div>
          </dl>
          {r.nota.length ? (
            <ul className="mt-3 flex flex-col gap-1">
              {r.nota.map((n) => (
                <li key={n.id.toString()} className="flex justify-between gap-3">
                  <Link href={`/uang-muka/belanja/${n.id}`} className="underline-offset-4 hover:underline">
                    <span className="font-mono">{n.purchase_number}</span> · {n.payment_method === "tempo" ? (n.suppliers?.name ?? "supplier") : (n.shop_name ?? "pasar")} · {n.pr}
                    {n.jumlahEvent > 1 ? <span className="text-xs text-perhatian"> · dibagi rata {n.jumlahEvent} event</span> : null}
                  </Link>
                  <span className="font-mono tabular-nums">{rupiah(Number(n.total) / Math.max(1, n.jumlahEvent))}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">Bahan yang diambil dari stok gudang belum dihitung sebagai biaya event (menyusul bersama harga bahan dari nota).</p>
        </Bagian>

        <Bagian judul={`Honor tim & DW · ${rupiah(r.honorTotal)}`}>
          {r.honor.length ? (
            <ul className="flex flex-col gap-1">
              {r.honor.map((h) => (
                <li key={h.id.toString()} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {h.users?.name ?? h.person_name} · {h.role === "dw" && h.task_note ? `DW · ${h.task_note}` : (PERAN_TUGAS[h.role as PeranTugas] ?? h.role)}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · kloter {h.event_kloters.no} {hari.format(h.event_kloters.date)} · {h.attended === false ? "tidak hadir" : h.honor_status ? LABEL_HONOR[h.honor_status as StatusHonor] : "absen belum dikirim"}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">{h.fee != null && (h.honor_status === "dikunci" || h.honor_status === "dibayar") ? rupiah(h.fee) : "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Belum ada tim di kloter event ini.</p>
          )}
        </Bagian>

        <Bagian judul="Peralatan">
          <p>
            {r.rekapAlat.milik} alat milik · {r.rekapAlat.sewaan} sewaan · biaya sewa {rupiah(r.rekapAlat.biayaSewa)}
            {r.rekapAlat.gantiRugi.gt(0) ? ` · ganti rugi bisa ditagih ke klien ${rupiah(r.rekapAlat.gantiRugi)}` : ""}
          </p>
          {r.alat.length ? (
            <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
              {r.alat.map((a) => (
                <li key={a.id.toString()}>
                  {a.item_name} × {a.qty}
                  {a.vendor_name ? ` · sewa ${a.vendor_name}` : ""} · {a.status === "kembali" ? `kembali ${a.qty_back ?? 0}${a.qty_damaged ? `, rusak ${a.qty_damaged}` : ""}${a.qty_lost ? `, hilang ${a.qty_lost}` : ""}` : a.status === "keluar" ? "belum kembali" : "rencana"}
                </li>
              ))}
            </ul>
          ) : null}
        </Bagian>
      </div>
    </Halaman>
  );
}
