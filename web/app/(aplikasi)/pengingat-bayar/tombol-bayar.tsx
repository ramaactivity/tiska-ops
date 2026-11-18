"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsianRupiah } from "@/components/isian-rupiah";

import { FotoNota } from "../uang-muka/foto-nota";
import { bayarTagihan } from "./actions";

/** Catat periode yang jatuh tempo sudah dibayar: tanggal, nominal (terisi perkiraan), bukti transfer opsional. */
export function TombolBayar({ id, hariIni, nominal }: { id: string; hariIni: string; nominal: number | null }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [jumlah, setJumlah] = useState(nominal ? String(Math.round(nominal)) : "");
  const [bukti, setBukti] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  if (!buka) {
    return (
      <Button size="sm" className="rounded-full" onClick={() => setBuka(true)}>
        Sudah dibayar
      </Button>
    );
  }
  return (
    <div className="flex basis-full flex-wrap items-end gap-2 rounded-[10px] bg-muted p-3">
      <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} className="w-48" aria-label="Tanggal bayar" />
      <IsianRupiah
        value={jumlah}
        onChange={(t) => setJumlah(t.replace(/\D/g, "").slice(0, 13))}
        placeholder="Nominal dibayar"
        className="w-44 text-right font-mono"
        aria-label="Nominal dibayar"
      />
      <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={255} placeholder="Catatan, mis. kena denda Rp10.000" className="min-w-40 flex-1" aria-label="Catatan bayar" />
      <FotoNota jalur={bukti} onUbah={setBukti} maks={1} label="Bukti transfer" />
      <Button variant="ghost" onClick={() => setBuka(false)}>
        Batal
      </Button>
      <Button
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            const r = await bayarTagihan(id, { tanggal, nominal: jumlah, bukti: bukti[0] ?? null, catatan });
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
