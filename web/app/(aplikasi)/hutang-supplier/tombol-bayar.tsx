"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { bayarHutang } from "../po/actions";
import { FotoNota } from "../uang-muka/foto-nota";

/** Finance mencatat hutang lunas: tanggal bayar + bukti transfer (opsional). */
export function TombolBayar({ id, hariIni }: { id: string; hariIni: string }) {
  const [buka, setBuka] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [bukti, setBukti] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  if (!buka) {
    return (
      <Button size="sm" variant="outline" onClick={() => setBuka(true)}>
        Bayar
      </Button>
    );
  }
  return (
    <div className="flex basis-full flex-wrap items-end gap-2 rounded-[10px] bg-muted p-3">
      <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} className="w-48" aria-label="Tanggal bayar" />
      <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan, mis. transfer BCA" className="min-w-40 flex-1" aria-label="Catatan bayar" />
      <FotoNota jalur={bukti} onUbah={setBukti} maks={1} label="Bukti transfer" />
      <Button variant="ghost" onClick={() => setBuka(false)}>
        Batal
      </Button>
      <Button
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            try {
              await bayarHutang(id, { tanggal, bukti: bukti[0] ?? null, catatan });
              toast.success("Hutang ditandai lunas.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Gagal.");
            }
          })
        }
      >
        {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Tandai lunas
      </Button>
    </div>
  );
}
