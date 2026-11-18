"use client";

import { Printer, X } from "lucide-react";
import Link from "next/link";
import { createContext, use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { rupiah } from "@/lib/uang";

/* ==========================================================================
   PILIH BEBERAPA PAYMENT (D-196) — centang di tiap baris, lalu bilah di bawah
   layar: jumlah terpilih, totalnya (cocokkan dengan mutasi bank), dan cetak
   kwitansi — satu, atau dua sekaligus di satu lembar A4 (permintaan atasan
   12 Nov; halaman kwitansi sudah bisa memilih kwitansi bawah lewat ?bawah=).
   ========================================================================== */

type Terpilih = { id: string; nomor: string; jumlah: number };
type Isi = { pilihan: Terpilih[]; atur: (p: Terpilih, ya: boolean) => void; kosongkan: () => void };

const Konteks = createContext<Isi | null>(null);

export function PilihPayment({ children }: { children: React.ReactNode }) {
  const [pilihan, setPilihan] = useState<Terpilih[]>([]);
  const atur = (p: Terpilih, ya: boolean) => setPilihan((l) => (ya ? [...l.filter((x) => x.id !== p.id), p] : l.filter((x) => x.id !== p.id)));
  return (
    <Konteks value={{ pilihan, atur, kosongkan: () => setPilihan([]) }}>
      {children}
      <BilahPilihan />
    </Konteks>
  );
}

export function CentangPayment(p: Terpilih) {
  const k = use(Konteks)!;
  return (
    <Checkbox
      checked={k.pilihan.some((x) => x.id === p.id)}
      onCheckedChange={(v) => k.atur(p, v === true)}
      aria-label={`Pilih ${p.nomor}`}
    />
  );
}

function BilahPilihan() {
  const { pilihan, kosongkan } = use(Konteks)!;
  if (!pilihan.length) return null;
  const [a, b] = pilihan;
  const total = pilihan.reduce((j, p) => j + p.jumlah, 0);
  const cetak =
    pilihan.length === 1
      ? { href: `/pembayaran/${a.id}/kwitansi`, label: "Cetak kwitansi" }
      : pilihan.length === 2
        ? { href: `/pembayaran/${a.id}/kwitansi?kertas=a4&bawah=${b.id}`, label: "Cetak 2 kwitansi di 1 A4" }
        : null;

  return (
    <>
      {/* Ruang di dasar halaman supaya baris & ringkasan terakhir tidak tertutup bilah. */}
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden" role="region" aria-label="Payment terpilih">
        <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] border bg-card py-2 pr-2 pl-5 shadow-[0_1px_2px_rgb(31_42_92/0.08),0_16px_40px_-12px_rgb(31_42_92/0.35)] duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
          <p className="text-[0.9375rem] whitespace-nowrap">
            <b className="font-semibold">{pilihan.length} dipilih</b>
            <span className="text-muted-foreground"> · total </span>
            <span className="font-mono font-semibold tabular-nums">{rupiah(total)}</span>
          </p>
          {cetak ? (
            <Button render={<Link href={cetak.href} target="_blank" />} className="h-10 rounded-full">
              <Printer className="size-4" />
              {cetak.label}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Pilih 2 untuk dicetak berdua di 1 lembar A4</span>
          )}
          <Button variant="ghost" size="icon" className="size-10 rounded-full" onClick={kosongkan} aria-label="Batalkan pilihan">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
