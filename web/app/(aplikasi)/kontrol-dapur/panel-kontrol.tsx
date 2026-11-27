"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Megaphone,
  Monitor,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
  Mic,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { ChipStatus } from "@/components/lencana-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  layarOnline,
  suaraNatural,
  TEMPLATE_PENGUMUMAN,
} from "@/lib/kontrol-dapur";

import { PerekamSuara } from "./perekam-suara";
import { cn } from "@/lib/utils";

import {
  aturMode,
  aturRunning,
  bacaKontrol,
  kirimPerintah,
  namaiLayar,
  umumkan,
} from "./actions";

type Keadaan = Awaited<ReturnType<typeof bacaKontrol>>;

const jam = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

function sejak(iso: string, kini: Date): string {
  const d = Math.max(
    0,
    Math.round((kini.getTime() - new Date(iso).getTime()) / 1000),
  );
  if (d < 60) return `${d} detik lalu`;
  if (d < 3600) return `${Math.round(d / 60)} menit lalu`;
  return `sejak ${jam(iso)}`;
}

export function Kartu({
  judul,
  keterangan,
  children,
  className,
}: {
  judul: string;
  keterangan?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border bg-card p-5 shadow-[0_1px_2px_rgba(31,42,92,0.04)] sm:p-6",
        className,
      )}
    >
      <h2 className="text-lg font-bold tracking-[-0.01em] text-primary-strong">
        {judul}
      </h2>
      {keterangan ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{keterangan}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PanelKontrol({ awal }: { awal: Keadaan }) {
  const [k, setK] = useState(awal);
  const [kini, setKini] = useState(() => new Date(awal.sekarang));
  const [sibuk, mulai] = useTransition();
  const [teks, setTeks] = useState("");
  const [running, setRunning] = useState(awal.running.teks);
  const [ubahNama, setUbahNama] = useState<{ id: string; nama: string } | null>(
    null,
  );

  // Keadaan layar dibaca ulang tiap 5 detik — layar melapor tiap 6 detik.
  useEffect(() => {
    let hidup = true;
    const baca = () =>
      bacaKontrol()
        .then((b) => {
          if (!hidup) return;
          setK(b);
          setKini(new Date(b.sekarang));
        })
        .catch(() => {});
    const t = setInterval(baca, 5_000);
    return () => {
      hidup = false;
      clearInterval(t);
    };
  }, []);

  const jalankan = (aksi: () => Promise<unknown>, pesan: string) =>
    mulai(async () => {
      try {
        await aksi();
        toast.success(pesan);
        const b = await bacaKontrol();
        setK(b);
        setKini(new Date(b.sekarang));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal. Coba lagi.");
      }
    });

  const online = k.layar.filter((l) => layarOnline(l.terakhir, kini));
  const tahan = k.mode === "tahan";

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <Kartu
          judul="Layar di dapur"
          keterangan={
            online.length
              ? `${online.length} dari ${k.layar.length} layar menyala sekarang.`
              : "Belum ada layar yang menyala."
          }
        >
          {k.layar.length === 0 ? (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Buka{" "}
              <b className="text-foreground">
                tiska-ops.vercel.app/layar-dapur
              </b>{" "}
              di browser TV dapur memakai akun kepala dapur. Layar itu akan
              muncul di sini dalam beberapa detik.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {k.layar.map((l, n) => {
                const nyala = layarOnline(l.terakhir, kini);
                const nama = l.nama || `Layar ${n + 1}`;
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Monitor
                          className={cn(
                            "size-5 shrink-0",
                            nyala ? "text-lunas" : "text-muted-foreground",
                          )}
                          strokeWidth={1.75}
                        />
                        {ubahNama?.id === l.id ? (
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              jalankan(
                                () => namaiLayar(l.id, ubahNama.nama),
                                "Nama layar disimpan",
                              );
                              setUbahNama(null);
                            }}
                          >
                            <Input
                              autoFocus
                              value={ubahNama.nama}
                              onChange={(e) =>
                                setUbahNama({ id: l.id, nama: e.target.value })
                              }
                              placeholder="mis. TV Dapur Masak"
                              className="h-9 w-52"
                            />
                            <Button size="sm" type="submit" disabled={sibuk}>
                              Simpan
                            </Button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="truncate text-left font-semibold hover:underline"
                            onClick={() =>
                              setUbahNama({ id: l.id, nama: l.nama ?? "" })
                            }
                            title="Ganti nama layar"
                          >
                            {nama}
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {nyala
                          ? `Menyala · melapor ${sejak(l.terakhir, kini)}`
                          : `Mati / terputus · terakhir ${sejak(l.terakhir, kini)}`}
                        {l.ukuran ? ` · ${l.ukuran}` : ""}
                        {l.dapur
                          ? ` · ${l.dapur === "masak" ? "Dapur Masak" : "Dapur Pastry/Bersih"}`
                          : ""}
                      </p>
                      {nyala && l.tayang ? (
                        <p className="mt-1 text-sm">
                          Sedang tayang: <b>{l.tayang}</b>
                        </p>
                      ) : null}
                    </div>
                    {nyala ? (
                      <div className="flex flex-wrap gap-1.5">
                        <ChipStatus
                          label={l.suara ? "Suara aktif" : "Suara belum aktif"}
                          nada={l.suara ? "lunas" : "perhatian"}
                          ikon={l.suara ? Volume2 : VolumeX}
                        />
                        {l.tts !== null ? (
                          <ChipStatus
                            label={
                              /natural|online/i.test(l.tts ?? "")
                                ? "Suara natural"
                                : suaraNatural(l.tts)
                                  ? "Suara Google"
                                  : "Suara robotik"
                            }
                            nada={suaraNatural(l.tts) ? "lunas" : "perhatian"}
                          />
                        ) : null}
                        <ChipStatus
                          label={l.penuh ? "Layar penuh" : "Belum layar penuh"}
                          nada={l.penuh ? "lunas" : "netral"}
                        />
                      </div>
                    ) : (
                      <ChipStatus label="Tidak terhubung" nada="tempo" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {online.some((l) => !l.suara) ? (
            <p className="mt-3 text-sm text-perhatian">
              Suara belum aktif: minta orang dapur menyentuh layar TV sekali
              (atau tekan tombol apa saja di remote/keyboard).
            </p>
          ) : null}
          {online.some((l) => l.tts !== null && !suaraNatural(l.tts)) ? (
            <p className="mt-3 text-sm text-perhatian">
              Suara robotik: TV memakai suara bawaan sistem. Buka layar dapur di
              browser Microsoft Edge (gratis, ada di Windows, Mac, dan Android)
              supaya dibacakan suara natural Gadis.
            </p>
          ) : null}
        </Kartu>

        <Kartu
          judul="Tayangan"
          keterangan={
            tahan
              ? "Ditahan: layar tetap di halaman ini sampai diganti dari sini."
              : "Otomatis: halaman di TV berganti sendiri tiap 20 detik."
          }
        >
          <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-2">
            <Button
              variant="outline"
              className="h-14 rounded-2xl text-base"
              disabled={sibuk}
              onClick={() =>
                jalankan(
                  () => kirimPerintah("prev"),
                  "Layar mundur satu halaman",
                )
              }
            >
              <ChevronLeft className="size-5" /> Sebelumnya
            </Button>
            <Button
              className="h-14 rounded-2xl text-base"
              variant={tahan ? "default" : "outline"}
              disabled={sibuk}
              onClick={() =>
                jalankan(
                  () => aturMode(tahan ? "otomatis" : "tahan"),
                  tahan ? "Kembali berganti otomatis" : "Tayangan ditahan",
                )
              }
            >
              {tahan ? (
                <Play className="size-5" />
              ) : (
                <Pause className="size-5" />
              )}
              {tahan ? "Lanjutkan otomatis" : "Tahan halaman ini"}
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl text-base"
              disabled={sibuk}
              onClick={() =>
                jalankan(() => kirimPerintah("next"), "Layar maju satu halaman")
              }
            >
              Berikutnya <ChevronRight className="size-5" />
            </Button>
          </div>
          {online[0]?.tayang ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {online.length > 1
                ? "Layar 1 sedang menayangkan"
                : "Sedang tayang"}
              : <b className="text-foreground">{online[0].tayang}</b>
            </p>
          ) : null}
        </Kartu>

        <Kartu
          judul="Running text"
          keterangan="Teks berjalan di bawah layar TV, seperti berita. Cocok untuk info penting yang perlu terus terlihat."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={running}
              onChange={(e) => setRunning(e.target.value)}
              maxLength={500}
              placeholder="mis. Hari ini pesanan UNPAK 3.400 box — kloter pertama berangkat 04.00"
              className="h-11"
            />
            <div className="flex shrink-0 gap-2">
              <Button
                className="h-11 rounded-full px-5"
                disabled={sibuk}
                onClick={() =>
                  jalankan(
                    () => aturRunning(running, true),
                    "Running text tayang di TV",
                  )
                }
              >
                Tayangkan
              </Button>
              {k.running.aktif ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5"
                  disabled={sibuk}
                  onClick={() =>
                    jalankan(
                      () => aturRunning(running, false),
                      "Running text dimatikan",
                    )
                  }
                >
                  Matikan
                </Button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {k.running.aktif ? (
              <ChipStatus
                label="Sedang tayang"
                nada="lunas"
                ikon={CircleCheck}
              />
            ) : (
              "Tidak tayang."
            )}
          </p>
        </Kartu>
      </div>

      <div className="flex flex-col gap-5">
        <Kartu
          judul="Bicara ke dapur"
          keterangan="Ucapkan pesan Anda — suaranya diputar di speaker dapur sesudah bunyi ding-dong, beberapa detik setelah dikirim."
        >
          <PerekamSuara
            onTerkirim={() =>
              void bacaKontrol()
                .then(setK)
                .catch(() => {})
            }
          />
        </Kartu>

        <Kartu
          judul="Umumkan ke dapur"
          keterangan="Layar berbunyi ding-dong, menampilkan tulisan besar, lalu membacakannya."
        >
          <Textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Tulis pengumuman, mis. Kloter 2 berangkat 10 menit lagi, bawa ke area muat."
            className="text-base"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {TEMPLATE_PENGUMUMAN.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeks(t)}
                className="rounded-full border bg-secondary/60 px-3 py-1.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-full px-5"
              disabled={sibuk || !teks.trim()}
              onClick={() =>
                jalankan(async () => {
                  await umumkan(teks);
                  setTeks("");
                }, "Pengumuman dikirim ke layar dapur")
              }
            >
              <Megaphone className="size-4" /> Umumkan
            </Button>
            {k.pengumuman[0] ? (
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                disabled={sibuk}
                onClick={() =>
                  jalankan(
                    () => kirimPerintah("ulang"),
                    "Pengumuman terakhir diulang di layar",
                  )
                }
              >
                <Repeat className="size-4" /> Ulangi yang terakhir
              </Button>
            ) : null}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-muted-foreground">
            Pengumuman terakhir
          </h3>
          {k.pengumuman.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada pengumuman.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y">
              {k.pengumuman.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.9375rem]">
                      {p.suara ? (
                        <Mic className="size-4 shrink-0 text-primary" />
                      ) : null}
                      {p.teks}
                      {p.suara && p.ms ? (
                        <span className="text-muted-foreground tabular-nums">
                          · {Math.max(1, Math.round(p.ms / 1000))} dtk
                        </span>
                      ) : null}
                      {p.suara ? (
                        <button
                          type="button"
                          onClick={() =>
                            void new Audio(`/layar-dapur/suara/${p.id}`)
                              .play()
                              .catch(() =>
                                toast.error(
                                  "Rekaman tidak bisa diputar di browser ini.",
                                ),
                              )
                          }
                          className="ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium hover:bg-accent"
                        >
                          <Play className="size-3" /> Dengar
                        </button>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {jam(p.dibuat)}
                      {p.oleh ? ` · ${p.oleh}` : ""}
                    </p>
                  </div>
                  {p.dibacakan ? (
                    <ChipStatus
                      label={`Tayang ${jam(p.dibacakan)}`}
                      nada="lunas"
                      ikon={CircleCheck}
                    />
                  ) : (
                    <ChipStatus
                      label="Menunggu layar"
                      nada="perhatian"
                      ikon={Clock}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      </div>
    </div>
  );
}
