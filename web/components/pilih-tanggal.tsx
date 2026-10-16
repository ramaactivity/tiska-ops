"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { gridBulan, HARI_PENDEK, hariIniWib, labelTanggal, NAMA_BULAN, uraiTanggal } from "@/lib/kalender";
import { cn } from "@/lib/utils";

/**
 * Pemilih tanggal custom (D-059) — pengganti <input type="date"> bawaan.
 * Nilai "YYYY-MM-DD". Bisa dikendalikan (value/onChange) atau dipakai di form
 * biasa (name + defaultValue → input tersembunyi). Klik judul bulan untuk
 * melompat bulan/tahun. Minggu dimulai Senin.
 */
export function PilihTanggal({
  value,
  defaultValue = "",
  onChange,
  name,
  id,
  placeholder = "Pilih tanggal",
  bisaHapus = true,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (tanggal: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  bisaHapus?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const [sendiri, setSendiri] = useState(defaultValue);
  const nilai = value ?? sendiri;
  const [buka, setBuka] = useState(false);
  const acuan = uraiTanggal(nilai) ?? uraiTanggal(hariIniWib())!;
  const [lihat, setLihat] = useState({ y: acuan.y, m: acuan.m });
  const [modeBulan, setModeBulan] = useState(false);
  const hariIni = hariIniWib();

  const pilih = (t: string) => {
    if (value === undefined) setSendiri(t);
    onChange?.(t);
    setBuka(false);
  };
  const geserBulan = (n: number) =>
    setLihat(({ y, m }) => {
      const t = new Date(Date.UTC(y, m + n, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });

  return (
    <Popover
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (o) {
          const a = uraiTanggal(nilai) ?? uraiTanggal(hariIni)!;
          setLihat({ y: a.y, m: a.m });
          setModeBulan(false);
        }
      }}
    >
      {name ? <input type="hidden" name={name} value={nilai} /> : null}
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-left text-base transition-colors outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-[0.9375rem] dark:bg-input/30",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate", !nilai && "text-subtle-foreground")}>{nilai ? labelTanggal(nilai) : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[296px]">
        <div className="flex items-center justify-between gap-2 pb-2">
          <button
            type="button"
            onClick={() => (modeBulan ? setLihat((l) => ({ ...l, y: l.y - 1 })) : geserBulan(-1))}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={modeBulan ? "Tahun sebelumnya" : "Bulan sebelumnya"}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setModeBulan((x) => !x)}
            className="rounded-full px-3 py-1.5 text-[0.9375rem] font-semibold text-primary-strong transition-colors hover:bg-muted"
            aria-label="Pilih bulan dan tahun"
          >
            {modeBulan ? lihat.y : `${NAMA_BULAN[lihat.m]} ${lihat.y}`}
          </button>
          <button
            type="button"
            onClick={() => (modeBulan ? setLihat((l) => ({ ...l, y: l.y + 1 })) : geserBulan(1))}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={modeBulan ? "Tahun berikutnya" : "Bulan berikutnya"}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {modeBulan ? (
          <div className="grid grid-cols-3 gap-1.5">
            {NAMA_BULAN.map((b, i) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setLihat((l) => ({ ...l, m: i }));
                  setModeBulan(false);
                }}
                className={cn(
                  "h-10 rounded-[10px] text-sm transition-colors",
                  i === lihat.m ? "bg-primary font-medium text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {b.slice(0, 3)}
              </button>
            ))}
          </div>
        ) : (
          <div role="grid" aria-label={`${NAMA_BULAN[lihat.m]} ${lihat.y}`}>
            <div className="grid grid-cols-7 pb-1">
              {HARI_PENDEK.map((h) => (
                <span key={h} className="text-center text-xs font-medium text-subtle-foreground">
                  {h}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {gridBulan(lihat.y, lihat.m).map((h) => {
                const terpilih = h.tanggal === nilai;
                return (
                  <button
                    key={h.tanggal}
                    type="button"
                    onClick={() => pilih(h.tanggal)}
                    aria-pressed={terpilih}
                    aria-label={labelTanggal(h.tanggal)}
                    className={cn(
                      "mx-auto flex size-9 items-center justify-center rounded-full font-mono text-sm transition-colors",
                      terpilih
                        ? "bg-primary font-semibold text-primary-foreground"
                        : h.tanggal === hariIni
                          ? "font-semibold text-primary ring-1 ring-primary/40 hover:bg-accent"
                          : h.diBulanIni
                            ? "text-foreground hover:bg-muted"
                            : "text-subtle-foreground/60 hover:bg-muted",
                    )}
                  >
                    {h.hari}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button type="button" onClick={() => pilih(hariIni)} className="rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent">
            Hari ini
          </button>
          {bisaHapus && nilai ? (
            <button type="button" onClick={() => pilih("")} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
              <X className="size-3.5" />
              Hapus
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
