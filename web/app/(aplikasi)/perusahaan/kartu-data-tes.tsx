"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RingkasanDataTes } from "@/lib/data-tes";

import { hapusDataTes } from "./data-tes-actions";

export function KartuDataTes({ r }: { r: RingkasanDataTes }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const kosong = r.customer.length === 0;
  const rincian = `${r.quotation} quotation · ${r.invoice} invoice · ${r.payment} payment · ${r.event} event`;

  return (
    <div className="flex flex-col gap-4">
      {kosong ? (
        <p className="text-[0.9375rem] text-muted-foreground">Tidak ada data tes. Aplikasi bersih.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {r.customer.map((c) => (
              <span key={c.id} className="rounded-full border bg-muted/50 px-3 py-1 text-sm">
                {c.nama}
              </span>
            ))}
          </div>
          <p className="text-[0.9375rem]">
            <b className="font-semibold">{r.customer.length} customer tes</b> · {rincian}
          </p>
        </>
      )}
      <div>
        <Button type="button" variant="destructive" className="rounded-full" disabled={kosong} onClick={() => setBuka(true)}>
          <Trash2 className="size-4" />
          Hapus semua data tes
        </Button>
      </div>

      <Dialog open={buka} onOpenChange={(v) => !menunggu && setBuka(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus semua data tes?</DialogTitle>
            <DialogDescription>
              {r.customer.length} customer tes beserta {rincian} akan dihapus permanen, termasuk foto & bukti transfernya. Data customer asli tidak
              tersentuh. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={menunggu}
              onClick={() =>
                mulai(async () => {
                  try {
                    const h = await hapusDataTes();
                    toast.success(h.pesan);
                    setBuka(false);
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Gagal menghapus. Tidak ada data yang berubah.");
                  }
                })
              }
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {menunggu ? "Menghapus…" : "Ya, hapus semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
