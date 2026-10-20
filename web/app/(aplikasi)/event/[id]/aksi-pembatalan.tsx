"use client";

import { LoaderCircle, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { selesaikanRefund, urungkanPembatalan } from "../actions";

/** Finance (D-102): refund ditransfer ke klien, atau dijadikan deposit pesanan lain. */
export function AksiRefund({ id, nominal }: { id: string; nominal: number }) {
  const [cara, setCara] = useState("ditransfer");
  const [tanggal, setTanggal] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()));
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4">
      <PilihanChip
        label="Refund"
        nilai={cara}
        onPilih={setCara}
        pilihan={[
          { nilai: "ditransfer", label: `Sudah ditransfer Rp ${nominal.toLocaleString("id-ID")}` },
          { nilai: "deposit", label: "Jadi deposit pesanan lain" },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Tanggal</Label>
          <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} aria-label="Tanggal refund" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="catatan-refund">Catatan</Label>
          <Input id="catatan-refund" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={cara === "ditransfer" ? "mis. BCA a.n. Budi" : "mis. untuk arisan Des"} />
        </div>
      </div>
      <Button
        className="w-fit rounded-full"
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            try {
              await selesaikanRefund(id, cara, tanggal, catatan);
              toast.success("Refund ditutup.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Gagal.");
            }
          })
        }
      >
        {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        Simpan
      </Button>
    </div>
  );
}

export function TombolUrungkan({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      variant="outline"
      className="rounded-full bg-card"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          try {
            await urungkanPembatalan(id);
            toast.success("Pembatalan diurungkan.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal.");
          }
        })
      }
    >
      {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Undo2 className="size-4" />}
      Urungkan pembatalan
    </Button>
  );
}
