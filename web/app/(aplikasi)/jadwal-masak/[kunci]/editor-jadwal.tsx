"use client";

import {
  CircleAlert,
  Copy,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihJam } from "@/components/pilih-jam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { labelHari } from "@/lib/tim";
import {
  type IsiRencana,
  type LangkahRencana,
  type Rencana,
  teksWa,
} from "@/lib/rencana-masak";
import { cn } from "@/lib/utils";

import { Kartu } from "../../kontrol-dapur/panel-kontrol";
import { drafJadwal, simpanJadwal } from "../actions";

type Hari = { tanggal: string; ada: boolean };
export type RingkasPesanan = {
  nama: string;
  jamTeks: string | null;
  tempat: string | null;
  catatanDapur: string | null;
  items: { nama: string; jumlah: string }[];
};

const langkahBaru = (mulai = "", kloter = false): LangkahRencana => ({
  mulai,
  selesai: null,
  teks: kloter ? "Siap delivery ke " : "",
  rincian: "",
});

/** Pesan pertama yang belum lengkap ("Sesi 1, langkah 2: …"), atau null bila siap disimpan. */
function cekIsi(isi: IsiRencana): string | null {
  for (const [i, s] of isi.sesi.entries())
    for (const [j, l] of s.langkah.entries()) {
      const di = `Sesi ${i + 1}, langkah ${j + 1}`;
      if (!l.mulai) return `${di}: jam mulai belum diisi.`;
      if (!l.teks.trim()) return `${di}: pekerjaannya belum diisi.`;
    }
  return null;
}

/** Teks WA dengan *tebal* ala WhatsApp, untuk pratinjau. */
function TeksWa({ teks }: { teks: string }) {
  return (
    <div className="text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap">
      {teks.split("\n").map((b, n) => (
        <p key={n} className="min-h-[1lh]">
          {b
            .split(/\*([^*\n]+)\*/g)
            .map((x, k) => (k % 2 ? <strong key={k}>{x}</strong> : x))}
        </p>
      ))}
    </div>
  );
}

/**
 * Jadwal produksi satu pesanan pada satu tanggal (docs/24 M1): Sesi Masak → Batch → langkah berjam → Kloter + muatan.
 * Disimpan utuh sekali tekan (sidik pesanan ikut diperbarui); TV membaca ulang tiap menit.
 * Pratinjau WA = teks yang disalin ke grup "NEW Tim Kitchen TISKA".
 */
export function EditorJadwal({
  kunci,
  tanggal,
  hariIni,
  hari,
  awal,
  pesanan,
  perubahan,
}: {
  kunci: string;
  tanggal: string;
  hariIni: string;
  /** Tanggal lain pesanan ini (pesanan berhari-hari). */
  hari: Hari[];
  awal: Rencana | null;
  /** null = pesanan sudah tidak ada di tanggal ini. */
  pesanan: RingkasPesanan | null;
  /** Perubahan pesanan sejak jadwal disimpan. */
  perubahan: string[];
}) {
  const router = useRouter();
  // Tanpa kunci "tanggal": isi yang dibandingkan untuk tanda "belum disimpan" harus berbentuk sama.
  const awalIsi: IsiRencana = awal
    ? { judul: awal.judul, catatan: awal.catatan, sesi: awal.sesi }
    : { judul: "", catatan: "", sesi: [] };
  const [isi, setIsi] = useState(awalIsi);
  const [tersimpan, setTersimpan] = useState(() => JSON.stringify(awalIsi));
  const [sibuk, mulai] = useTransition();
  const berubah = JSON.stringify(isi) !== tersimpan;
  const teks = teksWa({ ...isi, tanggal });
  const besok = new Date(Date.parse(`${hariIni}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const alamat = (t: string) => `/jadwal-masak/${kunci}?tgl=${t}`;

  useEffect(() => {
    if (!berubah) return;
    const tahan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tahan);
    return () => window.removeEventListener("beforeunload", tahan);
  }, [berubah]);

  const ubahSesi = (i: number, ubah: Partial<IsiRencana["sesi"][number]>) =>
    setIsi((r) => ({
      ...r,
      sesi: r.sesi.map((s, k) => (k === i ? { ...s, ...ubah } : s)),
    }));
  const ubahLangkah = (i: number, j: number, ubah: Partial<LangkahRencana>) =>
    setIsi((r) => ({
      ...r,
      sesi: r.sesi.map((s, k) =>
        k === i
          ? {
              ...s,
              langkah: s.langkah.map((l, m) =>
                m === j ? { ...l, ...ubah } : l,
              ),
            }
          : s,
      ),
    }));
  const tambahLangkah = (i: number, kloter: boolean) => {
    const terakhir = isi.sesi[i].langkah.at(-1);
    const nomor =
      isi.sesi.flatMap((s) => s.langkah).filter((l) => /KLOTER/i.test(l.teks))
        .length + 1;
    const baru = langkahBaru(
      terakhir?.selesai ?? terakhir?.mulai ?? "",
      kloter,
    );
    if (kloter) baru.teks = `[KLOTER-${nomor}] Siap delivery ke `;
    ubahSesi(i, { langkah: [...isi.sesi[i].langkah, baru] });
  };

  const tambahSesi = () =>
    setIsi((r) => ({
      ...r,
      sesi: [
        ...r.sesi,
        {
          judul: `Sesi Masak-${r.sesi.length + 1}; `,
          batch: "",
          langkah: [langkahBaru()],
        },
      ],
    }));

  const simpan = () => {
    const salah = cekIsi(isi);
    if (salah) return toast.error(salah);
    mulai(async () => {
      try {
        await simpanJadwal(kunci, tanggal, isi);
        setTersimpan(JSON.stringify(isi));
        toast.success(
          tanggal <= besok
            ? "Jadwal tersimpan. TV dapur menampilkannya dalam 1 menit."
            : "Jadwal tersimpan.",
        );
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Gagal menyimpan rencana.",
        );
      }
    });
  };
  const draf = () =>
    mulai(async () => {
      try {
        const d = await drafJadwal(kunci, tanggal);
        if (!d.sesi.length)
          return void toast.error(
            "Pesanan ini belum punya jumlah yang bisa dijadikan draf.",
          );
        setIsi(d);
        toast.success(
          "Draf dibuat dari pesanan. Geser jamnya sesuai rencana dapur, lalu Simpan.",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal membuat draf.");
      }
    });
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      toast.success("Teks jadwal tersalin. Tempel di grup WA dapur.");
    } catch {
      toast.error(
        "Browser menolak menyalin. Blok teks pratinjau lalu salin manual.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Pesanan berhari-hari: pindah tanggal tanpa kembali ke papan. */}
      {hari.length > 1 ? (
        <nav
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          aria-label="Tanggal pesanan"
        >
          {hari.map((h) => {
            const pilih = h.tanggal === tanggal;
            return (
              <Link
                key={h.tanggal}
                href={alamat(h.tanggal)}
                scroll={false}
                aria-current={pilih ? "date" : undefined}
                onClick={(e) => {
                  if (!berubah || pilih) return;
                  e.preventDefault();
                  toast.error("Jadwal ini belum disimpan.", {
                    action: {
                      label: "Buang perubahan",
                      onClick: () =>
                        router.push(alamat(h.tanggal), { scroll: false }),
                    },
                  });
                }}
                className={cn(
                  "flex min-w-[8.5rem] shrink-0 flex-col gap-0.5 rounded-2xl border px-4 py-2.5 transition-[background-color,transform] duration-200 ease-out active:scale-[0.97]",
                  pilih
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent",
                )}
              >
                <span className="text-[0.9375rem] font-semibold">
                  {labelHari(h.tanggal, hariIni)}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    pilih
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {h.ada ? "Ada jadwal" : "Belum ada jadwal"}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {perubahan.length ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[14px] border border-perhatian/30 bg-perhatian-halus p-5 sm:flex-row sm:items-start"
        >
          <CircleAlert className="size-5 shrink-0 text-perhatian" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-perhatian">
              Pesanan berubah setelah jadwal ini disimpan
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {perubahan.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Sesuaikan jadwalnya lalu Simpan, atau buat ulang draf dari pesanan
              terbaru. Tanda ini hilang setelah disimpan.
            </p>
          </div>
          {pesanan ? (
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-full px-4"
              disabled={sibuk}
              onClick={draf}
            >
              <RotateCcw className="size-4" /> Buat ulang draf
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Jadwal masih kosong: langkah pertama yang jelas (Rama: owner jangan sampai mencari tombolnya). */}
      {!isi.sesi.length ? (
        <section className="flex flex-col items-start gap-4 rounded-[14px] border-2 border-dashed border-primary/30 bg-primary/5 p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-primary-strong">
              Belum ada jadwal untuk pesanan ini
            </h2>
            <p className="mt-1 max-w-[640px] text-[0.9375rem] text-muted-foreground">
              {pesanan
                ? "Tekan Buat jadwal otomatis: aplikasi menyusun jam masak, nata, dan kloter dari isi pesanan. Setelah itu tinggal geser jamnya lalu Simpan."
                : "Pesanan ini tidak ada di tanggal ini, jadi jadwal hanya bisa diisi sendiri."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {pesanan ? (
              <Button
                className="h-12 rounded-full px-6 text-base"
                disabled={sibuk}
                onClick={draf}
              >
                <Sparkles className="size-5" />{" "}
                {sibuk ? "Menyusun…" : "Buat jadwal otomatis"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-12 rounded-full px-6 text-base"
              onClick={tambahSesi}
            >
              <Plus className="size-5" /> Isi sendiri
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Kartu
            judul="Judul jadwal"
            keterangan="Baris pertama pesan WA, mis. ORDER Snack-Lunch Box & Buffet [WISUDA UNPAK]."
          >
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                value={isi.judul}
                onChange={(e) =>
                  setIsi((r) => ({ ...r, judul: e.target.value }))
                }
                placeholder={`Contoh: ORDER [${pesanan?.nama ?? "nama pesanan"}]`}
                aria-label="Judul jadwal"
                maxLength={200}
              />
            </div>
          </Kartu>

          {isi.sesi.map((s, i) => (
            <section
              key={i}
              className="rounded-[14px] border bg-card shadow-[0_1px_2px_rgba(31,42,92,0.04)]"
            >
              <div className="flex flex-col gap-3 border-b p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm font-semibold">
                    {i + 1}
                  </span>
                  <Input
                    value={s.judul}
                    onChange={(e) => ubahSesi(i, { judul: e.target.value })}
                    placeholder="Sesi Masak-1; Snack Box + Breakfast"
                    aria-label={`Judul sesi ${i + 1}`}
                    className="font-semibold"
                    maxLength={200}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full text-muted-foreground"
                    aria-label={`Hapus sesi ${i + 1}`}
                    onClick={() =>
                      setIsi((r) => ({
                        ...r,
                        sesi: r.sesi.filter((_, k) => k !== i),
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  rows={1}
                  className="min-h-10 py-2"
                  value={s.batch}
                  onChange={(e) =>
                    ubahSesi(i, { batch: e.target.value.replace(/\n/g, " ") })
                  }
                  placeholder="[Batch-1] Tim DW Packing 1.693 Snack Box + 30 Snack Box Senat"
                  aria-label={`Batch sesi ${i + 1}`}
                  maxLength={300}
                />
              </div>

              <div className="hidden grid-cols-[7.5rem_7.5rem_minmax(0,1fr)_2.5rem] gap-3 px-6 pt-4 text-xs font-medium text-muted-foreground sm:grid">
                <span>Mulai</span>
                <span>Selesai</span>
                <span>Pekerjaan</span>
              </div>
              <ol className="flex flex-col divide-y px-5 sm:px-6">
                {s.langkah.map((l, j) => (
                  <li
                    key={j}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-3 py-3 sm:grid-cols-[7.5rem_7.5rem_minmax(0,1fr)_2.5rem]"
                  >
                    <PilihJam
                      value={l.mulai}
                      onChange={(v) => ubahLangkah(i, j, { mulai: v })}
                      placeholder="Mulai"
                      bisaHapus={false}
                      aria-label="Jam mulai"
                    />
                    <PilihJam
                      value={l.selesai ?? ""}
                      onChange={(v) =>
                        ubahLangkah(i, j, { selesai: v || null })
                      }
                      placeholder="Titik"
                      aria-label="Jam selesai"
                    />
                    <div className="col-span-3 row-start-2 flex min-w-0 flex-col gap-2 sm:col-span-1 sm:row-start-1 sm:col-start-3">
                      <Textarea
                        rows={1}
                        className="min-h-10 py-2"
                        value={l.teks}
                        onChange={(e) =>
                          ubahLangkah(i, j, {
                            teks: e.target.value.replace(/\n/g, " "),
                          })
                        }
                        placeholder={
                          l.selesai
                            ? "Target nata isi Snack Box = 550 box 👉🏻 langsung masuk mobil"
                            : "[KLOTER-1] Siap delivery ke Puri Begawan"
                        }
                        aria-label="Pekerjaan"
                        maxLength={300}
                      />
                      {/* Titik waktu (kloter, pick-up) membawa muatan; langkah berdurasi cukup satu baris. */}
                      {!l.selesai || l.rincian ? (
                        <Textarea
                          value={l.rincian}
                          onChange={(e) =>
                            ubahLangkah(i, j, { rincian: e.target.value })
                          }
                          placeholder={
                            "Muatan, satu per baris\n1.100 Snack Box\n80 pax Menu Breakfast"
                          }
                          aria-label="Muatan"
                          className="min-h-16"
                          maxLength={1000}
                        />
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="col-start-3 row-start-1 rounded-full text-muted-foreground sm:col-start-4"
                      aria-label={`Hapus langkah ${j + 1}`}
                      onClick={() =>
                        ubahSesi(i, {
                          langkah: s.langkah.filter((_, m) => m !== j),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-2 border-t p-4 sm:px-6">
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4"
                  onClick={() => tambahLangkah(i, false)}
                >
                  <Plus className="size-4" /> Langkah
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4"
                  onClick={() => tambahLangkah(i, true)}
                >
                  <Truck className="size-4" /> Kloter
                </Button>
                <p className="text-xs text-muted-foreground sm:ml-auto">
                  Jam selesai kosong = titik waktu, misalnya kloter berangkat.
                </p>
              </div>
            </section>
          ))}

          {isi.sesi.length ? (
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-dashed"
              onClick={tambahSesi}
            >
              <Plus className="size-4" /> Tambah sesi masak
            </Button>
          ) : null}

          <Kartu
            judul="Catatan"
            keterangan="Tampil di bawah jadwal WA, mis. pembagian tim DW."
          >
            <Textarea
              value={isi.catatan}
              onChange={(e) =>
                setIsi((r) => ({ ...r, catatan: e.target.value }))
              }
              placeholder={
                "Contoh:\n1. Siapkan pembagian tim DW di jam yang bersamaan\n2. Kalau bisa selesai lebih cepat, lebih baik"
              }
              aria-label="Catatan"
              className="mt-4"
              maxLength={2000}
            />
          </Kartu>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
          {/* Acuan saat menyusun: isi pesanan hari ini (tanpa harga). */}
          {pesanan ? (
            <Kartu
              judul="Isi pesanan"
              keterangan={
                [pesanan.jamTeks, pesanan.tempat].filter(Boolean).join(" · ") ||
                undefined
              }
            >
              <ul className="mt-3 flex flex-col divide-y text-sm">
                {pesanan.items.map((it, n) => (
                  <li key={n} className="flex gap-3 py-2">
                    <span className="min-w-0 flex-1">{it.nama}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {it.jumlah}
                    </span>
                  </li>
                ))}
              </ul>
              {pesanan.catatanDapur ? (
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-line">
                  <b>Catatan dapur:</b> {pesanan.catatanDapur}
                </p>
              ) : null}
            </Kartu>
          ) : (
            <Kartu
              judul="Pesanan tidak ditemukan"
              keterangan="Pesanan ini sudah tidak ada di tanggal ini. Kosongkan jadwalnya lalu Simpan untuk menghapus."
            >
              {null}
            </Kartu>
          )}
          <Kartu
            judul="Pesan untuk grup WA"
            keterangan="Teks ini yang tersalin lewat tombol Salin ke WA."
          >
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl bg-[#E9F7EF] p-4 text-[#1B2B22] dark:bg-emerald-950/40 dark:text-emerald-50">
              <TeksWa teks={teks} />
            </div>
          </Kartu>
        </aside>
      </div>

      {/* Bilah aksi menempel di bawah layar: Simpan selalu terjangkau walau jadwalnya panjang. */}
      {/* Tombol di kiri: toast muncul di kanan bawah dan tidak menutupi Simpan. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border bg-card/95 p-2 pr-5 shadow-[0_8px_24px_-8px_rgba(31,42,92,0.25)] backdrop-blur">
        <div className="flex gap-2">
          <Button
            className="h-11 rounded-full px-6"
            disabled={sibuk || (!berubah && !perubahan.length)}
            onClick={simpan}
          >
            {sibuk ? "Menyimpan…" : "Simpan"}
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-full px-4"
            disabled={!isi.sesi.length}
            onClick={() => void salin()}
          >
            <Copy className="size-4" /> Salin ke WA
          </Button>
        </div>
        <p
          className={cn(
            "min-w-0 flex-1 text-sm",
            berubah ? "font-medium text-tempo" : "text-muted-foreground",
          )}
        >
          {berubah
            ? "Ada perubahan yang belum disimpan."
            : !isi.sesi.length && !isi.judul && !isi.catatan
              ? "Belum ada jadwal untuk tanggal ini."
              : perubahan.length
                ? "Pesanan berubah — periksa jadwal lalu Simpan."
                : tanggal <= besok
                  ? "Tersimpan. TV dapur menampilkan jadwal ini."
                  : "Tersimpan. Muncul di TV dapur sehari sebelumnya."}
        </p>
      </div>
    </div>
  );
}
