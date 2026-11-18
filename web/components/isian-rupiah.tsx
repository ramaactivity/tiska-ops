"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { ketikRupiah, tampilRupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type" | "inputMode"> & {
  /** Teks tersimpan ("1.500.000" atau "1500000"). */
  value: string;
  /** Menerima teks rapi "1.500.000" — dibaca server lewat `uraikanRupiah`. */
  onChange: (teks: string) => void;
  /** Boleh minus (potongan / diskon). */
  bolehMinus?: boolean;
};

/**
 * Isian rupiah seragam (Rama, 18 Nov 2026): "Rp" di depan, titik ribuan muncul sendiri saat mengetik, dan kursor
 * tetap di tempatnya walau angka di tengah diubah (isian lama melompatkan kursor ke ujung).
 */
export function IsianRupiah({ value, onChange, bolehMinus = false, className, ...props }: Props) {
  return (
    <div className="relative min-w-0">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={tampilRupiah(value, bolehMinus)}
        onChange={(e) => {
          const el = e.target;
          // Titik ribuan disusun ulang langsung di kotak, lalu kursor diletakkan lagi setelah angka ke-n yang sama.
          // Dikerjakan seketika (bukan menunggu gambar ulang) supaya tombol hapus yang ditekan cepat tetap tepat;
          // React tidak menimpa isian karena nilainya sudah sama.
          let n = (el.value.slice(0, el.selectionStart ?? el.value.length).match(/[\d-]/g) ?? []).length;
          const baru = ketikRupiah(el.value, bolehMinus);
          el.value = baru;
          let i = 0;
          while (i < baru.length && n > 0) if (/[\d-]/.test(baru[i++])) n--;
          el.setSelectionRange(i, i);
          onChange(baru);
        }}
        className={cn("angka pl-9 tabular-nums", className)}
      />
    </div>
  );
}
