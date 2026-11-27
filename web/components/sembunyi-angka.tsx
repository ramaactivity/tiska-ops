"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   SEMBUNYIKAN ANGKA (Rama 27 Nov): tombol mata di samping Tanya Tiska untuk
   menutup angka uang di layar — saat berbagi layar, rapat, atau ada orang di
   sebelah. Diingat per perangkat.

   Cara kerja: CSS Custom Highlight API menandai teks "Rp …" tanpa mengubah DOM
   (aman untuk React) dan mewarnainya jadi balok abu. Elemen lain yang perlu
   ikut tertutup cukup diberi atribut data-rahasia.
   ========================================================================== */

const KUNCI = "tiska-sembunyi-angka";
const PERISTIWA = "tiska-sembunyi-angka";
/** "Rp 1.250.000", "-Rp 50.000", "Rp1,5 jt", "Rp 12,5 juta". */
export const POLA_UANG = /(?:[−-]\s?)?Rp\s?\d[\d.]*(?:,\d+)?(?:\s?(?:jt|juta|rb|ribu|M|miliar))?/g;

let nilai: boolean | null = null;
function baca(): boolean {
  if (nilai === null) {
    try {
      nilai = localStorage.getItem(KUNCI) === "1";
    } catch {
      nilai = false;
    }
  }
  return nilai;
}
function dengar(ubah: () => void) {
  const dariTabLain = (e: StorageEvent) => {
    if (e.key !== KUNCI) return;
    nilai = e.newValue === "1";
    ubah();
  };
  window.addEventListener(PERISTIWA, ubah);
  window.addEventListener("storage", dariTabLain);
  return () => {
    window.removeEventListener(PERISTIWA, ubah);
    window.removeEventListener("storage", dariTabLain);
  };
}
const useSembunyi = () => useSyncExternalStore(dengar, baca, () => false);

function ganti() {
  nilai = !baca();
  try {
    localStorage.setItem(KUNCI, nilai ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(PERISTIWA));
}

/** Tombol mata. `kecil` = ikon saja (bilah atas HP). */
export function TombolSembunyiAngka({ kecil = false }: { kecil?: boolean }) {
  const sembunyi = useSembunyi();
  const label = sembunyi ? "Tampilkan angka" : "Sembunyikan angka";
  const Ikon = sembunyi ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={ganti}
      aria-pressed={sembunyi}
      aria-label={label}
      title={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97]",
        kecil ? "size-10 hover:bg-muted" : "size-9 border bg-card hover:bg-accent",
        sembunyi ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Ikon className={kecil ? "size-5" : "size-4"} />
    </button>
  );
}

/** Dipasang sekali di kerangka: menandai angka uang di seluruh halaman selama mode sembunyi menyala. */
export function PenjagaAngka() {
  const sembunyi = useSembunyi();
  useEffect(() => {
    const akar = document.documentElement;
    akar.toggleAttribute("data-sembunyi-angka", sembunyi);
    if (!sembunyi || typeof CSS === "undefined" || !("highlights" in CSS)) return;
    let jadwal = 0;
    const tandai = () => {
      const rentang: Range[] = [];
      const jalan = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement?.closest("script,style,textarea") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
        const teks = n.nodeValue ?? "";
        if (!teks.includes("Rp")) continue;
        for (const m of teks.matchAll(POLA_UANG)) {
          const r = new Range();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          rentang.push(r);
        }
      }
      CSS.highlights.set("rahasia", new Highlight(...rentang));
    };
    tandai();
    // Halaman berganti / data dimuat ulang → tandai lagi (sekali per frame).
    const amati = new MutationObserver(() => {
      cancelAnimationFrame(jadwal);
      jadwal = requestAnimationFrame(tandai);
    });
    amati.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
      amati.disconnect();
      cancelAnimationFrame(jadwal);
      CSS.highlights.delete("rahasia");
    };
  }, [sembunyi]);
  return null;
}
