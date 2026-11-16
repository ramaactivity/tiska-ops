import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Kerangka satu halaman daftar.
 *
 * Sengaja dibuat sekali di sini dan dipakai ulang oleh semua modul, supaya
 * jarak, ukuran judul, dan letak tombol tidak bergeser sedikit pun antar
 * halaman. Pergeseran kecil semacam itu yang membuat aplikasi terasa
 * dirakit, bukan dirancang.
 */

export function Halaman({ children }: { children: React.ReactNode }) {
  // Tanpa batas lebar: menciutkan sidebar memang untuk mendapat halaman yang lebih luas.
  return <div className="w-full px-4 py-6 sm:px-8 sm:py-8 xl:px-10">{children}</div>;
}

/** Judul halaman (D-059): ikon 30px + judul 30/700 + badge jumlah, deskripsi satu kalimat, aksi di kanan. */
export function KepalaHalaman({
  judul,
  keterangan,
  aksi,
  ikon: Ikon,
  jumlah,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
  ikon?: LucideIcon;
  jumlah?: number;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 pb-6 sm:pb-8">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Ikon ? <Ikon className="size-6 shrink-0 text-primary-strong sm:size-[30px]" strokeWidth={1.75} aria-hidden="true" /> : null}
          <h1 className="text-[1.375rem] font-bold tracking-[-0.02em] text-primary-strong sm:text-[1.875rem]">{judul}</h1>
          {jumlah !== undefined ? (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-sm font-semibold text-foreground">{jumlah}</span>
          ) : null}
        </div>
        {keterangan ? <p className="mt-1 max-w-[760px] text-sm text-muted-foreground sm:mt-1.5 sm:text-[0.9375rem]">{keterangan}</p> : null}
      </div>
      {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
    </header>
  );
}

/** Strip ringkasan (D-059): pita biru muda 52px berisi pasangan "Label **angka**". */
export function StripRingkasan({
  judul,
  ikon: Ikon,
  isi,
}: {
  judul: string;
  ikon?: LucideIcon;
  isi: [string, React.ReactNode][];
}) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl border border-info-garis bg-info-halus px-5 py-3 text-[0.9375rem]">
      <span className="flex items-center gap-2 font-semibold text-primary-strong">
        {Ikon ? <Ikon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /> : null}
        {judul}
      </span>
      {isi.map(([label, nilai]) => (
        <span key={label} className="text-muted-foreground">
          {label} <b className="font-mono font-semibold text-foreground">{nilai}</b>
        </span>
      ))}
    </div>
  );
}

/** Bingkai tabel: satu garis tepi, sudut membulat, isi bisa digeser mendatar. */
export function BingkaiTabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden kartu", className)}>
      {/* relative: elemen absolut di dalam tabel (sr-only) ikut terpotong
          wadah geser — tanpa ini ia melebarkan seluruh halaman di HP. */}
      <div className="relative overflow-x-auto">{children}</div>
    </div>
  );
}

export function KeadaanKosong({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
      <p className="text-[0.9375rem] font-medium">{judul}</p>
      {keterangan ? (
        <p className="max-w-sm text-sm text-muted-foreground">{keterangan}</p>
      ) : null}
      {aksi ? <div className="mt-4">{aksi}</div> : null}
    </div>
  );
}

/** Baris ringkasan di bawah tabel: "12 pelanggan · 9 aktif". */
export function RingkasanTabel({ children }: { children: React.ReactNode }) {
  return <p className="pt-3 text-sm text-muted-foreground">{children}</p>;
}

/** Sel judul tabel — gaya sama dengan tabel di halaman daftar lain. */
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "h-[50px] px-4 text-left text-sm font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3.5 align-middle text-[0.9375rem]", className)}>
      {children}
    </td>
  );
}

/** Pill status kecil; warna hanya untuk keadaan yang perlu perhatian. */
export function Pil({
  children,
  nada = "netral",
}: {
  children: React.ReactNode;
  nada?: "netral" | "baik" | "perhatian";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        nada === "baik" && "bg-lunas-halus text-lunas",
        nada === "perhatian" && "bg-perhatian-halus text-perhatian",
        nada === "netral" && "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Satu bagian form (D-063, D-068): kartu putih, nomor langkah + judul tebal +
 * satu kalimat penjelasan di atas, isian di bawahnya selebar kartu. Judul
 * tidak lagi di kolom kiri berhuruf kapital kecil: sulit dibaca dan memotong
 * isian (keluhan Rama 16 Okt 2026).
 */
export function BagianForm({
  judul,
  keterangan,
  nomor,
  children,
}: {
  judul: string;
  keterangan?: string;
  /** Nomor langkah (form bertahap). */
  nomor?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 kartu px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start gap-3">
        {nomor ? (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">
            {nomor}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-primary-strong">{judul}</h2>
          {keterangan ? <p className="mt-0.5 max-w-[68ch] text-[0.9375rem] leading-relaxed text-muted-foreground">{keterangan}</p> : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  );
}
