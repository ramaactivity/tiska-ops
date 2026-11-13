import { BellRing, CalendarClock, Coins, Handshake, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { KATEGORI_TAGIHAN, type KategoriTagihan, labelSisa, ULANGI } from "@/lib/hitung/pengingat-bayar";
import { bacaIzin } from "@/lib/izin";
import { hariIniWib } from "@/lib/kalender";
import { bolehBuka } from "@/lib/navigasi";
import { daftarTagihan, type TagihanTampil } from "@/lib/pengingat-bayar";
import { prisma } from "@/lib/prisma";
import { orderRekanan } from "@/lib/rekanan";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { TombolBayar } from "./tombol-bayar";

export const metadata: Metadata = { title: "Pengingat Bayar" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const tglPendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

/* Pengingat Bayar (D-128): tagihan kantor rutin (wifi, listrik, air…) & sekali bayar (sewa alat, pajak…). Push tiap pagi mulai H-n. */
export default async function HalamanPengingatBayar({ searchParams }: PageProps<"/pengingat-bayar">) {
  const sesi = await wajibIzin("pengingat-bayar");
  const { lihat } = await searchParams;
  const hariIni = hariIniWib();
  const izin = await bacaIzin();
  const seminggu = new Date(Date.parse(`${hariIni}T00:00:00Z`) + 7 * 86_400_000);
  const [aktif, lain, dibayar, hutang, honor, feeSiap] = await Promise.all([
    daftarTagihan("aktif", hariIni),
    lihat === "selesai" ? daftarTagihan("lain", hariIni) : Promise.resolve([]),
    prisma.bill_payments.findMany({
      where: { paid_at: { gte: new Date(Date.parse(`${hariIni}T00:00:00Z`) - 31 * 86_400_000) } },
      orderBy: [{ paid_at: "desc" }, { id: "desc" }],
      take: 30,
      select: { id: true, paid_at: true, due_date: true, amount: true, bills: { select: { id: true, name: true } }, users: { select: { name: true } } },
    }),
    // Satu tempat untuk semua yang jatuh tempo (D-128): hutang supplier & honor tim tetap dibayar di menunya sendiri.
    bolehBuka(sesi.peran, "hutang-supplier", izin) ? prisma.supplier_payables.aggregate({ where: { status: "belum", due_date: { lte: seminggu } }, _count: true, _sum: { amount: true } }) : null,
    bolehBuka(sesi.peran, "honor", izin) ? prisma.event_assignments.aggregate({ where: { honor_status: "dikunci" }, _count: true, _sum: { fee: true } }) : null,
    // Partner Fee rekanan yang kliennya sudah lunas (D-132) — dibayar di menu Rekanan.
    bolehBuka(sesi.peran, "rekanan", izin) ? orderRekanan().then((o) => o.filter((x) => x.status === "siap")) : [],
  ]);
  const perlu = aktif.filter((t) => t.keadaan !== "nanti");
  const nanti = aktif.filter((t) => t.keadaan === "nanti");

  return (
    <Halaman>
      <KepalaHalaman
        ikon={BellRing}
        judul="Pengingat Bayar"
        jumlah={aktif.length}
        keterangan="Tagihan kantor rutin (wifi, listrik, air, BPJS…) dan yang sekali bayar (sewa alat, pajak, pelunasan crew). Pengingat dikirim ke HP tiap pagi mulai H-n sampai dicatat dibayar."
        aksi={
          <Button className="rounded-full" render={<Link href="/pengingat-bayar/baru" />}>
            <Plus className="size-4" />
            Tagihan baru
          </Button>
        }
      />

      {(hutang && hutang._count) || (honor && honor._count) || feeSiap.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {hutang && hutang._count ? (
            <Link href="/hutang-supplier" className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent">
              <CalendarClock className="size-4 text-muted-foreground" />
              Hutang supplier jatuh tempo ≤ 7 hari: <b>{hutang._count}</b> · <span className="font-mono tabular-nums">{rupiah(hutang._sum.amount ?? 0)}</span>
            </Link>
          ) : null}
          {feeSiap.length ? (
            <Link href="/rekanan" className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent">
              <Handshake className="size-4 text-muted-foreground" />
              Partner Fee siap dibayar: <b>{feeSiap.length}</b> order · <span className="font-mono tabular-nums">{rupiah(feeSiap.reduce((n, x) => n + x.fee.jumlah, 0))}</span>
            </Link>
          ) : null}
          {honor && honor._count ? (
            <Link href="/honor" className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent">
              <Coins className="size-4 text-muted-foreground" />
              Honor tim siap dibayar: <b>{honor._count}</b> orang · <span className="font-mono tabular-nums">{rupiah(honor._sum.fee ?? 0)}</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="mb-6">
        <h2 className="eyebrow pb-2">Perlu dibayar</h2>
        {perlu.length ? (
          <Daftar tagihan={perlu} hariIni={hariIni} />
        ) : (
          <p className="kartu px-4 py-6 text-center text-[0.9375rem] text-muted-foreground">
            {aktif.length ? "Belum ada yang perlu dibayar dalam waktu dekat ✅" : "Belum ada tagihan. Tekan Tagihan baru — wifi, listrik, dan air cukup dimasukkan sekali."}
          </p>
        )}
      </section>

      {nanti.length ? (
        <section className="mb-6">
          <h2 className="eyebrow pb-2">Akan datang</h2>
          <Daftar tagihan={nanti} hariIni={hariIni} />
        </section>
      ) : null}

      {dibayar.length ? (
        <section className="mb-6">
          <h2 className="eyebrow pb-2">Sudah dibayar (31 hari terakhir)</h2>
          <ul className="divide-y overflow-hidden kartu">
            {dibayar.map((b) => (
              <li key={b.id.toString()} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[0.9375rem]">
                <Link href={`/pengingat-bayar/${b.bills.id}`} className="font-medium hover:underline">
                  {b.bills.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  periode {tglPendek.format(b.due_date)} · dibayar {hari.format(b.paid_at)}
                  {b.users ? ` · ${b.users.name}` : ""}
                </span>
                {b.amount !== null ? <span className="ml-auto font-mono tabular-nums">{rupiah(b.amount)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lihat === "selesai" ? (
        <section>
          <h2 className="eyebrow pb-2">Selesai & dihentikan</h2>
          {lain.length ? <Daftar tagihan={lain} hariIni={hariIni} /> : <p className="text-sm text-muted-foreground">Belum ada.</p>}
        </section>
      ) : (
        <Link href="/pengingat-bayar?lihat=selesai" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Lihat tagihan yang sudah selesai / dihentikan
        </Link>
      )}
    </Halaman>
  );
}

function Daftar({ tagihan, hariIni }: { tagihan: TagihanTampil[]; hariIni: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {tagihan.map((t) => (
        <li
          key={t.id}
          className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
            t.status === "aktif" && t.keadaan === "lewat" && "border-perhatian-garis bg-perhatian-halus",
          )}
        >
          <Link href={`/pengingat-bayar/${t.id}`} className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
            <span className="text-[0.9375rem] font-medium hover:underline">{t.nama}</span>
            <span className="text-xs text-muted-foreground">
              {KATEGORI_TAGIHAN[t.kategori as KategoriTagihan] ?? t.kategori} · {ULANGI[String(t.ulangi ?? 0) as keyof typeof ULANGI]}
              {t.pic ? ` · PIC ${t.pic}` : ""}
            </span>
          </Link>
          <span className="font-mono text-[0.9375rem] tabular-nums">{t.nominal !== null ? rupiah(t.nominal) : <span className="font-sans text-sm text-muted-foreground">nominal berubah</span>}</span>
          {t.status === "aktif" ? (
            <span className="flex flex-col items-start gap-0.5 text-sm">
              <span>{hari.format(new Date(`${t.jatuhTempo}T00:00:00Z`))}</span>
              <Pil nada={t.keadaan === "nanti" ? "netral" : "perhatian"}>{labelSisa(t.sisa)}</Pil>
            </span>
          ) : (
            <Pil>{t.status === "selesai" ? "Selesai" : "Dihentikan"}</Pil>
          )}
          {t.status === "aktif" ? <TombolBayar id={t.id} hariIni={hariIni} nominal={t.nominal} /> : null}
        </li>
      ))}
    </ul>
  );
}
