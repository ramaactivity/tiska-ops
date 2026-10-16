"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Penyaring status berbentuk deretan tab.
 *
 * Pilihannya ditulis ke alamat halaman seperti kotak pencarian, sehingga
 * "semua tagihan jatuh tempo" adalah tautan yang bisa dikirim ke orang lain.
 */
export function SaringStatus({
  pilihan,
  parameter = "status",
}: {
  pilihan: { nilai: string; label: string; jumlah?: number }[];
  parameter?: string;
}) {
  const router = useRouter();
  const jalur = usePathname();
  const params = useSearchParams();
  const aktif = params.get(parameter) ?? "";

  function pilih(nilai: string) {
    const baru = new URLSearchParams(params.toString());
    if (nilai) baru.set(parameter, nilai);
    else baru.delete(parameter);
    router.replace(`${jalur}?${baru.toString()}`, { scroll: false });
  }

  // Tab bergaris bawah (D-059): aktif = teks & garis 2px indigo.
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 [scrollbar-width:none]" role="tablist">
      {pilihan.map((p) => {
        const terpilih = aktif === p.nilai;
        return (
          <button
            key={p.nilai || "semua"}
            type="button"
            role="tab"
            onClick={() => pilih(p.nilai)}
            aria-selected={terpilih}
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3.5 text-[0.9375rem] whitespace-nowrap transition-colors",
              terpilih
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
            {typeof p.jumlah === "number" ? <span className="font-mono text-xs text-subtle-foreground">{p.jumlah}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
