"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/* ==========================================================================
   PANEL KANAN HALAMAN CETAK

   Kerangka cetak (app/(cetak)/layout.tsx) punya panel kendali di kanan. Tiap
   dokumen bisa menaruh pilihannya sendiri di sana (mis. pilihan kertas
   kwitansi) lewat <SlotPanelCetak>, tanpa kerangka harus tahu dokumennya.
   Isi slot tidak berada di dalam .lembar-cetak, jadi tidak ikut tercetak dan
   tidak ikut diukur oleh "Muat 1 halaman".
   ========================================================================== */

export const ID_SLOT = "panel-cetak-dokumen";

const diam = () => () => {};

export function SlotPanelCetak({ children }: { children: React.ReactNode }) {
  // Tempatnya baru ada setelah halaman tampil di browser.
  const tempat = useSyncExternalStore(diam, () => document.getElementById(ID_SLOT), () => null);
  return tempat ? createPortal(children, tempat) : null;
}

/** "A5 mendatar · 21 × 14,8 cm" — dibaca dari tinggi halaman yang dipasang dokumennya. */
export function LabelKertas() {
  const jalur = usePathname();
  const cari = useSearchParams();
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tinggi = getComputedStyle(document.documentElement).getPropertyValue("--tinggi-isi-cetak").trim();
    // Membaca ukuran kertas dari CSS halaman (sistem luar) setiap dokumen/pilihan berganti.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(tinggi === "148mm" ? "A5 mendatar · 21 × 14,8 cm" : tinggi === "297mm" ? "A4 · 21 × 29,7 cm" : "A4 · 21 × 29,7 cm · tepi 12 mm");
  }, [jalur, cari]);
  return <span className="tabular-nums">{label}</span>;
}
