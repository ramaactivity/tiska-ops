"use client";

import { Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DialogPembatalan } from "@/components/dialog-pembatalan";
import { Button } from "@/components/ui/button";

import { batalkanBelanja } from "../../actions";

/** Finance membatalkan nota yang salah catat (wajib alasan) — saldo pemegang kembali. */
export function TombolBatalNota({ id, nomor }: { id: string; nomor: string }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setBuka(true)}>
        <Ban className="size-4" />
        Batalkan nota
      </Button>
      <DialogPembatalan
        terbuka={buka}
        onTerbukaChange={setBuka}
        judul={`Batalkan ${nomor}?`}
        keterangan="Nota tetap tersimpan sebagai dibatalkan, dan nilainya dikembalikan ke saldo uang muka pemegangnya."
        labelTombol="Batalkan nota"
        onBatalkan={async (alasan) => {
          await batalkanBelanja(id, alasan);
          toast.success(`${nomor} dibatalkan.`);
        }}
      />
    </>
  );
}
