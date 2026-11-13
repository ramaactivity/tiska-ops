import { ArrowLeft, ChartColumn, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BagianForm, BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Td, Th } from "@/components/halaman";
import { laporanProgram, type LaporanProgram, pembeliRetail, PESANAN_DIHITUNG } from "@/lib/ikut-menu-pesta";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const bulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

/* Laporan Ikut Menu Pesta (Tahap D, D-118): ringkasan semua program disetujui + menu terlaris + pembeli retail.
   Untung hanya untuk peran yang boleh melihat biaya (disaring di laporanProgram). */
export default async function HalamanLaporan() {
  const sesi = await wajibIzin("ikut-menu-pesta");
  const [lap, pembeli, porsi] = await Promise.all([
    laporanProgram(sesi),
    pembeliRetail(),
    prisma.retail_order_items.findMany({
      where: { retail_orders: { ...PESANAN_DIHITUNG, retail_programs: { status: "disetujui" } } },
      select: { pax: true, retail_program_sets: { select: { retail_program_set_items: { select: { name: true } } } } },
    }),
  ]);
  const biaya = lap[0]?.biaya ?? false;
  const menu = new Map<string, number>();
  for (const x of porsi) for (const m of x.retail_program_sets.retail_program_set_items) menu.set(m.name, (menu.get(m.name) ?? 0) + x.pax);
  const terlaris = [...menu.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const gabung = (daftar: LaporanProgram[]) => {
    const tahu = daftar.filter((x) => x.untung != null);
    return {
      program: daftar.length,
      pesanan: daftar.reduce((s, x) => s + x.pesanan, 0),
      pax: daftar.reduce((s, x) => s + x.pax, 0),
      omzet: daftar.reduce((s, x) => s + x.omzet, 0),
      untung: tahu.length ? tahu.reduce((s, x) => s + (x.untung ?? 0), 0) : null,
      lengkap: tahu.length === daftar.length,
    };
  };
  const semua = gabung(lap);
  const perJenis = (["Weekend", "Weekday"] as const).map((j) => ({ label: j, ...gabung(lap.filter((x) => x.jenis === j)) })).filter((x) => x.program > 0);
  const kunciBulan = [...new Set(lap.map((x) => x.tanggal.slice(0, 7)))];
  const perBulan = kunciBulan.map((b) => ({ label: bulan.format(new Date(`${b}-01T00:00:00Z`)), ...gabung(lap.filter((x) => x.tanggal.startsWith(b))) }));
  const wa = (hp: string) => `https://wa.me/${hp.replace(/\D/g, "").replace(/^0/, "62")}`;

  return (
    <Halaman>
      <div className="pb-5">
        <Link href="/ikut-menu-pesta" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Semua program
        </Link>
      </div>
      <KepalaHalaman
        ikon={ChartColumn}
        judul="Laporan Ikut Menu Pesta"
        keterangan={`Program yang sudah disetujui. Nilai makanan tanpa PBJT.${biaya ? " Untung = nilai makanan + Delivery Fee − HPP − kemasan − biaya antar." : ""}`}
      />
      {lap.length === 0 ? (
        <div className="kartu">
          <KeadaanKosong judul="Belum ada program yang disetujui." />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Kotak label="Program" isi={`${semua.program}`} />
            <Kotak label="Pesanan" isi={`${semua.pesanan}`} sub={`${semua.pax} pax`} />
            <Kotak label="Nilai makanan" isi={rupiah(semua.omzet)} />
            <Kotak label="Pembeli" isi={`${pembeli.length}`} sub={`${pembeli.filter((b) => b.pesanan > 1).length} pesan lagi`} />
            {biaya ? (
              <Kotak
                label="Untung bersih"
                isi={semua.untung != null ? rupiah(semua.untung) : "—"}
                sub={semua.lengkap ? undefined : "sebagian program belum lengkap HPP-nya"}
                warna={semua.untung != null && semua.untung < 0 ? "text-destructive" : "text-lunas"}
              />
            ) : null}
          </section>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <BagianForm judul="Weekend vs Weekday">
              <TabelRingkas baris={perJenis} biaya={biaya} />
            </BagianForm>
            <BagianForm judul="Per bulan">
              <TabelRingkas baris={perBulan} biaya={biaya} />
            </BagianForm>
          </div>

          <BagianForm judul="Per program">
            <BingkaiTabel>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <Th>Program</Th>
                    <Th className="text-right">Pesanan</Th>
                    <Th className="hidden text-right sm:table-cell">Nilai makanan</Th>
                    {biaya ? <Th className="text-right">Untung</Th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lap.map((x) => (
                    <tr key={x.id} className="border-b last:border-0">
                      <Td>
                        <Link href={`/ikut-menu-pesta/${x.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                          {x.jenis} · {tanggal.format(new Date(`${x.tanggal}T00:00:00Z`))}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          baru {x.pembeliBaru} · langganan {x.pesanan - x.pembeliBaru}
                        </p>
                      </Td>
                      <Td className="text-right tabular-nums">
                        {x.pesanan}
                        <p className="text-sm text-muted-foreground">{x.pax} pax</p>
                      </Td>
                      <Td className="hidden text-right font-mono tabular-nums sm:table-cell">{rupiah(x.omzet)}</Td>
                      {biaya ? (
                        <Td className={cn("text-right font-mono whitespace-nowrap tabular-nums", x.untung != null && (x.untung < 0 ? "text-destructive" : "text-lunas"))}>
                          {x.untung != null ? rupiah(x.untung) : "—"}
                          <p className="font-sans text-sm text-muted-foreground">{x.untungPct != null ? `${x.untungPct.toLocaleString("id-ID")}%` : "HPP belum lengkap"}</p>
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </BingkaiTabel>
          </BagianForm>

          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <BagianForm judul="Menu terlaris" keterangan="Total porsi terjual di semua program.">
              <ol className="flex flex-col gap-1 text-[0.9375rem]">
                {terlaris.map(([nama, n], i) => (
                  <li key={nama} className="flex justify-between gap-3">
                    <span>
                      <span className="mr-2 font-mono text-sm text-muted-foreground">{i + 1}.</span>
                      {nama}
                    </span>
                    <span className="font-mono tabular-nums">{n}</span>
                  </li>
                ))}
              </ol>
            </BagianForm>
            <BagianForm judul={`Pembeli retail · ${pembeli.length}`} keterangan="Untuk ditawari program berikutnya. Chat WA dibuka manual — tidak ada pesan otomatis.">
              <ul className="flex flex-col">
                {pembeli.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {b.nama} <span className="text-sm font-normal text-muted-foreground">{b.hp}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {b.pesanan}× pesan · {rupiah(b.belanja)} · terakhir {tanggal.format(new Date(`${b.terakhir}T00:00:00Z`))}
                      </p>
                    </div>
                    <a
                      href={wa(b.hp)}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm hover:bg-accent"
                    >
                      <MessageCircle className="size-4" />
                      Chat WA
                    </a>
                  </li>
                ))}
              </ul>
            </BagianForm>
          </div>
        </div>
      )}
    </Halaman>
  );
}

function Kotak({ label, isi, sub, warna }: { label: string; isi: string; sub?: string; warna?: string }) {
  return (
    <div className="kartu px-4 py-3.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-lg font-semibold tabular-nums", warna)}>{isi}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function TabelRingkas({ baris, biaya }: { baris: { label: string; program: number; pesanan: number; pax: number; omzet: number; untung: number | null }[]; biaya: boolean }) {
  return (
    <table className="w-full text-[0.9375rem]">
      <thead>
        <tr className="border-b text-left text-sm text-muted-foreground">
          <th className="py-2 font-medium" />
          <th className="py-2 text-right font-medium">Pax</th>
          <th className="py-2 text-right font-medium">Nilai makanan</th>
          {biaya ? <th className="py-2 text-right font-medium">Untung</th> : null}
        </tr>
      </thead>
      <tbody>
        {baris.map((b) => (
          <tr key={b.label} className="border-b last:border-0">
            <td className="py-2">
              {b.label}
              <span className="block text-xs text-muted-foreground">
                {b.program} program · {b.pesanan} pesanan
              </span>
            </td>
            <td className="py-2 text-right tabular-nums">{b.pax}</td>
            <td className="py-2 pl-3 text-right font-mono whitespace-nowrap tabular-nums">{rupiah(b.omzet)}</td>
            {biaya ? <td className="py-2 pl-2 text-right font-mono whitespace-nowrap tabular-nums">{b.untung != null ? rupiah(b.untung) : "—"}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
