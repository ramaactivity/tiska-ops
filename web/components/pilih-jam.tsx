"use client";

import { Clock, X } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rapikanJam } from "@/lib/kalender";
import { cn } from "@/lib/utils";

/**
 * Pemilih jam custom (D-059) — pengganti isian jam bebas/<input type="time">.
 * Nilai "HH.MM" (format WIB yang dipakai tim: 05.00, 11.30). Kolom jam &
 * menit (per 5 menit); bisa juga diketik di kotak atas. Mendukung form biasa
 * (name + defaultValue) maupun dikendalikan.
 */
const JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MENIT = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function PilihJam({
  value,
  defaultValue = "",
  onChange,
  name,
  id,
  placeholder = "Pilih jam",
  bisaHapus = true,
  className,
  "aria-label": ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (jam: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  bisaHapus?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [sendiri, setSendiri] = useState(defaultValue);
  const nilai = value ?? sendiri;
  const [buka, setBuka] = useState(false);
  const [ketik, setKetik] = useState("");
  const [jj, mm] = nilai ? nilai.split(".") : ["", ""];

  const tetapkan = (v: string, tutup = false) => {
    if (value === undefined) setSendiri(v);
    onChange?.(v);
    if (tutup) setBuka(false);
  };

  return (
    <Popover
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (o) setKetik(nilai);
      }}
    >
      {name ? <input type="hidden" name={name} value={nilai} /> : null}
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-left text-base transition-colors outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-[0.9375rem] dark:bg-input/30",
          className,
        )}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate font-mono", !nilai && "font-sans text-subtle-foreground")}>{nilai || placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[232px]">
        <input
          value={ketik}
          onChange={(e) => setKetik(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const r = rapikanJam(ketik);
            if (r) tetapkan(r, true);
          }}
          onBlur={() => {
            const r = rapikanJam(ketik);
            if (r && r !== nilai) tetapkan(r);
          }}
          placeholder="Ketik, mis. 0530"
          aria-label="Ketik jam"
          inputMode="numeric"
          className="mb-2 h-9 w-full rounded-[10px] border border-input bg-card px-3 font-mono text-base outline-none focus-visible:border-ring md:text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Jam", JAM, jj, (v: string) => tetapkan(`${v}.${mm || "00"}`)],
            ["Menit", MENIT, mm, (v: string) => tetapkan(`${jj || "08"}.${v}`, true)],
          ].map(([judul, daftar, pilihan, klik]) => (
            <div key={judul as string}>
              <p className="pb-1 text-center text-xs font-medium text-subtle-foreground">{judul as string}</p>
              <div
                ref={(el) => {
                  // Langsung tergulir ke pilihan (atau jam 06 bila kosong) saat dibuka.
                  const target = el?.querySelector<HTMLElement>(`[data-nilai="${(pilihan as string) || (judul === "Jam" ? "06" : "00")}"]`);
                  if (el && target) el.scrollTop = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2;
                }}
                className="flex h-52 flex-col gap-0.5 overflow-y-auto rounded-[10px] bg-muted/50 p-1 [scrollbar-width:thin]"
                role="listbox"
                aria-label={judul as string}
              >
                {(daftar as string[]).map((v) => (
                  <button
                    key={v}
                    data-nilai={v}
                    type="button"
                    role="option"
                    aria-selected={v === pilihan}
                    onClick={() => (klik as (v: string) => void)(v)}
                    className={cn(
                      "h-8 shrink-0 rounded-[8px] font-mono text-sm transition-colors",
                      v === pilihan ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-card",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {bisaHapus && nilai ? (
          <div className="mt-2 flex justify-end border-t pt-2">
            <button type="button" onClick={() => tetapkan("", true)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
              <X className="size-3.5" />
              Hapus
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** "11.00–13.00": dua PilihJam (selesai boleh kosong). */
export function PilihRentangJam({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (rentang: string) => void;
  "aria-label"?: string;
}) {
  const [mulai = "", selesai = ""] = value.split(/\s*[–-]\s*/);
  const gabung = (m: string, s: string) => onChange(m && s ? `${m}–${s}` : m || (s ? `–${s}` : ""));
  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      <PilihJam value={rapikanJam(mulai) ?? ""} onChange={(m) => gabung(m, rapikanJam(selesai) ?? "")} placeholder="Mulai" aria-label={`${ariaLabel ?? "Jam"} mulai`} />
      <span className="text-muted-foreground">–</span>
      <PilihJam value={rapikanJam(selesai) ?? ""} onChange={(s) => gabung(rapikanJam(mulai) ?? "", s)} placeholder="Selesai" aria-label={`${ariaLabel ?? "Jam"} selesai`} />
    </div>
  );
}
