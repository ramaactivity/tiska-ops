import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { keadaanHutang } from "@/lib/hitung/po";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { d, rupiah } from "@/lib/uang";

import { TombolBayar } from "./tombol-bayar";

export const metadata: Metadata = { title: "Hutang Supplier" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const iso = (t: Date) => t.toISOString().slice(0, 10);

/* Hutang dagang ke supplier tempo (D-083): yang belum dibayar diurut jatuh tempo terdekat. */
export default async function HalamanHutang() {
  const sesi = await wajibIzin("hutang-supplier");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const pilih = {
    suppliers: { select: { name: true, bank_account: true } },
    purchases: { select: { id: true, purchase_number: true, purchased_at: true, purchase_orders: { select: { id: true, po_number: true } } } },
    users: { select: { name: true } },
  } as const;
  const [belum, lunas] = await Promise.all([
    prisma.supplier_payables.findMany({ where: { status: "belum" }, orderBy: [{ due_date: "asc" }, { id: "asc" }], include: pilih }),
    prisma.supplier_payables.findMany({ where: { status: "lunas" }, orderBy: [{ paid_at: "desc" }, { id: "desc" }], take: 30, include: pilih }),
  ]);
  const lewat = belum.filter((h) => keadaanHutang(h.status, iso(h.due_date), hariIni) === "lewat");
  const segera = belum.filter((h) => keadaanHutang(h.status, iso(h.due_date), hariIni) === "segera");
  const jumlah = (x: typeof belum) => x.reduce((s, h) => s.plus(h.amount), d(0));
  const bayar = bolehKelolaUang(sesi.peran);

  const Baris = ({ h }: { h: (typeof belum)[number] }) => {
    const k = keadaanHutang(h.status, iso(h.due_date), hariIni);
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{h.suppliers.name}</p>
          <p className="text-xs text-muted-foreground">
            <Link href={`/uang-muka/belanja/${h.purchases.id}`} className="font-mono underline-offset-4 hover:underline">
              {h.purchases.purchase_number}
            </Link>
            {h.purchases.purchase_orders ? (
              <>
                {" · "}
                <Link href={`/po/${h.purchases.purchase_orders.id}`} className="font-mono underline-offset-4 hover:underline">
                  {h.purchases.purchase_orders.po_number}
                </Link>
              </>
            ) : null}
            {` · diterima ${hari.format(h.purchases.purchased_at)}`}
            {h.status === "lunas" && h.paid_at ? ` · dibayar ${hari.format(h.paid_at)}${h.users ? ` oleh ${h.users.name}` : ""}` : ""}
            {h.status === "belum" && h.suppliers.bank_account ? ` · ${h.suppliers.bank_account}` : ""}
          </p>
        </div>
        <Pil nada={k === "lunas" ? "baik" : k === "lewat" || k === "segera" ? "perhatian" : "netral"}>
          {k === "lunas" ? "Lunas" : k === "lewat" ? `Lewat jatuh tempo ${hari.format(h.due_date)}` : `Jatuh tempo ${hari.format(h.due_date)}`}
        </Pil>
        <span className="w-32 text-right font-mono tabular-nums">{rupiah(h.amount)}</span>
        {h.status === "belum" && bayar ? <TombolBayar id={h.id.toString()} hariIni={hariIni} /> : null}
      </li>
    );
  };

  return (
    <Halaman>
      <KepalaHalaman ikon={CalendarClock} judul="Hutang Supplier" keterangan="Setiap barang PO yang diterima menjadi hutang, jatuh tempo = tanggal terima + tempo supplier." />
      <div className="flex flex-col gap-4">
        <PapanAngka kolom={3}>
          <KartuAngka label="Belum dibayar" nilai={rupiah(jumlah(belum))} keterangan={`${belum.length} tagihan`} />
          <KartuAngka label="Lewat jatuh tempo" nilai={rupiah(jumlah(lewat))} keterangan={`${lewat.length} tagihan`} nada={lewat.length ? "perhatian" : "netral"} />
          <KartuAngka label="Jatuh tempo ≤ 3 hari" nilai={rupiah(jumlah(segera))} keterangan={`${segera.length} tagihan`} />
        </PapanAngka>
        <section className="kartu">
          <h2 className="eyebrow border-b p-4">Belum dibayar</h2>
          {belum.length ? (
            <ul className="divide-y">
              {belum.map((h) => (
                <Baris key={h.id.toString()} h={h} />
              ))}
            </ul>
          ) : (
            <KeadaanKosong judul="Tidak ada hutang supplier." />
          )}
        </section>
        {lunas.length ? (
          <section className="kartu">
            <h2 className="eyebrow border-b p-4">Sudah dibayar (30 terakhir)</h2>
            <ul className="divide-y">
              {lunas.map((h) => (
                <Baris key={h.id.toString()} h={h} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Halaman>
  );
}
