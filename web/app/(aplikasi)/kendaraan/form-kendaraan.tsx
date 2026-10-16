"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type KeadaanKendaraan, simpanKendaraan } from "./actions";

export function FormKendaraan({ k }: { k?: { id: string; name: string; plate: string; capacity_note: string; active: boolean } }) {
  const [keadaan, kirim, sedang] = useActionState<KeadaanKendaraan, FormData>(simpanKendaraan, {});
  const [aktif, setAktif] = useState(k ? (k.active ? "on" : "off") : "on");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!keadaan.sukses) return;
    toast.success(keadaan.pesan);
    if (!k) form.current?.reset();
  }, [keadaan, k]);
  return (
    <form ref={form} action={kirim} className="flex flex-col gap-3">
      {k ? <input type="hidden" name="id" value={k.id} /> : null}
      {keadaan.pesan && !keadaan.sukses ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="name" defaultValue={k?.name} placeholder="Nama, mis. Luxio" aria-label="Nama kendaraan" />
        <Input name="plate" defaultValue={k?.plate} placeholder="Plat nomor" aria-label="Plat nomor" />
        <Input name="capacity_note" defaultValue={k?.capacity_note} placeholder="Muat, mis. 300 box" aria-label="Kapasitas" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PilihanChip kecil label="Status kendaraan" nama="active" nilai={aktif} onPilih={setAktif} pilihan={[{ nilai: "on", label: "Dipakai" }, { nilai: "off", label: "Tidak dipakai" }]} />
        <Button type="submit" size="sm" disabled={sedang} className="rounded-full">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {k ? "Simpan" : "Tambah kendaraan"}
        </Button>
      </div>
    </form>
  );
}
