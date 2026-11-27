"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   SEMBUNYIKAN ANGKA (Rama 27 Nov): tombol mata di samping Tanya Tiska untuk
   menutup angka uang di layar — saat berbagi layar, rapat, atau ada orang di
   sebelah. Diingat per perangkat.

   Cara kerja: teks "Rp …" diganti "Rp ******" (lihat PenjagaAngka); elemen
   lain yang perlu ikut tertutup cukup diberi atribut data-rahasia (diburamkan).
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

/** "Rp 1.250.000" → "Rp ******", "-Rp 50.000" → "-Rp ******" (Rama: bintang, bukan kotak). */
export const tutupUang = (teks: string) =>
  teks.replace(POLA_UANG, (m) => `${/^[−-]/.test(m) ? m[0] : ""}Rp ******`);

/**
 * Dipasang sekali di kerangka: selama mode sembunyi menyala, teks uang di halaman diganti bintang. Hanya isi node teks
 * yang diubah di tempat (node tidak dipecah/dipindah) dan teks aslinya disimpan, jadi React tetap memegang node yang
 * sama; bila React memperbarui teksnya, pengamat menutupnya lagi. Saat dimatikan, semua teks dikembalikan.
 */
export function PenjagaAngka() {
  const sembunyi = useSembunyi();
  useEffect(() => {
    document.documentElement.toggleAttribute("data-sembunyi-angka", sembunyi);
    if (!sembunyi) return;
    const asli = new Map<Text, { asli: string; tutup: string }>();
    let jadwal = 0;
    const tandai = () => {
      const jalan = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement?.closest("script,style,textarea") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      for (let n = jalan.nextNode() as Text | null; n; n = jalan.nextNode() as Text | null) {
        const teks = n.nodeValue ?? "";
        const catat = asli.get(n);
        if (catat && teks === catat.tutup) continue; // sudah tertutup
        if (!teks.includes("Rp")) continue;
        const tutup = tutupUang(teks);
        if (tutup === teks) continue;
        asli.set(n, { asli: teks, tutup });
        n.nodeValue = tutup;
      }
      amati.takeRecords(); // perubahan buatan sendiri tidak memicu putaran baru
    };
    // Halaman berganti / data dimuat ulang / React menulis ulang teks → tutup lagi (sekali per frame).
    const amati = new MutationObserver(() => {
      cancelAnimationFrame(jadwal);
      jadwal = requestAnimationFrame(tandai);
    });
    amati.observe(document.body, { subtree: true, childList: true, characterData: true });
    tandai();
    return () => {
      amati.disconnect();
      cancelAnimationFrame(jadwal);
      for (const [n, c] of asli) if (n.isConnected && n.nodeValue === c.tutup) n.nodeValue = c.asli;
    };
  }, [sembunyi]);
  return null;
}
