"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { type KeadaanSyarat, simpanBagianSyarat } from "./actions";

const awal: KeadaanSyarat = {};

export function FormBagian({ id, judul, isi, aktif }: { id: string; judul: string; isi: string; aktif: boolean }) {
  const [keadaan, kirim, sedang] = useActionState(simpanBagianSyarat, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  return (
    <form action={kirim} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      {keadaan.pesan && !keadaan.sukses ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`judul-${id}`}>Judul bagian</Label>
        <Input id={`judul-${id}`} name="judul" defaultValue={judul} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`isi-${id}`}>Isi (satu poin per baris)</Label>
        <Textarea id={`isi-${id}`} name="isi" defaultValue={isi} rows={Math.min(18, isi.split("\n").length + 2)} className="text-sm" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox name="aktif" defaultChecked={aktif} />
          Dipakai saat merakit S&amp;K
        </label>
        <Button type="submit" size="sm" disabled={sedang} className="rounded-full">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Simpan bagian
        </Button>
      </div>
    </form>
  );
}
