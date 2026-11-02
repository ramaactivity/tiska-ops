"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { hapusTagihan, hentikanTagihan } from "../actions";

/** Hentikan (wifi diputus, sewa selesai) — riwayat tetap ada. Hapus hanya tagihan salah input yang belum pernah dibayar. */
export function AksiTagihan({ id, status, bolehHapus }: { id: string; status: string; bolehHapus: boolean }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [hapus, setHapus] = useState(false);
  const jalan = (kerja: () => Promise<{ ok: boolean; pesan: string }>, sesudah?: () => void) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      if (sesudah) sesudah();
      else router.refresh();
    });
  return (
    <>
      {status === "aktif" ? (
        <Button variant="outline" className="justify-start rounded-full bg-card" disabled={menunggu} onClick={() => jalan(() => hentikanTagihan(id, true))}>
          <Pause className="size-4" />
          Hentikan (tidak diingatkan lagi)
        </Button>
      ) : status === "berhenti" ? (
        <Button variant="outline" className="justify-start rounded-full bg-card" disabled={menunggu} onClick={() => jalan(() => hentikanTagihan(id, false))}>
          <Play className="size-4" />
          Aktifkan lagi
        </Button>
      ) : null}
      {bolehHapus ? (
        <Button variant="ghost" className="justify-start rounded-full text-destructive" onClick={() => setHapus(true)}>
          <Trash2 className="size-4" />
          Hapus (salah input)
        </Button>
      ) : null}
      <Dialog open={hapus} onOpenChange={setHapus}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus tagihan ini?</DialogTitle>
            <DialogDescription>Hanya untuk tagihan yang salah input. Tagihan yang sudah tidak dipakai sebaiknya dihentikan saja.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setHapus(false)}>
              Batal
            </Button>
            <Button variant="destructive" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => hapusTagihan(id), () => router.push("/pengingat-bayar"))}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
