import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { TombolBatalNota } from "./tombol-batal";

export const metadata: Metadata = { title: "Nota belanja" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });

/* Nota belanja (D-081): hanya pemegangnya sendiri atau Finance. */
export default async function HalamanNota({ params }: PageProps<"/uang-muka/belanja/[id]">) {
  const sesi = await wajibIzin("uang-muka");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const kelola = bolehKelolaUang(sesi.peran);
  const b = await prisma.purchases.findUnique({
    where: { id: BigInt(id) },
    include: {
      purchase_items: { orderBy: { sort: "asc" } },
      purchase_requests: { select: { id: true, pr_number: true } },
      users_purchases_holder_user_idTousers: { select: { name: true } },
      users_purchases_created_byTousers: { select: { name: true } },
      users_purchases_cancelled_byTousers: { select: { name: true } },
      suppliers: { select: { name: true } },
      purchase_orders: { select: { id: true, po_number: true } },
      supplier_payables: { select: { status: true, due_date: true, paid_at: true } },
    },
  });
  // Penerimaan PO tempo (D-083) terbuka untuk tim purchasing; nota uang muka hanya pemegangnya & Finance.
  const tempo = b?.payment_method === "tempo";
  if (!b || (!kelola && !tempo && b.holder_user_id.toString() !== sesi.id)) notFound();
  const hutang = b.supplier_payables;
  const foto = b.receipt_paths as string[];

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ShoppingCart}
        judul={b.purchase_number}
        keterangan={`${tempo ? `Penerimaan barang · ${b.suppliers?.name ?? ""}` : (b.shop_name ?? "Belanja")} · ${hari.format(b.purchased_at)}`}
        aksi={b.status === "batal" ? <Pil>Dibatalkan</Pil> : <Pil nada="baik">Tercatat</Pil>}
      />
      <div className="flex flex-col gap-4">
        {b.status === "batal" ? (
          <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
            <b>Nota ini dibatalkan</b>
            {b.cancelled_at ? ` pada ${waktu.format(b.cancelled_at)}` : ""}
            {b.users_purchases_cancelled_byTousers ? ` oleh ${b.users_purchases_cancelled_byTousers.name}` : ""} — {b.cancel_reason}. Saldo uang muka sudah dikembalikan.
          </section>
        ) : null}
        <section className="rounded-[14px] border bg-card p-5 text-sm">
          <p>
            {tempo ? "Diterima oleh" : "Pemegang uang muka"}: <b>{b.users_purchases_holder_user_idTousers.name}</b>
            {b.purchase_orders ? (
              <>
                {" · "}
                <Link href={`/po/${b.purchase_orders.id}`} className="font-mono underline-offset-4 hover:underline">
                  {b.purchase_orders.po_number}
                </Link>
              </>
            ) : null}
            {b.purchase_requests ? (
              <>
                {" · untuk "}
                <Link href={`/belanja/${b.purchase_requests.id}`} className="font-mono underline-offset-4 hover:underline">
                  {b.purchase_requests.pr_number}
                </Link>
              </>
            ) : null}
          </p>
          {hutang ? (
            <p className="pt-1">
              Hutang ke supplier:{" "}
              {hutang.status === "lunas" && hutang.paid_at ? <b>lunas {hari.format(hutang.paid_at)}</b> : <b>jatuh tempo {hari.format(hutang.due_date)}</b>}
            </p>
          ) : null}
          <p className="pt-1 text-xs text-muted-foreground">
            Dicatat {b.users_purchases_created_byTousers?.name ?? ""} · {waktu.format(b.created_at)}
          </p>
        </section>

        <section className="rounded-[14px] border bg-card">
          <h2 className="eyebrow border-b p-4">Barang · {b.purchase_items.length}</h2>
          <ul className="divide-y">
            {b.purchase_items.map((i) => (
              <li key={i.id.toString()} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.item_name}</p>
                  <p className="font-mono text-sm tabular-nums text-muted-foreground">
                    {angka(i.qty)} {i.unit ?? ""} × {rupiah(i.unit_price)}
                  </p>
                </div>
                <span className="shrink-0 text-right font-mono tabular-nums">{rupiah(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t p-4">
            <span className="font-semibold">Total</span>
            <span className="uang text-xl">{rupiah(b.total)}</span>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-[14px] border bg-card p-5">
          <h2 className="eyebrow">Nota</h2>
          {foto.length ? (
            <div className="flex flex-wrap gap-2">
              {foto.map((_, n) => (
                <a key={n} href={`/uang-muka/belanja/${b.id}/nota/${n}`} target="_blank" rel="noreferrer" className="block size-28 overflow-hidden rounded-[10px] border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- tautan bertanda tangan, bukan aset statis */}
                  <img src={`/uang-muka/belanja/${b.id}/nota/${n}`} alt={`Foto nota ${n + 1}`} className="size-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-perhatian">Tanpa nota — {b.no_receipt_reason}</p>
          )}
          {b.notes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{b.notes}</p> : null}
        </section>

        {kelola && b.status === "posted" && !tempo ? (
          <div className="flex justify-end">
            <TombolBatalNota id={id} nomor={b.purchase_number} />
          </div>
        ) : null}
      </div>
    </Halaman>
  );
}
