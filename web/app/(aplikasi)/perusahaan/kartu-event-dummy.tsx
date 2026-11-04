"use client";

import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BarisDummy } from "@/lib/event-dummy";
import { labelTanggal } from "@/lib/kalender";

import { resetDummy, simpanAwalDummy } from "./data-tes-actions";

export function KartuEventDummy({ baris, titikAwal }: { baris: BarisDummy[]; titikAwal: string | null }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const jalankan = (aksi: () => Promise<{ pesan: string }>) =>
    mulai(async () => {
      try {
        const h = await aksi();
        toast.success(h.pesan);
        setBuka(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal. Tidak ada data yang berubah.");
      }
    });

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

      {titikAwal ? (
        <div>
          <Button type="button" className="rounded-full" disabled={menunggu} onClick={() => setBuka(true)}>
            <RotateCcw className="size-4" />
            Reset ke awal &amp; pindah ke hari ini
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">Belum ada titik awal. Simpan keadaan sekarang dulu sebagai titik awal reset.</p>
          <Button type="button" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => jalankan(simpanAwalDummy)}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Simpan sebagai titik awal
          </Button>
        </div>
      )}

      <Dialog open={buka} onOpenChange={(v) => !menunggu && setBuka(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset event dummy ke awal?</DialogTitle>
            <DialogDescription>
              Semua yang diubah saat tes pada 4 order dummy dibuang — status, kloter, tim, payment tambahan, revisi, catatan. Order kembali seperti
              semula (kemarin &amp; hari ini lunas, besok DP 50%, lusa belum bayar) lalu pindah ke kemarin, hari ini, besok, lusa. Data lain tidak tersentuh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button type="button" className="rounded-full" disabled={menunggu} onClick={() => jalankan(resetDummy)}>
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {menunggu ? "Mereset…" : "Ya, reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
