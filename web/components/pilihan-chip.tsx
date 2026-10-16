"use client";

import { cn } from "@/lib/utils";

/**
 * Pengganti <select> bawaan untuk pilihan pendek (≤ ~10): deretan tombol
 * pill, yang terpilih gelap (DESIGN.md: tanpa kontrol native browser).
 * `nama` mengirim nilainya lewat input tersembunyi untuk form biasa.
 */
export function PilihanChip({
  pilihan,
  nilai,
  onPilih,
  label,
  nama,
  kecil = false,
}: {
  pilihan: readonly { nilai: string; label: string }[];
  nilai: string;
  onPilih: (nilai: string) => void;
  label: string;
  nama?: string;
  kecil?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {nama ? <input type="hidden" name={nama} value={nilai} /> : null}
      {pilihan.map((p) => (
        <button
          key={p.nilai}
          type="button"
          aria-pressed={nilai === p.nilai}
          onClick={() => onPilih(p.nilai)}
          className={cn(
            "rounded-full border transition-colors",
            kecil ? "min-h-8 px-3 text-xs" : "min-h-9 px-3.5 text-sm",
            nilai === p.nilai ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
