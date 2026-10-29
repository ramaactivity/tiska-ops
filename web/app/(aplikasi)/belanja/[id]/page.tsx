import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { LABEL_STATUS_PR, type StatusPr } from "@/lib/belanja";
import { nilaiBaris, totalBelanja } from "@/lib/hitung/belanja";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bolehKelolaUang, bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { d, rupiah } from "@/lib/uang";

import { EditorPr, PanelFinance, TombolBatal, TombolSelesai } from "./editor-pr";

export const metadata: Metadata = { title: "Detail PR" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const angka = (v: { toString(): string } | null) => (v == null ? "" : Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 }));

/* Detail Purchase Request (D-075). Harga perkiraan hanya dikirim ke peran yang boleh melihat biaya. */
export default async function HalamanPr({ params }: PageProps<"/belanja/[id]">) {
  const sesi = await wajibIzin("belanja");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const pr = await prisma.purchase_requests.findUnique({
    where: { id: BigInt(id) },
    include: {
      purchase_request_items: { orderBy: { sort: "asc" } },
      users_purchase_requests_created_byTousers: { select: { name: true } },
      users_purchase_requests_submitted_byTousers: { select: { name: true } },
      users_purchase_requests_approved_byTousers: { select: { name: true } },
    },
  });
  if (!pr) notFound();
  const lihatHarga = bolehLihatBiaya(sesi.peran);
  const kelolaUang = bolehKelolaUang(sesi.peran);
  const status = pr.status as StatusPr;
  const draft = status === "draft";

  const realisasi = status === "disetujui" || status === "selesai";
  const [nota, dana, izin] = await Promise.all([
    realisasi
      ? prisma.purchases.findMany({ where: { pr_id: pr.id, status: "posted" }, orderBy: { id: "asc" }, select: { id: true, purchase_number: true, shop_name: true, total: true } })
      : [],
    realisasi ? prisma.cash_advances.findMany({ where: { pr_id: pr.id, status: "posted", kind: { in: ["topup", "pengembalian"] } }, select: { kind: true, amount: true } }) : [],
    bacaIzin(),
  ]);
  const totalNyata = nota.reduce((s, n) => s.plus(n.total), d(0));
  const danaMasuk = dana.reduce((s, m) => (m.kind === "topup" ? s.plus(m.amount) : s.minus(m.amount)), d(0));
  const bisaBelanja = bolehBuka(sesi.peran, "uang-muka", izin);
  const [event, bahan] = await Promise.all([
    prisma.events.findMany({ where: { id: { in: pr.event_ids } }, select: { id: true, name: true, customers: { select: { name: true } } } }),
    draft ? prisma.ingredients.findMany({ where: { merged_into: null }, select: { id: true, code: true, name: true, purchase_unit: true, usage_unit: true }, orderBy: { name: "asc" } }) : [],
  ]);
  const baris = pr.purchase_request_items.map((b) => ({
    id: b.id.toString(),
    idBahan: b.ingredient_id?.toString() ?? null,
    nama: b.item_name,
    perlu: b.qty_needed
      ? `${angka(b.qty_needed)} ${b.usage_unit ?? ""}${b.qty_from_stock ? ` · ${angka(b.qty_from_stock)} diambil dari stok` : ""}`.trim()
      : null,
    qtyBeli: b.qty_to_buy.toString(),
    satuanBeli: b.buy_unit,
    note: b.note,
    manual: b.source === "manual",
    // 🔒 Hanya untuk owner/finance — dibuang di server untuk peran lain.
    nilai: lihatHarga ? (b.est_price == null ? null : nilaiBaris(b.qty_to_buy, b.est_price).toNumber()) : undefined,
    harga: lihatHarga ? (b.est_price == null ? null : Number(b.est_price)) : undefined,
  }));
  const { tanpaHarga } = totalBelanja(pr.purchase_request_items.map((b) => ({ qtyBeli: b.qty_to_buy, hargaPerkiraan: b.est_price })));

  const jejak = [
    pr.users_purchase_requests_created_byTousers ? `Dibuat ${pr.users_purchase_requests_created_byTousers.name} · ${waktu.format(pr.created_at)}` : null,
    pr.submitted_at ? `Diajukan ${pr.users_purchase_requests_submitted_byTousers?.name ?? ""} · ${waktu.format(pr.submitted_at)}` : null,
    pr.approved_at ? `Disetujui ${pr.users_purchase_requests_approved_byTousers?.name ?? ""} · ${waktu.format(pr.approved_at)}` : null,
  ].filter(Boolean);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ClipboardList}
        judul={pr.pr_number}
        keterangan={`Belanja untuk ${hari.format(pr.need_date)}`}
        aksi={<Pil nada={status === "disetujui" ? "baik" : status === "diajukan" ? "perhatian" : "netral"}>{LABEL_STATUS_PR[status] ?? status}</Pil>}
      />
      <div className="flex flex-col gap-4">
        {draft && pr.finance_note ? (
          <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
            <p className="font-medium">Dikembalikan Finance:</p>
            <p className="whitespace-pre-line">{pr.finance_note}</p>
          </section>
        ) : null}

        <section className="rounded-[14px] border bg-card p-5">
          <h2 className="eyebrow pb-2">Untuk event</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {event.map((e) => (
              <li key={e.id.toString()}>
                <Link href={`/event/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                  {e.name}
                </Link>
                <span className="text-muted-foreground"> · {e.customers.name}</span>
              </li>
            ))}
          </ul>
          {jejak.length ? <p className="pt-3 text-xs text-muted-foreground">{jejak.join(" · ")}</p> : null}
        </section>

        {status === "disetujui" && pr.transfer_amount != null ? (
          <section className="rounded-[14px] border bg-lunas-halus p-4 text-sm text-lunas">
            Disetujui — dana belanja <b className="font-mono tabular-nums">{rupiah(pr.transfer_amount)}</b>
          </section>
        ) : null}

        {realisasi ? (
          <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5">
            <h2 className="eyebrow">Realisasi belanja</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {lihatHarga ? (
                <div>
                  <dt className="text-muted-foreground">Perkiraan</dt>
                  <dd className="font-mono tabular-nums">{rupiah(pr.est_total)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Dana masuk ke pemegang</dt>
                <dd className="font-mono tabular-nums">{rupiah(danaMasuk)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Belanja nyata · {nota.length} nota/penerimaan</dt>
                <dd className="font-mono tabular-nums">{rupiah(totalNyata)}</dd>
              </div>
            </dl>
            {nota.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {nota.map((n) => (
                  <li key={n.id.toString()} className="flex justify-between gap-3">
                    <Link href={`/uang-muka/belanja/${n.id}`} className="underline-offset-4 hover:underline">
                      <span className="font-mono">{n.purchase_number}</span> {n.shop_name ? `· ${n.shop_name}` : ""}
                    </Link>
                    <span className="font-mono tabular-nums">{rupiah(n.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada nota belanja untuk PR ini.</p>
            )}
            {status === "disetujui" ? (
              <div className="flex flex-wrap justify-end gap-2">
                {bolehBuka(sesi.peran, "po", izin) ? (
                  <Link href={`/po/baru?pr=${pr.id}`} className="inline-flex h-10 items-center rounded-[10px] border px-4 text-sm font-medium hover:bg-accent">
                    Buat PO supplier
                  </Link>
                ) : null}
                {bisaBelanja ? (
                  <Link href={`/uang-muka/belanja/baru?pr=${pr.id}`} className="inline-flex h-10 items-center rounded-[10px] border px-4 text-sm font-medium hover:bg-accent">
                    Catat belanja
                  </Link>
                ) : null}
                {nota.length && (kelolaUang || pr.created_by?.toString() === sesi.id) ? <TombolSelesai id={id} /> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {status === "diajukan" && kelolaUang ? (
          <PanelFinance id={id} total={Number(pr.est_total)} tanpaHarga={tanpaHarga} />
        ) : status === "diajukan" ? (
          <section className="rounded-[14px] border bg-card p-4 text-sm text-muted-foreground">Menunggu persetujuan Finance. Isi tidak bisa diubah sampai disetujui atau dikembalikan.</section>
        ) : null}

        <EditorPr
          id={id}
          bisaUbah={draft}
          lihatHarga={lihatHarga}
          baris={baris}
          catatan={pr.notes ?? ""}
          bahan={bahan.map((b) => ({ id: b.id.toString(), label: b.name, sub: [b.code, b.purchase_unit ?? b.usage_unit].filter(Boolean).join(" · ") }))}
        />

        <div className="flex flex-wrap justify-end gap-2">
          {status !== "selesai" && status !== "batal" && (status !== "disetujui" || kelolaUang) ? <TombolBatal id={id} /> : null}
        </div>
      </div>
    </Halaman>
  );
}
