"use client";

import { LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FotoNota } from "../uang-muka/foto-nota";
import { batalBayarPartnerFee, bayarPartnerFee } from "./actions";

/** Catat Partner Fee dibayar (Finance/owner): tanggal, bukti transfer, catatan. Nominal dihitung server. */
export function TombolBayarFee({ idInvoice, hariIni, jumlah }: { idInvoice: string; hariIni: string; jumlah: string }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [bukti, setBukti] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  if (!buka)
    return (
      <Button size="sm" className="rounded-full" onClick={() => setBuka(true)}>
        Bayar {jumlah}
      </Button>
    );
  return (
    <div className="flex basis-full flex-wrap items-end gap-2 rounded-[10px] bg-muted p-3">
      <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} className="w-48" aria-label="Tanggal bayar" />
      <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={255} placeholder="Catatan, mis. transfer BCA" className="min-w-40 flex-1" aria-label="Catatan bayar" />
      <FotoNota jalur={bukti} onUbah={setBukti} maks={1} label="Bukti transfer" />
      <Button variant="ghost" onClick={() => setBuka(false)}>
        Batal
      </Button>
      <Button
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            const r = await bayarPartnerFee(idInvoice, { tanggal, bukti: bukti[0] ?? null, catatan });
            if (!r.ok) return void toast.error(r.pesan);
            toast.success(r.pesan);
            setBuka(false);
            router.refresh();
          })
        }
      >
        {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Simpan bayar
      </Button>
    </div>
  );
}

export function TombolBatalFee({ idInvoice }: { idInvoice: string }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="rounded-full"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          const r = await batalBayarPartnerFee(idInvoice);
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
