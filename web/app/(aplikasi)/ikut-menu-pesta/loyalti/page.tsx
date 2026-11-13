import { ChevronLeft, Gift, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { kalimatAturan, pesanWaHadiah } from "@/lib/hitung/loyalti";
import { tautanWa } from "@/lib/hitung/ikut-menu-pesta";
import { pembeliRetail } from "@/lib/ikut-menu-pesta";
import { hariIniWib } from "@/lib/kalender";
import { daftarProgramLoyalti, kartuPelanggan } from "@/lib/loyalti";
import { bolehSetujuiProgram } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { TombolProgram } from "./form-program";
import { TombolBatalPakai, TombolPakaiHadiah } from "./tombol-hadiah";

export const metadata: Metadata = { title: "Program Loyalti" };
export const dynamic = "force-dynamic";

const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const t = (s: string) => tgl.format(new Date(`${s}T00:00:00Z`));
const SARING = { hadiah: "Punya hadiah", hampir: "Kurang 1 pesanan", hangus: "Hadiah hangus ≤ 7 hari", semua: "Semua pembeli" } as const;

/* Program Loyalti Ikut Menu Pesta (D-131): aturan + kartu stempel tiap pembeli + pemakaian hadiah. */
export default async function HalamanLoyalti({ searchParams }: PageProps<"/ikut-menu-pesta/loyalti">) {
  const sesi = await wajibIzin("ikut-menu-pesta");
  const { s } = await searchParams;
  const saring = typeof s === "string" && s in SARING ? (s as keyof typeof SARING) : "hadiah";
  const hariIni = hariIniWib();
  const minggu = new Date(Date.parse(`${hariIni}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [program, kartu, pembeli, pakai] = await Promise.all([
    daftarProgramLoyalti(),
    kartuPelanggan(hariIni),
    pembeliRetail(),
    prisma.loyalty_redemptions.findMany({ select: { reward_key: true, used_at: true, note: true, retail_orders: { select: { retail_programs: { select: { name: true } } } } } }),
  ]);
  const infoPakai = new Map(pakai.map((p) => [p.reward_key, p]));
  const atur = bolehSetujuiProgram(sesi.peran);

  const baris = pembeli.map((b) => {
    const k = kartu.get(b.id) ?? [];
    return {
      ...b,
      k,
      hadiah: k.some((x) => x.kartu.hadiah.some((h) => h.status === "tersedia")),
      hampir: k.some((x) => x.kartu.stempel === x.kartu.syarat - 1 && x.kartu.stempel > 0),
      hangus: k.some((x) => x.kartu.hadiah.some((h) => h.status === "tersedia" && h.hangus && h.hangus <= minggu)),
    };
  });
  const jumlah = { hadiah: baris.filter((b) => b.hadiah).length, hampir: baris.filter((b) => b.hampir).length, hangus: baris.filter((b) => b.hangus).length, semua: baris.length };
  const tampil = baris.filter((b) => saring === "semua" || b[saring]);

  return (
    <Halaman>
      <Link href="/ikut-menu-pesta" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Ikut Menu Pesta
      </Link>
      <KepalaHalaman
        ikon={Gift}
        judul="Program Loyalti"
        keterangan="Kartu stempel pembeli Ikut Menu Pesta: tiap pesanan yang sudah lunas = 1 stempel. Stempel genap → hadiah, kartu mulai dari nol lagi."
        aksi={atur ? <TombolProgram hariIni={hariIni} /> : undefined}
      />

      {program.length ? (
        <ul className="mb-6 grid gap-3 lg:grid-cols-2">
          {program.map((p) => (
            <li key={p.id} className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", !p.aktif && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.nama}</span>
                <Pil nada={p.aktif ? "baik" : "netral"}>{p.aktif ? "Aktif" : "Dihentikan"}</Pil>
              </div>
              <p className="text-[0.9375rem]">{kalimatAturan(p)}</p>
              {p.pilihan.length ? <p className="text-sm">Pilihan: {p.pilihan.join(" · ")}</p> : null}
              <p className="text-xs text-muted-foreground">
                {p.jenis === "tiap_pesanan" ? "Bonus otomatis di setiap pesanan yang memenuhi syarat — tampil di pesanan & rekap dapur." : p.bolehGabung ? "Boleh digabung dengan hadiah lain." : "Tidak bisa digabung dengan hadiah lain."}
              </p>
              {p.sk ? <p className="text-xs whitespace-pre-line text-muted-foreground">{p.sk}</p> : null}
              <p className="text-xs text-muted-foreground">Menghitung pesanan yang dikirim mulai {t(p.mulai)}.</p>
              {atur ? (
                <div>
                  <TombolProgram program={p} hariIni={hariIni} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-6 kartu px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">
          Belum ada program loyalti. {atur ? "Tekan Program baru — jumlah pesanan, batas waktu, dan hadiahnya bisa diatur & diubah kapan saja." : "Finance atau owner yang membuatnya."}
        </p>
      )}

      {program.some((p) => p.aktif && p.jenis === "stempel") ? (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(Object.keys(SARING) as (keyof typeof SARING)[]).map((k) => (
              <Link
                key={k}
                href={`/ikut-menu-pesta/loyalti?s=${k}`}
                className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", k === saring ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
              >
                {SARING[k]} ({jumlah[k]})
              </Link>
            ))}
          </div>
          {tampil.length ? (
            <ul className="flex flex-col gap-2">
              {tampil.map((b) => (
                <li key={b.id} className="flex flex-col gap-2.5 rounded-2xl border bg-card px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/pelanggan/${b.id}`} className="font-semibold hover:underline">
                      {b.nama}
                    </Link>
                    <span className="text-sm text-muted-foreground">{b.hp}</span>
                  </div>
                  {b.k
                    .filter((x) => x.program.aktif && x.program.jenis === "stempel")
                    .map(({ program: p, kartu: k }) => (
                      <div key={p.id} className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="flex gap-1" aria-label={`${k.stempel} dari ${k.syarat} stempel`}>
                            {Array.from({ length: k.syarat }, (_, i) => (
                              <span key={i} className={cn("size-3 rounded-full border", i < k.stempel ? "border-primary bg-primary" : "bg-muted")} />
                            ))}
                          </span>
                          <span>
                            {k.stempel} dari {k.syarat} pesanan
                            {k.batas ? ` · lengkapi sebelum ${t(k.batas)}` : ""}
                          </span>
                          {program.filter((x) => x.aktif && x.jenis === "stempel").length > 1 ? <span className="text-muted-foreground">· {p.nama}</span> : null}
                        </div>
                        {k.hadiah
                          .filter((h) => h.status !== "hangus")
                          .map((h, i) => {
                            const info = infoPakai.get(h.kunci);
                            return (
                              <div key={h.kunci} className={cn("flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm", h.status === "tersedia" ? "bg-amber-50" : "bg-muted/60")}>
                                <span>
                                  🎁 <b>{p.hadiah}</b> · didapat {t(h.didapat)}
                                  {h.status === "tersedia" ? (h.hangus ? ` · berlaku s.d. ${t(h.hangus)}` : "") : ` · dipakai ${info ? tgl.format(info.used_at) : ""}${info?.retail_orders ? ` di ${info.retail_orders.retail_programs.name}` : ""}${info?.note ? ` (${info.note})` : ""}`}
                                </span>
                                <span className="ml-auto flex flex-wrap gap-1">
                                  {h.status === "tersedia" ? (
                                    <>
                                      <Button size="sm" variant="outline" className="rounded-full bg-card" render={<a href={tautanWa(b.hp, pesanWaHadiah(b.nama, k.syarat * (i + 1), p.hadiah, h.hangus))} target="_blank" rel="noopener" />}>
                                        <MessageCircle className="size-3.5" />
                                        Chat WA
                                      </Button>
                                      {p.jenisHadiah === "teks" ? <TombolPakaiHadiah kunci={h.kunci} hadiah={p.hadiah} nama={b.nama} /> : <span className="self-center text-xs text-muted-foreground">dipakai di pesanan berikutnya</span>}
                                    </>
                                  ) : (
                                    <TombolBatalPakai kunci={h.kunci} />
                                  )}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="kartu px-4 py-6 text-center text-[0.9375rem] text-muted-foreground">Belum ada pembeli di daftar ini.</p>
          )}
        </>
      ) : null}
    </Halaman>
  );
}
