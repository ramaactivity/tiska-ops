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
  return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">{children}</div>;
}

export function KepalaHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">{judul}</h1>
        {keterangan ? (
          <p className="mt-1 text-sm text-muted-foreground">{keterangan}</p>
        ) : null}
      </div>
      {aksi ? <div className="flex shrink-0 items-center gap-2">{aksi}</div> : null}
    </header>
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
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="overflow-x-auto">{children}</div>
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
      <p className="text-sm font-medium">{judul}</p>
      {keterangan ? (
        <p className="max-w-sm text-sm text-muted-foreground">{keterangan}</p>
      ) : null}
      {aksi ? <div className="mt-4">{aksi}</div> : null}
    </div>
  );
}

/** Baris ringkasan di bawah tabel: "12 pelanggan · 9 aktif". */
export function RingkasanTabel({ children }: { children: React.ReactNode }) {
  return <p className="pt-3 text-xs text-muted-foreground">{children}</p>;
}

/** Sel judul tabel — gaya sama dengan tabel di halaman daftar lain. */
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[0.6875rem] font-medium tracking-[0.06em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap",
        nada === "baik" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        nada === "perhatian" && "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        nada === "netral" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
