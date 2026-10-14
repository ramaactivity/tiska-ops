"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LABEL_STATUS_RESEP } from "@/lib/resep";

import { type KeadaanResep, ubahResep } from "../actions";

const awal: KeadaanResep = {};

export function FormResep({
  id,
  status,
  porsi,
  catatan,
}: {
  id: string;
  status: string;
  porsi: string | null;
  catatan: string | null;
}) {
  const [keadaan, kirim, sedang] = useActionState(ubahResep, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  const g = keadaan.galat ?? {};

  return (
    <form action={kirim} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={id} />
      {keadaan.pesan && !keadaan.sukses ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {keadaan.pesan}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label>Status resep</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {Object.entries(LABEL_STATUS_RESEP).map(([v, label]) => (
            <label
              key={v}
              className="flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:checked]:border-foreground/35 has-[:checked]:bg-accent has-[:checked]:font-medium"
            >
              <input type="radio" name="status" value={v} defaultChecked={status === v} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Standar = takaran sudah sesuai yang dimasak di dapur. Perkiraan = belum dipastikan.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Porsi per resep</Label>
        <Input
          name="portions_per_batch"
          inputMode="decimal"
          defaultValue={porsi ? Number(porsi).toLocaleString("id-ID") : ""}
          className="angka w-32 tabular-nums"
          placeholder="100"
          aria-invalid={Boolean(g.portions_per_batch)}
        />
        {g.portions_per_batch ? <p className="text-xs text-destructive">{g.portions_per_batch}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Catatan dapur</Label>
        <Textarea name="notes" rows={3} defaultValue={catatan ?? ""} placeholder="mis. dimasak di Dapur Masak, takaran cabai bisa dikurangi" />
      </div>

      <div>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : "Simpan resep"}
        </Button>
      </div>
    </form>
  );
}
