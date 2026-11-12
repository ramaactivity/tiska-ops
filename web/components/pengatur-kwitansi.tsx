"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";

/* ==========================================================================
   PENGATUR CETAK KWITANSI (tidak ikut tercetak)

   Kertas: A5 polos (desain penuh) · Blanko Tiska (isi saja, di kertas kwitansi
   yang sudah tercetak) · A4 isi 2 (atas-bawah, potong di tengah).
   Pilihan disimpan di alamat halaman (?kertas=&ttd=&bawah=) supaya server yang
   menggambar lembarnya. Geser blanko disimpan per komputer (localStorage):
   tiap printer menarik kertas sedikit berbeda.
   ========================================================================== */

const KERTAS = [
  { nilai: "a5", label: "A5 polos" },
  { nilai: "blanko", label: "Blanko kwitansi Tiska" },
  { nilai: "a4", label: "A4 isi 2" },
] as const;
const TTD = [
  { nilai: "digital", label: "Tanda tangan digital" },
  { nilai: "basah", label: "Tanda tangan basah" },
] as const;

const KUNCI_GESER = "geser-blanko";
type Geser = { x: number; y: number };

function pasangGeser(g: Geser) {
  document.documentElement.style.setProperty("--geser-x", `${g.x}mm`);
  document.documentElement.style.setProperty("--geser-y", `${g.y}mm`);
}

export function PengaturKwitansi({
  kertas,
  ttd,
  bawah,
  pilihanBawah,
}: {
  kertas: string;
  ttd: string;
  bawah: OpsiCari;
  pilihanBawah: OpsiCari[];
}) {
  const router = useRouter();
  const jalur = usePathname();
  const cari = useSearchParams();
  const [geser, setGeser] = useState<Geser>({ x: 0, y: 0 });

  const ganti = (kunci: string, nilai: string) => {
    const q = new URLSearchParams(cari.toString());
    q.set(kunci, nilai);
    router.replace(`${jalur}?${q}`, { scroll: false });
  };

  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(KUNCI_GESER) ?? "null") as Geser | null;
      if (g && Number.isFinite(g.x) && Number.isFinite(g.y)) {
        // Menyelaraskan dengan setelan tersimpan di browser (sistem luar) sekali saat dibuka — pola skala-cetak.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGeser(g);
        pasangGeser(g);
      }
    } catch {
      /* penyimpanan browser tidak tersedia — mulai dari 0 */
    }
  }, []);

  const ubahGeser = (dx: number, dy: number) => {
    const g = dx === 0 && dy === 0 ? { x: 0, y: 0 } : { x: Math.round((geser.x + dx) * 10) / 10, y: Math.round((geser.y + dy) * 10) / 10 };
    setGeser(g);
    pasangGeser(g);
    try {
      localStorage.setItem(KUNCI_GESER, JSON.stringify(g));
    } catch {
      /* tetap berlaku sampai halaman ditutup */
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[14px] border bg-card p-4 text-sm print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-24 font-medium">Kertas</span>
        <PilihanChip label="Kertas" pilihan={KERTAS} nilai={kertas} onPilih={(v) => ganti("kertas", v)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-24 font-medium">Tanda tangan</span>
        <PilihanChip label="Tanda tangan" pilihan={TTD} nilai={ttd} onPilih={(v) => ganti("ttd", v)} />
      </div>

      {kertas === "blanko" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-24 font-medium">Geser isian</span>
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="outline" aria-label="Geser ke kiri 1 mm" onClick={() => ubahGeser(-1, 0)}>
              <ArrowLeft className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Geser ke kanan 1 mm" onClick={() => ubahGeser(1, 0)}>
              <ArrowRight className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Geser ke atas 1 mm" onClick={() => ubahGeser(0, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Geser ke bawah 1 mm" onClick={() => ubahGeser(0, 1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => ubahGeser(0, 0)}>
              <RotateCcw className="size-4" />
              Nol
            </Button>
          </div>
          <span className="text-muted-foreground tabular-nums">
            {geser.x === 0 && geser.y === 0
              ? "Belum digeser"
              : `${geser.x > 0 ? "kanan" : "kiri"} ${Math.abs(geser.x)} mm · ${geser.y > 0 ? "bawah" : "atas"} ${Math.abs(geser.y)} mm`}
          </span>
          <p className="basis-full text-muted-foreground">
            Masukkan blanko kwitansi Tiska seperti kertas A5 biasa. Kalau isian tidak tepat di garis, geser lalu cetak lagi — setelan ini diingat di komputer ini.
          </p>
        </div>
      ) : null}

      {kertas === "a4" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-24 font-medium">Bagian bawah</span>
          <div className="w-full max-w-md">
            <PilihCari nilai={bawah} pilihan={pilihanBawah} onPilih={(p) => ganti("bawah", p.id)} semuaSaatKosong placeholder="Cari nomor kwitansi atau nama pelanggan…" />
          </div>
          <p className="basis-full text-muted-foreground">Bawaannya kwitansi yang sama (untuk klien + arsip). Pilih kwitansi lain untuk mencetak dua kwitansi berbeda di satu kertas.</p>
        </div>
      ) : null}
    </div>
  );
}
