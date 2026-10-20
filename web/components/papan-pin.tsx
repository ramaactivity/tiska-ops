"use client";

import { Delete } from "lucide-react";

/**
 * Papan angka PIN (D-101) untuk tim lapangan: tombol besar 0–9 tanpa keyboard
 * HP, titik terisi sebagai tanda berapa angka sudah ditekan.
 */
export function PapanPin({ nilai, ubah, maks = 6, nonaktif }: { nilai: string; ubah: (v: string) => void; maks?: number; nonaktif?: boolean }) {
  const tombol = "flex h-16 items-center justify-center rounded-2xl border bg-card text-2xl font-semibold tabular-nums shadow-sm active:bg-muted disabled:opacity-50";
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex h-5 gap-3" aria-label={`${nilai.length} angka`}>
        {Array.from({ length: Math.max(4, nilai.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full border-2 border-primary ${i < nilai.length ? "bg-primary" : ""}`} />
        ))}
      </div>
      <div className="grid w-full max-w-[18rem] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((a) => (
          <button key={a} type="button" className={tombol} disabled={nonaktif || nilai.length >= maks} onClick={() => ubah(nilai + a)}>
            {a}
          </button>
        ))}
        <span />
        <button type="button" className={tombol} disabled={nonaktif || nilai.length >= maks} onClick={() => ubah(nilai + "0")}>
          0
        </button>
        <button type="button" className={tombol} disabled={nonaktif || !nilai} onClick={() => ubah(nilai.slice(0, -1))} aria-label="Hapus satu angka">
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
