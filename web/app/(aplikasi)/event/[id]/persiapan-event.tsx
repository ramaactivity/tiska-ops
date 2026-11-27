"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type AgendaPersiapan,
  bagiRata,
  geserTanggal,
  labelH,
  type Persiapan,
  rentangTanggal,
  type TargetPersiapan,
  teksAgenda,
  teksPersiapan,
  TIM_PERSIAPAN,
  totalTarget,
} from "@/lib/persiapan";
import { cn } from "@/lib/utils";

import { simpanPersiapan, tambahTercapai } from "../persiapan-actions";
import { JUDUL, KARTU } from "./gaya";

const angka = (n: number) => n.toLocaleString("id-ID");
const keAngka = (t: string) => Number(t.replace(/\D/g, "").slice(0, 7) || 0);
const KOSONG: Persiapan = { target: [], agenda: [] };
/** Isi editor tanpa angka tercapai (itu milik tombol progres, dibaca dari server). */
const tanpaTercapai = (p: Persiapan): Persiapan => ({
  ...p,
  target: p.target.map((t) => ({
    ...t,
    harian: t.harian.map((h) => ({ ...h, tercapai: 0 })),
  })),
});

/**
 * Persiapan acara besar H-n (docs/25 #5): target harian (lipat box, kue…) dengan tombol progres, agenda per tim, dan
 * pesan WA format Mbak Ari. Progres tersimpan langsung; jadwal & agenda lewat tombol Simpan.
 */
export function PersiapanEvent({
  idEvent,
  acara,
  tanggalAcara,
  hariIni,
  awal,
  draf,
  ubah,
  progres,
}: {
  idEvent: string;
  acara: string;
  tanggalAcara: string;
  hariIni: string;
  awal: Persiapan | null;
  /** Draf dari isi pesanan (target lipat box H-6 s.d. H-3). */
  draf: Persiapan;
  ubah: boolean;
  progres: boolean;
}) {
  const router = useRouter();
  const [isi, setIsi] = useState<Persiapan>(() =>
    tanpaTercapai(awal ?? KOSONG),
  );
  const [tersimpan, setTersimpan] = useState(() =>
    JSON.stringify(tanpaTercapai(awal ?? KOSONG)),
  );
  const [sibuk, mulai] = useTransition();
  const berubah = JSON.stringify(isi) !== tersimpan;
  // Pesan WA memakai angka tercapai terbaru dari server.
  const tercapai = (judul: string, tanggal: string) =>
    awal?.target
      .find((t) => t.judul === judul)
      ?.harian.find((h) => h.tanggal === tanggal)?.tercapai ?? 0;
  const lengkap: Persiapan = {
    ...isi,
    target: isi.target.map((t) => ({
      ...t,
      harian: t.harian.map((h) => ({
        ...h,
        tercapai: tercapai(t.judul, h.tanggal),
      })),
    })),
  };

  useEffect(() => {
    if (!berubah) return;
    const tahan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tahan);
    return () => window.removeEventListener("beforeunload", tahan);
  }, [berubah]);

  const ubahTarget = (i: number, u: Partial<TargetPersiapan>) =>
    setIsi((p) => ({
      ...p,
      target: p.target.map((t, k) => (k === i ? { ...t, ...u } : t)),
    }));
  const ubahAgenda = (i: number, u: Partial<AgendaPersiapan>) =>
    setIsi((p) => ({
      ...p,
      agenda: p.agenda.map((a, k) => (k === i ? { ...a, ...u } : a)),
    }));

  const simpan = () =>
    mulai(async () => {
      try {
        // Baris kosong (tugas/rincian yang belum diisi) tidak ikut disimpan.
        const bersih: Persiapan = {
          target: isi.target.map((t) => ({
            ...t,
            rincian: t.rincian.filter((r) => r.nama.trim()),
          })),
          agenda: isi.agenda.map((a) => ({
            ...a,
            butir: a.butir.map((b) => b.trim()).filter(Boolean),
          })),
        };
        await simpanPersiapan(idEvent, bersih);
        setIsi(bersih);
        setTersimpan(JSON.stringify(bersih));
        toast.success("Persiapan tersimpan.");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Gagal menyimpan persiapan.",
        );
      }
    });
  const tambah = (judul: string, tanggal: string, n: number) =>
    mulai(async () => {
      try {
        const baru = await tambahTercapai(idEvent, judul, tanggal, n);
        toast.success(`${judul} ${labelTgl(tanggal)}: ${angka(baru)} selesai`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mencatat progres.");
      }
    });

  const kosong = !isi.target.length && !isi.agenda.length;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {kosong && ubah ? (
        <section className="flex flex-col items-start gap-4 rounded-[14px] border-2 border-dashed border-primary/30 bg-primary/5 p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-primary-strong">
              Belum ada persiapan untuk acara ini
            </h2>
            <p className="mt-1 max-w-[680px] text-[0.9375rem] text-muted-foreground">
              Untuk acara besar: target harian (mis. lipat box sebelum hari H)
              yang progresnya diisi tim, plus agenda per tim. Pesan WA-nya
              tersusun sendiri seperti &ldquo;UPDATE Target Lipat2 Box&rdquo;
              Mbak Ari.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-12 rounded-full px-6 text-base"
              onClick={() => {
                if (!draf.target.length)
                  return void toast.error(
                    "Pesanan ini tidak berisi box — tambahkan target sendiri.",
                  );
                setIsi(draf);
                toast.success(
                  "Draf dibuat: semua box pesanan dibagi rata H-6 s.d. H-3. Geser sesuai rencana, lalu Simpan.",
                );
              }}
            >
              <Sparkles className="size-5" /> Buat target lipat box otomatis
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-full px-6 text-base"
              onClick={() =>
                setIsi((p) => ({
                  ...p,
                  agenda: [...p.agenda, agendaBaru(tanggalAcara)],
                }))
              }
            >
              <Plus className="size-5" /> Agenda tim
            </Button>
          </div>
        </section>
      ) : null}

      {isi.target.map((t, i) => {
        const total = totalTarget(t);
        const dijadwalkan = t.harian.reduce((n, h) => n + h.target, 0);
        return (
          <section key={i} className={KARTU}>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={t.judul}
                onChange={(e) => ubahTarget(i, { judul: e.target.value })}
                disabled={!ubah}
                aria-label="Nama target"
                className="max-w-xs text-base font-semibold"
                maxLength={100}
              />
              <Input
                value={t.satuan}
                onChange={(e) => ubahTarget(i, { satuan: e.target.value })}
                disabled={!ubah}
                aria-label="Satuan"
                className="w-24"
                maxLength={20}
              />
              <p className="text-sm text-muted-foreground">
                Total{" "}
                <b className="text-foreground tabular-nums">{angka(total)}</b>{" "}
                {t.satuan}
                {dijadwalkan !== total ? (
                  <span className="text-perhatian">
                    {" "}
                    · terjadwal {angka(dijadwalkan)}
                  </span>
                ) : null}
              </p>
              {ubah ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto rounded-full text-muted-foreground"
                  aria-label="Hapus target"
                  onClick={() =>
                    setIsi((p) => ({
                      ...p,
                      target: p.target.filter((_, k) => k !== i),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div>
                <h3 className="text-sm font-semibold">Total order</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {t.rincian.map((r, j) => (
                    <li
                      key={j}
                      className="grid grid-cols-[minmax(0,1fr)_6rem_2.25rem] items-center gap-2"
                    >
                      <Input
                        value={r.nama}
                        disabled={!ubah}
                        aria-label="Nama rincian"
                        onChange={(e) =>
                          ubahTarget(i, {
                            rincian: t.rincian.map((x, k) =>
                              k === j ? { ...x, nama: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Input
                        value={String(r.jumlah)}
                        disabled={!ubah}
                        inputMode="numeric"
                        aria-label="Jumlah"
                        className="text-right tabular-nums"
                        onChange={(e) =>
                          ubahTarget(i, {
                            rincian: t.rincian.map((x, k) =>
                              k === j
                                ? { ...x, jumlah: keAngka(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                      {ubah ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-muted-foreground"
                          aria-label="Hapus rincian"
                          onClick={() =>
                            ubahTarget(i, {
                              rincian: t.rincian.filter((_, k) => k !== j),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {ubah ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full"
                    onClick={() =>
                      ubahTarget(i, {
                        rincian: [...t.rincian, { nama: "", jumlah: 0 }],
                      })
                    }
                  >
                    <Plus className="size-4" /> Rincian
                  </Button>
                ) : null}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    Target selesai per hari
                  </h3>
                  {ubah && t.harian.length ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        ubahTarget(i, {
                          harian: bagiRata(
                            total,
                            t.harian.map((h) => h.tanggal),
                          ).map((h) => ({ ...h, tercapai: 0 })),
                        })
                      }
                    >
                      Bagi rata {angka(total)} ke {t.harian.length} hari
                    </Button>
                  ) : null}
                </div>
                <ul className="mt-2 flex flex-col divide-y">
                  {t.harian.map((h, j) => {
                    const sudah = tercapai(t.judul, h.tanggal);
                    const persen = h.target
                      ? Math.min(100, Math.round((sudah / h.target) * 100))
                      : 0;
                    const tersimpanHari = Boolean(
                      awal?.target
                        .find((x) => x.judul === t.judul)
                        ?.harian.some((x) => x.tanggal === h.tanggal),
                    );
                    return (
                      <li
                        key={j}
                        className="grid gap-2 py-3 sm:grid-cols-[12.5rem_6.5rem_minmax(0,1fr)] sm:items-center"
                      >
                        <div className="flex items-center gap-2">
                          <PilihTanggal
                            value={h.tanggal}
                            onChange={(v) =>
                              ubahTarget(i, {
                                harian: t.harian.map((x, k) =>
                                  k === j ? { ...x, tanggal: v } : x,
                                ),
                              })
                            }
                            bisaHapus={false}
                            disabled={!ubah}
                            aria-label="Tanggal target"
                          />
                        </div>
                        <Input
                          value={String(h.target)}
                          disabled={!ubah}
                          inputMode="numeric"
                          aria-label="Target hari itu"
                          className="text-right tabular-nums"
                          onChange={(e) =>
                            ubahTarget(i, {
                              harian: t.harian.map((x, k) =>
                                k === j
                                  ? { ...x, target: keAngka(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                        />
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <div className="min-w-28 flex-1">
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {labelH(h.tanggal, tanggalAcara)} · selesai{" "}
                              <b
                                className={cn(
                                  "text-foreground",
                                  persen >= 100 && "text-lunas",
                                )}
                              >
                                {angka(sudah)}
                              </b>{" "}
                              / {angka(h.target)}
                            </p>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  persen >= 100 ? "bg-lunas" : "bg-primary",
                                )}
                                style={{ width: `${persen}%` }}
                              />
                            </span>
                          </div>
                          {progres && tersimpanHari && !berubah ? (
                            <span className="flex gap-1">
                              {[50, 100].map((n) => (
                                <Button
                                  key={n}
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full tabular-nums"
                                  disabled={sibuk}
                                  onClick={() => tambah(t.judul, h.tanggal, n)}
                                >
                                  +{n}
                                </Button>
                              ))}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full tabular-nums text-muted-foreground"
                                disabled={sibuk || !sudah}
                                onClick={() => tambah(t.judul, h.tanggal, -50)}
                                aria-label="Kurangi 50"
                              >
                                −50
                              </Button>
                            </span>
                          ) : null}
                          {ubah ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full text-muted-foreground"
                              aria-label="Hapus hari"
                              onClick={() =>
                                ubahTarget(i, {
                                  harian: t.harian.filter((_, k) => k !== j),
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {ubah ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full"
                    onClick={() => {
                      const akhir = t.harian.at(-1)?.tanggal;
                      ubahTarget(i, {
                        harian: [
                          ...t.harian,
                          {
                            tanggal: akhir
                              ? geserTanggal(akhir, 1)
                              : geserTanggal(tanggalAcara, -3),
                            target: 0,
                            tercapai: 0,
                          },
                        ],
                      });
                    }}
                  >
                    <Plus className="size-4" /> Hari
                  </Button>
                ) : null}
                {berubah && progres ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Simpan dulu perubahan jadwal untuk mencatat progres.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      {isi.agenda.length ? (
        <section className={KARTU}>
          <h2 className={JUDUL}>Agenda tim</h2>
          <p className="pt-1 text-sm text-muted-foreground">
            Tugas persiapan per tim (mis. rapikan ruang nata, bantu bikin kue,
            loading set-up). Tiap agenda bisa disalin sebagai pesan &ldquo;To:
            Tim …&rdquo;.
          </p>
          <ul className="mt-4 flex flex-col divide-y">
            {isi.agenda.map((a, i) => (
              <li key={i} className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={a.judul}
                    disabled={!ubah}
                    onChange={(e) => ubahAgenda(i, { judul: e.target.value })}
                    placeholder="Perihal, contoh: Persiapan Ruang Nata Box di Outentika"
                    aria-label="Perihal agenda"
                    className="font-semibold"
                    maxLength={200}
                  />
                  {a.judul.trim() ? (
                    <SalinTeks
                      teks={teksAgenda(a, { acara, tanggalAcara })}
                      label="Salin"
                      pesan="Pesan agenda tersalin. Tempel di grup WA tim."
                    />
                  ) : null}
                  {ubah ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-full text-muted-foreground"
                      aria-label="Hapus agenda"
                      onClick={() =>
                        setIsi((p) => ({
                          ...p,
                          agenda: p.agenda.filter((_, k) => k !== i),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <PilihanChip
                  kecil
                  label="Untuk tim"
                  nilai={a.tim}
                  onPilih={(v) => ubahAgenda(i, { tim: a.tim === v ? "" : v })}
                  pilihan={TIM_PERSIAPAN.map((x) => ({ nilai: x, label: x }))}
                />
                <div className="grid gap-2 sm:grid-cols-[12.5rem_12.5rem_minmax(0,1fr)] sm:items-center">
                  <PilihTanggal
                    value={a.dari}
                    onChange={(v) =>
                      ubahAgenda(i, {
                        dari: v,
                        sampai: a.sampai < v ? v : a.sampai,
                      })
                    }
                    bisaHapus={false}
                    disabled={!ubah}
                    aria-label="Mulai"
                  />
                  <PilihTanggal
                    value={a.sampai}
                    onChange={(v) => ubahAgenda(i, { sampai: v })}
                    bisaHapus={false}
                    disabled={!ubah}
                    aria-label="Selesai"
                  />
                  <p className="text-sm text-muted-foreground">
                    {rentangTanggal(a.dari, a.sampai)} ·{" "}
                    {labelH(a.dari, tanggalAcara)}
                  </p>
                </div>
                <Textarea
                  value={a.butir.join("\n")}
                  disabled={!ubah}
                  onChange={(e) =>
                    ubahAgenda(i, {
                      butir: e.target.value
                        .split("\n")
                        .map((x) => x.replace(/^\s*\d+[.)]\s*/, ""))
                        .filter(
                          (x, k, all) => x.trim() || k === all.length - 1,
                        ),
                    })
                  }
                  placeholder={
                    "Daftar tugas, satu per baris (boleh kosong). Contoh:\nTolong rapihkan ruang bekas acara Sabtu kemarin\nSiapkan susunan meja utk alur nata Snack box"
                  }
                  aria-label="Daftar tugas"
                  className="min-h-16"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!kosong ? (
        <section className={KARTU}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={JUDUL}>Pesan update hari ini</h2>
            <SalinTeks
              teks={teksPersiapan(lengkap, { acara, tanggalAcara, hariIni })}
              label="Salin ke WA"
              pesan="Pesan update tersalin. Tempel di grup WA tim."
            />
          </div>
          <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-muted/50 p-4 font-sans text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
            {teksPersiapan(lengkap, { acara, tanggalAcara, hariIni })}
          </pre>
        </section>
      ) : null}

      {ubah && !kosong ? (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border bg-card/95 p-2 pr-5 shadow-[0_8px_24px_-8px_rgba(31,42,92,0.25)] backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-full px-6"
              disabled={sibuk || !berubah}
              onClick={simpan}
            >
              {sibuk ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full px-4"
              onClick={() =>
                setIsi((p) => ({
                  ...p,
                  agenda: [...p.agenda, agendaBaru(tanggalAcara)],
                }))
              }
            >
              <Plus className="size-4" /> Agenda
            </Button>
            {!isi.target.length ? (
              <Button
                variant="outline"
                className="h-11 rounded-full px-4"
                onClick={() =>
                  setIsi((p) => ({
                    ...p,
                    target: draf.target.length
                      ? draf.target
                      : [
                          {
                            judul: "Lipat box",
                            satuan: "box",
                            rincian: [],
                            harian: [],
                          },
                        ],
                  }))
                }
              >
                <Plus className="size-4" /> Target
              </Button>
            ) : null}
          </div>
          <p
            className={cn(
              "min-w-0 flex-1 text-sm",
              berubah ? "font-medium text-tempo" : "text-muted-foreground",
            )}
          >
            {berubah ? "Ada perubahan yang belum disimpan." : "Tersimpan."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const labelTgl = (t: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${t}T00:00:00Z`));
const agendaBaru = (tanggalAcara: string): AgendaPersiapan => ({
  judul: "",
  tim: "",
  dari: geserTanggal(tanggalAcara, -2),
  sampai: geserTanggal(tanggalAcara, -1),
  butir: [],
});
