import { FileBox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { LABEL_STATUS_PO, type StatusPo } from "@/lib/belanja";
import { nomorWa } from "@/lib/hitung/penagihan";
import { keadaanHutang, sisaTerima, teksPesanPo } from "@/lib/hitung/po";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { AksiPo, FormTerima } from "./aksi-po";

export const metadata: Metadata = { title: "Detail PO" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const iso = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);

/* Detail PO supplier (D-083): pesan → terima (sebagian boleh) → hutang. */
export default async function HalamanDetailPo({ params }: PageProps<"/po/[id]">) {
  await wajibIzin("po");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const po = await prisma.purchase_orders.findUnique({
    where: { id: BigInt(id) },
    include: {
      suppliers: true,
      purchase_requests: { select: { id: true, pr_number: true } },
      purchase_order_items: { orderBy: { sort: "asc" } },
      purchases: {
        where: { status: "posted" },
        orderBy: { id: "asc" },
        select: { id: true, purchase_number: true, purchased_at: true, total: true, supplier_payables: { select: { status: true, due_date: true } } },
      },
      users: { select: { name: true } },
    },
  });
  if (!po) notFound();
  const status = po.status as StatusPo;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const pesan = teksPesanPo({
    nomor: po.po_number,
    kontak: po.suppliers.contact_name,
    tanggalKirim: iso(po.expected_date),
    baris: po.purchase_order_items.map((b) => ({ nama: b.item_name, qty: b.qty.toString(), satuan: b.unit })),
    catatan: po.notes,
  });
  const bisaTerima = status === "dikirim" || status === "sebagian";

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileBox}
        judul={po.po_number}
        keterangan={`${po.suppliers.name} · dipesan ${hari.format(po.order_date)}${po.expected_date ? ` · dikirim ${hari.format(po.expected_date)}` : ""}`}
        aksi={<Pil nada={status === "diterima" ? "baik" : status === "batal" || status === "draft" ? "netral" : "perhatian"}>{LABEL_STATUS_PO[status] ?? status}</Pil>}
      />
      <div className="flex flex-col gap-4">
        {status === "batal" ? (
          <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
            <b>PO ini dibatalkan</b> — {po.cancel_reason}
          </section>
        ) : null}
        <section className="rounded-[14px] border bg-card p-5 text-sm">
          <p>
            {[po.suppliers.contact_name, po.suppliers.phone, po.suppliers.payment_term_days ? `tempo ${po.suppliers.payment_term_days} hari` : "bayar saat barang diterima"].filter(Boolean).join(" · ")}
            {po.purchase_requests ? (
              <>
                {" · untuk "}
                <Link href={`/belanja/${po.purchase_requests.id}`} className="font-mono underline-offset-4 hover:underline">
                  {po.purchase_requests.pr_number}
                </Link>
              </>
            ) : null}
          </p>
          {po.notes ? <p className="pt-1 whitespace-pre-line text-muted-foreground">{po.notes}</p> : null}
          <p className="pt-1 text-xs text-muted-foreground">Dibuat {po.users?.name ?? ""}</p>
        </section>

        {status !== "batal" ? <AksiPo id={id} status={status} pesan={pesan} wa={nomorWa(po.suppliers.phone)} /> : null}

        <section className="rounded-[14px] border bg-card">
          <h2 className="eyebrow border-b p-4">Barang · {po.purchase_order_items.length}</h2>
          <ul className="divide-y">
            {po.purchase_order_items.map((b) => {
              const sisa = sisaTerima(b.qty, b.received_qty);
              return (
                <li key={b.id.toString()} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{b.item_name}</p>
                    <p className="font-mono text-sm tabular-nums text-muted-foreground">
                      {angka(b.qty)} {b.unit ?? ""} × {rupiah(b.unit_price)}
                    </p>
                    {Number(b.received_qty) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Diterima {angka(b.received_qty)} {b.unit ?? ""}
                        {sisa.gt(0) ? ` · sisa ${angka(sisa)}` : " · lengkap"}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-mono tabular-nums">{rupiah(Math.round(Number(b.qty) * Number(b.unit_price)))}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-baseline justify-between border-t p-4">
            <span className="font-semibold">Total PO</span>
            <span className="uang text-xl">{rupiah(po.total)}</span>
          </div>
        </section>

        {bisaTerima ? (
          <FormTerima
            id={id}
            hariIni={hariIni}
            baris={po.purchase_order_items
              .map((b) => ({ poItemId: b.id.toString(), nama: b.item_name, satuan: b.unit ?? "", sisa: sisaTerima(b.qty, b.received_qty).toNumber(), harga: Number(b.unit_price) }))
              .filter((b) => b.sisa > 0)}
          />
        ) : null}

        {po.purchases.length ? (
          <section className="rounded-[14px] border bg-card p-5">
            <h2 className="eyebrow pb-2">Penerimaan barang</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {po.purchases.map((p) => {
                const h = p.supplier_payables;
                const k = h ? keadaanHutang(h.status, iso(h.due_date)!, hariIni) : null;
                return (
                  <li key={p.id.toString()} className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/uang-muka/belanja/${p.id}`} className="underline-offset-4 hover:underline">
                      <span className="font-mono">{p.purchase_number}</span> · {hari.format(p.purchased_at)}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums">{rupiah(p.total)}</span>
                      {h ? <Pil nada={k === "lunas" ? "baik" : k === "lewat" || k === "segera" ? "perhatian" : "netral"}>{k === "lunas" ? "Lunas" : `Jatuh tempo ${hari.format(h.due_date)}`}</Pil> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </Halaman>
  );
}
