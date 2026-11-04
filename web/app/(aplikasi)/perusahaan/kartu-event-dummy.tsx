"use client";

import { CalendarClock, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BarisDummy } from "@/lib/event-dummy";
import { labelTanggal } from "@/lib/kalender";

import { geserDummy } from "./data-tes-actions";

export function KartuEventDummy({ baris }: { baris: BarisDummy[] }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const ada = baris.filter((b) => b.idEvent);
  const perluGeser = ada.some((b) => b.tanggal !== b.target);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2.5">
        {baris.map((b) => (
          <li key={b.kode} className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{b.label}</p>
            {b.idEvent ? (
              <>
                <Link href={`/event/${b.idEvent}`} className="mt-1 block font-medium text-primary hover:underline">
                  {b.customer}
                </Link>
                <p className={`text-sm tabular-nums ${b.tanggal === b.target ? "text-muted-foreground" : "font-medium text-amber-700 dark:text-amber-400"}`}>
                  {b.tanggal ? labelTanggal(b.tanggal) : "tanpa tanggal"}
                  {b.tanggal !== b.target && ` → ${labelTanggal(b.target)}`}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Belum ada ({b.kode})</p>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="rounded-full"
          disabled={menunggu || !perluGeser}
          onClick={() =>
            mulai(async () => {
              try {
                const h = await geserDummy();
                toast.success(h.pesan);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Gagal memindah tanggal. Tidak ada data yang berubah.");
              }
            })
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
          {menunggu ? "Memindah…" : "Pindah ke kemarin, hari ini, besok, lusa"}
        </Button>
        {!perluGeser && ada.length > 0 && <span className="text-sm text-muted-foreground">Tanggalnya sudah sesuai hari ini.</span>}
      </div>
    </div>
  );
}
