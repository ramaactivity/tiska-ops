import { Check, TriangleAlert } from "lucide-react";

import type { Progres } from "@/lib/hitung/progres-event";
import { cn } from "@/lib/utils";

/** Bilah progres ringkas untuk daftar Pesanan & Event (D-171). */
export function BilahProgres({ progres }: { progres: Progres }) {
  const { langkah, peringatan } = progres;
  if (!langkah.length) return null;
  const sudah = langkah.filter((l) => l.selesai).length;
  const berikutnya = langkah.find((l) => !l.selesai);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {langkah.map((l) => (
            <span key={l.kunci} className={cn("h-1.5 flex-1 rounded-full", l.selesai ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {sudah}/{langkah.length}
          </span>
          {berikutnya ? ` · berikutnya: ${berikutnya.label}` : " · beres"}
        </span>
      </div>
      {peringatan.map((p) => (
        <p key={p} className="flex items-center gap-1.5 text-xs font-medium text-perhatian">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {p}
        </p>
      ))}
    </div>
  );
}

/** Garis langkah di detail event: selesai = centang, berikutnya = disorot, satu kalimat "langkah berikutnya". */
export function LangkahProgres({ progres }: { progres: Progres }) {
  const { langkah, peringatan } = progres;
  if (!langkah.length) return null;
  const sudah = langkah.filter((l) => l.selesai).length;
  const berikutnya = langkah.find((l) => !l.selesai);
  return (
    <section className="rounded-[20px] border bg-card px-5 py-6 shadow-[0_1px_2px_rgb(31_42_92/0.04),0_8px_24px_-12px_rgb(31_42_92/0.10)] sm:px-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-[1.0625rem] text-foreground">
          {berikutnya ? (
            <>
              Langkah berikutnya: <span className="font-semibold text-primary-strong">{berikutnya.label}</span>
            </>
          ) : (
            <span className="font-semibold text-lunas">Semua langkah beres</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{sudah}</span> dari <span className="font-mono tabular-nums">{langkah.length}</span> selesai
        </p>
      </div>
      <div className="mt-6">
        {/* HP: 3 per baris tanpa garis penghubung; layar lebar: satu garis langkah. */}
        <ol className="grid grid-cols-3 gap-y-6 sm:flex">
          {langkah.map((l, i) => {
            const ini = l.kunci === berikutnya?.kunci;
            const akhir = i === langkah.length - 1;
            return (
              <li key={l.kunci} className="relative flex min-w-0 flex-col items-center text-center sm:flex-1">
                {akhir ? null : (
                  <span aria-hidden="true" className={cn("absolute top-4 left-1/2 hidden h-0.5 w-full sm:block", l.selesai && langkah[i + 1].selesai ? "bg-primary" : "bg-border")} />
                )}
                <span
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums transition-colors duration-700",
                    l.selesai ? "bg-primary text-primary-foreground" : ini ? "bg-card text-primary ring-2 ring-primary ring-offset-4 ring-offset-card" : "border bg-card text-subtle-foreground",
                  )}
                >
                  {l.selesai ? <Check className="size-4" strokeWidth={2.5} aria-label="selesai" /> : i + 1}
                </span>
                <span className={cn("mt-3 px-1 text-sm leading-snug", l.selesai ? "text-foreground" : ini ? "font-semibold text-primary-strong" : "text-muted-foreground")}>{l.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {peringatan.length ? (
        <ul className="mt-6 flex flex-col gap-1.5 border-t pt-4 text-[0.9375rem] text-perhatian">
          {peringatan.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
