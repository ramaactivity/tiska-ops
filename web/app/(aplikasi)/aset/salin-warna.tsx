"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Kotak warna brand: ketuk = kode hex tersalin (untuk Canva, CapCut, percetakan). */
export function SalinWarna({ nama, hex, peran }: { nama: string; hex: string; peran: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hex);
          setTersalin(true);
          setTimeout(() => setTersalin(false), 1500);
          toast.success(`${hex} tersalin — tempel di Canva atau kirim ke percetakan.`);
        } catch {
          toast.error("Browser menolak menyalin. Blok kodenya lalu salin manual.");
        }
      }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card text-left transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`Salin kode warna ${nama} ${hex}`}
    >
      <span className="h-16 w-full border-b" style={{ backgroundColor: hex }} />
      <span className="flex min-w-0 flex-col gap-0.5 px-3.5 py-3">
        <span className="truncate text-sm font-medium">{nama}</span>
        <span className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-muted-foreground">
          {hex}
          {tersalin ? <Check className="size-3.5 text-lunas" /> : <Copy className="size-3.5 opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-60" />}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{peran}</span>
      </span>
    </button>
  );
}
