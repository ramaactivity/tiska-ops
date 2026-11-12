"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Isian teks bebas + daftar saran (D-069): ketik sendiri atau pilih dari
 * daftar — yang sudah pernah dipakai muncul lebih dulu, jadi penulisan
 * seragam ("Pernikahan", bukan "nikahan"/"Wedding") dan lebih cepat.
 * Pengganti <datalist> bawaan browser (dilarang DESIGN.md). Keyboard:
 * ↑/↓ memilih, Enter mengisi, Esc menutup.
 */
export function InputSaran({
  id,
  value,
  onChange,
  saran,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  saran: readonly string[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [sorot, setSorot] = useState(0);
  const idDaftar = useId();
  const tutupNanti = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cocok = useMemo(() => {
    const k = value.trim().toLowerCase();
    const unik = [...new Set(saran.map((s) => s.trim()).filter(Boolean))];
    const hasil = k ? unik.filter((s) => s.toLowerCase().includes(k) && s.toLowerCase() !== k) : unik;
    return hasil.slice(0, 8);
  }, [value, saran]);

  const pilih = (s: string) => {
    onChange(s);
    setBuka(false);
  };

  return (
    <div className="relative">
      <Input
        id={id}
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
          if (!buka || !cocok.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSorot((x) => (x + 1) % cocok.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSorot((x) => (x - 1 + cocok.length) % cocok.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pilih(cocok[sorot]);
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={buka && cocok.length > 0}
        aria-controls={idDaftar}
        autoComplete="off"
        className={className}
      />
      {buka && cocok.length ? (
        <ul
          id={idDaftar}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[12px] border bg-popover p-1 shadow-[0_12px_32px_-12px_rgba(31,42,92,0.28)]"
        >
          {cocok.map((s, i) => (
            <li key={s} role="option" aria-selected={i === sorot}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(s)}
                className={cn("flex min-h-9 w-full items-center rounded-[8px] px-3 text-left text-[0.9375rem]", i === sorot ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
