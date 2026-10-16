"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Kepala kolom yang bisa diurutkan (D-062). Urutan ditulis ke alamat halaman
 * (?urut=nilai / ?urut=-nilai) dan dikerjakan database, sama seperti
 * pencarian. Klik pertama: menurun untuk angka/tanggal (yang terbesar/terbaru
 * dulu) — itu yang dicari orang; klik lagi membalik.
 */
export function ThUrut({
  kolom,
  children,
  className,
  kanan,
}: {
  kolom: string;
  children: React.ReactNode;
  className?: string;
  kanan?: boolean;
}) {
  const jalur = usePathname();
  const params = useSearchParams();
  const urut = params.get("urut") ?? "";
  const aktif = urut.replace(/^-/, "") === kolom;
  const turun = aktif && urut.startsWith("-");
  const baru = new URLSearchParams(params.toString());
  baru.set("urut", aktif && turun ? kolom : `-${kolom}`);
  const Ikon = !aktif ? ArrowUpDown : turun ? ArrowDown : ArrowUp;

  return (
    <th
      aria-sort={aktif ? (turun ? "descending" : "ascending") : undefined}
      className={cn("h-[50px] px-4 text-sm font-medium whitespace-nowrap", kanan ? "text-right" : "text-left", className)}
    >
      <Link
        href={`${jalur}?${baru.toString()}`}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground",
          aktif ? "text-primary" : "text-muted-foreground",
          kanan && "flex-row-reverse",
        )}
      >
        {children}
        <Ikon className={cn("size-3.5", aktif ? "text-primary" : "text-subtle-foreground")} strokeWidth={2} aria-hidden="true" />
      </Link>
    </th>
  );
}
