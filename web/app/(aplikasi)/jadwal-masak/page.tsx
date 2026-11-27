import { CalendarClock, CalendarPlus, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { SalinTeks } from "@/components/salin-teks";
import { namaTempat, pecahNama, pisahSesi } from "@/lib/dapur-layar";
import { jadwalTanggal } from "@/lib/jadwal-masak";
import { hariIniWib } from "@/lib/kalender";
import { agendaDapur } from "@/lib/pesanan-dapur";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { gabungHari, rentangJam, teksWa } from "@/lib/rencana-masak";
import { labelHari } from "@/lib/tim";
import { cn } from "@/lib/utils";

import { GarisWaktu } from "./garis-waktu";

export const metadata: Metadata = { title: "Jadwal Masak" };
export const dynamic = "force-dynamic";

const geser = (t: string, n: number) =>
  new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/* Jadwal Masak (docs/24 M1): papan harian — semua pesanan satu tanggal, jadwal produksinya, garis waktu gabungan,
   tanda "Pesanan berubah", dan satu teks WA untuk grup dapur. Ubah jadwal per pesanan di /jadwal-masak/[kunci]. */
export default async function HalamanJadwalMasak({ searchParams }: PageProps<"/jadwal-masak">) {
  await wajibIzin("jadwal-masak");
  const { tgl } = await searchParams;
  const hariIni = hariIniWib();
  const hari = Array.from({ length: 7 }, (_, n) => geser(hariIni, n));
  const tanggal = typeof tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : hariIni;

  const [daftar, agenda, berjadwal] = await Promise.all([
    jadwalTanggal(tanggal),
    agendaDapur(hariIni, 7),
    prisma.production_plans.groupBy({
      by: ["date"],
      where: { date: { in: hari.map((h) => new Date(`${h}T00:00:00Z`)) } },
      _count: true,
    }),
  ]);
  const jumlahJadwal = new Map(berjadwal.map((b) => [b.date.toISOString().slice(0, 10), b._count]));
  const rencana = daftar.flatMap((j) => (j.rencana && j.rencana.sesi.length ? [j.rencana] : []));
  const teksHari = rencana.length ? teksWa(gabungHari(tanggal, rencana)) : null;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Jadwal Masak"
        ikon={CalendarClock}
        keterangan="Jadwal persiapan tiap pesanan: kapan masak, nata, dan kloter berangkat. Tampil di TV dapur dan bisa disalin ke grup WA."
        aksi={teksHari ? <SalinTeks teks={teksHari} label="Salin jadwal ke WA" pesan="Jadwal tersalin. Tempel di grup WA dapur." /> : null}
      />

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" aria-label="Tanggal">
        {hari.map((h) => {
          const pilih = h === tanggal;
          const pesanan = agenda.find((a) => a.tanggal === h)?.pesanan.length ?? 0;
          const jadwal = jumlahJadwal.get(h) ?? 0;
          return (
            <Link
              key={h}
              href={`/jadwal-masak?tgl=${h}`}
              scroll={false}
              aria-current={pilih ? "date" : undefined}
              className={cn(
                "flex min-w-[8.5rem] shrink-0 flex-col gap-0.5 rounded-2xl border px-4 py-2.5 transition-[background-color,transform] duration-200 ease-out active:scale-[0.97]",
                pilih ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              <span className="text-[0.9375rem] font-semibold">{labelHari(h, hariIni)}</span>
              <span className={cn("text-xs", pilih ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {pesanan ? `${pesanan} pesanan · ${jadwal} berjadwal` : "Kosong"}
              </span>
            </Link>
          );
        })}
      </nav>

      {daftar.length === 0 ? (
        <div className="mt-6 rounded-[14px] border bg-card">
          <KeadaanKosong judul="Tidak ada pesanan di tanggal ini" keterangan="Pilih tanggal lain di atas." />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="flex min-w-0 flex-col gap-3" aria-label="Pesanan">
            {daftar.map((j) => {
              const rentang = j.rencana ? rentangJam(j.rencana) : null;
              const langkah = j.rencana?.sesi.reduce((n, s) => n + s.langkah.length, 0) ?? 0;
              const tempat = namaTempat(j.order?.tempat);
              return (
                <Link
                  key={j.kunci}
                  href={`/jadwal-masak/${j.kunci}?tgl=${tanggal}`}
                  className="group flex flex-col gap-2 rounded-[14px] border bg-card p-5 shadow-[0_1px_2px_rgba(31,42,92,0.04)] transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary-strong">{j.nama}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                        {j.order?.jamTeks ? <span>{j.order.jamTeks}</span> : null}
                        {tempat ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {tempat}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {/* Satu menu satu baris: jumlah di kolom kiri, nama pendek tebal + keterangan abu di bawahnya
                      (Rama 27 Nov: deretan bertitik terlalu bertumpuk). Sisanya diringkas "+N menu lain". */}
                  {j.order ? (
                    <ul className="flex flex-col gap-2 border-t pt-3 text-sm">
                      {j.order.items
                        .filter((i) => i.jumlah)
                        .slice(0, 4)
                        .map((i, n) => {
                          const { utama, detail } = pecahNama(pisahSesi(i.nama).nama);
                          return (
                            <li key={n} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3">
                              <span className="font-semibold tabular-nums">{i.jumlah!.toLowerCase()}</span>
                              <span className="min-w-0">
                                <span className="font-medium">{utama}</span>
                                {detail ? <span className="block text-muted-foreground">{detail}</span> : null}
                              </span>
                            </li>
                          );
                        })}
                      {j.order.items.filter((i) => i.jumlah).length > 4 ? (
                        <li className="pl-[5.5rem] text-muted-foreground">+{j.order.items.filter((i) => i.jumlah).length - 4} menu lain</li>
                      ) : null}
                    </ul>
                  ) : null}
                  {/* Tombol jelas di tiap kartu (Rama: owner jangan sampai mencari/bingung). Seluruh kartu tetap bisa diklik. */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {j.berubah.length ? <Pil nada="perhatian">Pesanan berubah</Pil> : null}
                      {j.rencana && langkah ? (
                        <Pil nada="baik">
                          Berjadwal{rentang ? ` · ${rentang}` : ""} · {langkah} langkah
                        </Pil>
                      ) : (
                        <Pil>Belum ada jadwal</Pil>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold transition-transform group-active:scale-[0.97]",
                        j.rencana && langkah && !j.berubah.length
                          ? "border bg-card text-foreground group-hover:bg-accent"
                          : "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(31,42,92,0.12)] group-hover:bg-primary-strong",
                      )}
                    >
                      {j.berubah.length ? (
                        "Periksa jadwal"
                      ) : j.rencana && langkah ? (
                        "Ubah jadwal"
                      ) : (
                        <>
                          <CalendarPlus className="size-4" /> Buat jadwal
                        </>
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="min-w-0 rounded-[14px] border bg-card p-5 shadow-[0_1px_2px_rgba(31,42,92,0.04)] sm:p-6" aria-label="Garis waktu">
            <h2 className="text-lg font-bold tracking-[-0.01em] text-primary-strong">Garis waktu · {labelHari(tanggal, hariIni)}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Semua pekerjaan dapur di tanggal ini, berurutan jam. Kloter ditandai bulat.</p>
            {rencana.length ? (
              <GarisWaktu rencana={rencana} />
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">Belum ada jadwal. Pilih pesanan di kiri, lalu buat jadwalnya.</p>
            )}
          </section>
        </div>
      )}
    </Halaman>
  );
}
