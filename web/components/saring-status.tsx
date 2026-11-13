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
  gaya = "pil",
}: {
  pilihan: { nilai: string; label: string; jumlah?: number; ikon?: React.ReactNode }[];
  parameter?: string;
  /** "pil" (bawaan, D-172) = deretan pil lembut; "garis" = tab bergaris bawah. */
  gaya?: "garis" | "pil";
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

  if (gaya === "pil")
    return (
      // Turun baris di layar sempit (bukan digeser ke samping): semua tab tetap terlihat.
      <div className="max-w-full">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[22px] bg-muted/70 p-1" role="tablist">
          {pilihan.map((p) => {
            const terpilih = aktif === p.nilai;
            return (
              <button
                key={p.nilai || "__semua"}
                type="button"
                role="tab"
                onClick={() => pilih(p.nilai)}
                aria-selected={terpilih}
                className={cn(
                  "flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.9375rem] whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  terpilih
                    ? "bg-card font-semibold text-primary-strong shadow-[0_1px_2px_rgb(31_42_92/0.08),0_4px_12px_-4px_rgb(31_42_92/0.12)]"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                {p.ikon}
                {p.label}
                {typeof p.jumlah === "number" ? (
                  <span className={cn("rounded-full px-1.5 font-mono text-xs tabular-nums", terpilih ? "bg-primary/10 text-primary" : "text-subtle-foreground")}>{p.jumlah}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );

  // Tab bergaris bawah (D-059): aktif = teks & garis 2px indigo.
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 [scrollbar-width:none]" role="tablist">
      {pilihan.map((p) => {
        const terpilih = aktif === p.nilai;
        return (
          <button
            key={p.nilai || "__semua"}
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
