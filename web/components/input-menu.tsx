"use client";

import { Plus } from "lucide-react";
import { type InputHTMLAttributes, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { saringMirip } from "@/lib/cari-mirip";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

/** Satu saran untuk nama baris (D-141): paket, menu dapur, katalog product, atau menu yang pernah dijual. */
export type OpsiMenu = {
  kunci: string;
  jenis: "paket" | "menu" | "katalog" | "riwayat" | "alat";
  id?: string;
  label: string;
  /** Teks yang dicocokkan (nama, kode, alias). */
  cari: string[];
  sub?: string | null;
  harga?: string | null;
  satuan?: string | null;
  menuId?: string | null;
};

const LABEL_JENIS: Record<OpsiMenu["jenis"], string> = { paket: "Paket", menu: "Menu", katalog: "Katalog", riwayat: "Pernah dijual", alat: "Alat sewa" };

/**
 * Kotak nama menu dengan saran seperti mesin pencari: toleran salah ketik
 * (cari-mirip), tiap saran menampilkan jenis & harganya. ↑/↓ memilih, Enter
 * mengisi, Esc menutup. `onBaru` memunculkan pilihan "Tambah … sebagai menu
 * baru" untuk nama yang belum ada di data.
 */
export function InputMenu({
  value,
  onChange,
  opsi,
  onPilih,
  onBaru,
  placeholder,
  className,
  inputProps,
  baruSebagai = "menu baru",
}: {
  value: string;
  onChange: (v: string) => void;
  opsi: OpsiMenu[];
  onPilih: (o: OpsiMenu) => void;
  onBaru?: (teks: string) => void;
  placeholder?: string;
  className?: string;
  /** Teks pilihan tambah baru: "Tambah “…” sebagai {baruSebagai}" — mis. "alat baru" di section Sewa alat. */
  baruSebagai?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & Record<`data-${string}`, string | number>;
}) {
  const [buka, setBuka] = useState(false);
  const [sorot, setSorot] = useState(0);
  const idDaftar = useId();
  const tutupNanti = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teks = value.trim();
  const cocok = useMemo(() => (teks.length >= 2 ? saringMirip(teks, opsi, (o) => o.cari, 8) : []), [teks, opsi]);
  const baru = onBaru && teks.length >= 2 && !cocok.some((o) => o.label.toLowerCase() === teks.toLowerCase());
  const jumlah = cocok.length + (baru ? 1 : 0);

  const pilih = (i: number) => {
    if (i < cocok.length) onPilih(cocok[i]);
    else if (baru) onBaru!(teks);
    setBuka(false);
  };

  return (
    <div className="relative">
      <Input
        {...inputProps}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setBuka(true);
          setSorot(0);
        }}
        onFocus={() => {
          if (tutupNanti.current) clearTimeout(tutupNanti.current);
          setBuka(true);
        }}
        onBlur={() => {
          tutupNanti.current = setTimeout(() => setBuka(false), 120);
        }}
        onKeyDown={(e) => {
          if (!buka || !jumlah) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSorot((x) => (x + 1) % jumlah);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSorot((x) => (x - 1 + jumlah) % jumlah);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pilih(sorot);
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={buka && jumlah > 0}
        aria-controls={idDaftar}
        autoComplete="off"
        className={className}
      />
      {buka && jumlah ? (
        <ul
          id={idDaftar}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-80 w-full sm:w-[max(100%,min(30rem,calc(100vw-2rem)))] overflow-y-auto rounded-[12px] border bg-popover p-1 shadow-[0_12px_32px_-12px_rgba(31,42,92,0.28)]"
        >
          {cocok.map((o, i) => (
            <li key={o.kunci} role="option" aria-selected={i === sorot}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(i)}
                className={cn("flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 py-1.5 text-left", i === sorot ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-[0.9375rem]">{o.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {LABEL_JENIS[o.jenis]}
                    {o.sub ? ` · ${o.sub}` : ""}
                  </span>
                </span>
                <span className={cn("shrink-0 text-sm", o.harga ? "uang" : "text-xs text-muted-foreground")}>
                  {o.harga ? `${rupiah(o.harga)}${o.satuan ? `/${o.satuan}` : ""}` : "harga belum ada"}
                </span>
              </button>
            </li>
          ))}
          {baru ? (
            <li role="option" aria-selected={sorot === cocok.length}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(cocok.length)}
                className={cn("flex min-h-11 w-full items-center gap-2 rounded-[8px] px-3 text-left text-[0.9375rem] text-primary", sorot === cocok.length ? "bg-accent" : "hover:bg-muted")}
              >
                <Plus className="size-4 shrink-0" />
                <span className="truncate">
                  Tambah &ldquo;{teks}&rdquo; sebagai {baruSebagai}
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
