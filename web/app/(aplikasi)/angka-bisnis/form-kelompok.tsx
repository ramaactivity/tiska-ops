"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Satuan } from "@/lib/label-pengaturan";

import { type KeadaanAngka, kembalikanBawaan, simpanAngkaBisnis } from "./actions";

const awal: KeadaanAngka = {};

export function FormKelompok({
  kunci,
  isian,
  diubah,
}: {
  kunci: string;
  isian: { jalur: string; label: string; satuan: Satuan; nilai: number; bawaan: number }[];
  diubah: boolean;
}) {
  const [keadaan, kirim, sedang] = useActionState(simpanAngkaBisnis, awal);
  const [keadaanBalik, balik, sedangBalik] = useActionState(kembalikanBawaan, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  useEffect(() => {
    if (keadaanBalik.sukses) toast.success(keadaanBalik.pesan);
  }, [keadaanBalik]);

  return (
    <div className="flex flex-col gap-4">
      <form action={kirim} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="kunci" value={kunci} />
        {keadaan.pesan && !keadaan.sukses ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {isian.map((f) => (
            <div key={f.jalur} className="flex flex-col gap-1.5">
              <Label htmlFor={`${kunci}-${f.jalur}`}>{f.label}</Label>
              <div className="relative">
                {f.satuan === "Rp" ? (
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                ) : null}
                <Input
                  id={`${kunci}-${f.jalur}`}
                  name={`n:${f.jalur}`}
                  inputMode="decimal"
                  defaultValue={f.nilai.toLocaleString("id-ID")}
                  className={`angka tabular-nums ${f.satuan === "Rp" ? "pl-9" : "pr-12"}`}
                  aria-invalid={Boolean(keadaan.galat?.[f.jalur])}
                />
                {f.satuan !== "Rp" ? (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{f.satuan}</span>
                ) : null}
              </div>
              {keadaan.galat?.[f.jalur] ? (
                <p className="text-xs text-destructive">{keadaan.galat[f.jalur]}</p>
              ) : f.nilai !== f.bawaan ? (
                <p className="text-xs text-muted-foreground">
                  Bawaan: {f.satuan === "Rp" ? "Rp " : ""}
                  {f.bawaan.toLocaleString("id-ID")}
                  {f.satuan !== "Rp" ? ` ${f.satuan}` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={sedang} className="rounded-full px-5">
            {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {sedang ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
      {diubah ? (
        <form action={balik}>
          <input type="hidden" name="kunci" value={kunci} />
          <Button type="submit" variant="ghost" size="sm" disabled={sedangBalik} className="rounded-full text-muted-foreground">
            Kembalikan ke angka bawaan
          </Button>
        </form>
      ) : null}
    </div>
  );
}
