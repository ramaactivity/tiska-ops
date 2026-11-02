"use client";

import { Gift, LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { batalPakaiHadiah, pakaiHadiah } from "./actions";

/** "Pakai hadiah" (D-131): di daftar kartu (tanpa pesanan) atau di baris pesanan program (hadiah ditulis di catatan pesanan). */
export function TombolPakaiHadiah({ kunci, hadiah, nama, idPesanan }: { kunci: string; hadiah: string; nama: string; idPesanan?: string }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  return (
    <>
      <Button type="button" size="sm" className="rounded-full" onClick={() => setBuka(true)}>
        <Gift className="size-3.5" />
        {idPesanan ? "Pakai hadiah di pesanan ini" : "Tandai dipakai"}
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pakai hadiah {nama}?</DialogTitle>
            <DialogDescription>
              <b>{hadiah}</b>.{" "}
              {idPesanan ? "Hadiah ditulis di catatan pesanan ini supaya dapur & pengantar tahu." : "Untuk hadiah yang diberikan di luar pesanan Ikut Menu Pesta."} Kartu stempelnya sudah mulai dari nol sejak hadiah didapat.
            </DialogDescription>
          </DialogHeader>
          <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={300} placeholder="Catatan (opsional), mis. diambil sendiri / diganti menu lain" />
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button
              className="rounded-full"
              disabled={menunggu}
              onClick={() =>
                mulai(async () => {
                  const r = await pakaiHadiah(kunci, idPesanan ?? null, catatan);
                  if (!r.ok) return void toast.error(r.pesan);
                  toast.success(r.pesan);
                  setBuka(false);
                  router.refresh();
                })
              }
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Gift className="size-4" />}
              Pakai hadiah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TombolBatalPakai({ kunci }: { kunci: string }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="rounded-full"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          const r = await batalPakaiHadiah(kunci);
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
          router.refresh();
        })
      }
    >
      <Undo2 className="size-3.5" />
      Batalkan
    </Button>
  );
}
