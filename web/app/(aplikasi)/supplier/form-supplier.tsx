"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type KeadaanSupplier, simpanSupplier } from "../po/actions";

export type IsiSupplier = {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  payment_term_days: number;
  bank_account: string;
  notes: string;
  active: boolean;
};

/** Master supplier (D-083) — tempo bayar menentukan jatuh tempo hutang tiap penerimaan. */
export function FormSupplier({ s }: { s?: IsiSupplier }) {
  const [keadaan, kirim, sedang] = useActionState<KeadaanSupplier, FormData>(simpanSupplier, {});
  const [aktif, setAktif] = useState(s ? (s.active ? "on" : "off") : "on");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!keadaan.sukses) return;
    toast.success(keadaan.pesan);
    if (!s) form.current?.reset();
  }, [keadaan, s]);
  return (
    <form ref={form} action={kirim} className="flex flex-col gap-3">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      {keadaan.pesan && !keadaan.sukses ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input name="name" defaultValue={s?.name} placeholder="Nama supplier" aria-label="Nama supplier" />
        <Input name="category" defaultValue={s?.category} placeholder="Kategori, mis. Daging, Sayur" aria-label="Kategori" />
        <Input name="contact_name" defaultValue={s?.contact_name} placeholder="Nama kontak" aria-label="Nama kontak" />
        <Input name="phone" defaultValue={s?.phone} placeholder="No. WA" inputMode="tel" aria-label="Nomor WA" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr]">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Tempo
          <Input name="payment_term_days" defaultValue={s?.payment_term_days ?? 0} inputMode="numeric" className="w-16 text-right font-mono" aria-label="Tempo bayar (hari)" />
          hari
        </label>
        <Input name="bank_account" defaultValue={s?.bank_account} placeholder="Rekening, mis. BCA 123 a.n. …" aria-label="Rekening" />
        <Input name="notes" defaultValue={s?.notes} placeholder="Catatan" aria-label="Catatan supplier" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PilihanChip kecil label="Status supplier" nama="active" nilai={aktif} onPilih={setAktif} pilihan={[{ nilai: "on", label: "Aktif" }, { nilai: "off", label: "Nonaktif" }]} />
        <Button type="submit" size="sm" disabled={sedang} className="rounded-full">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {s ? "Simpan" : "Tambah supplier"}
        </Button>
      </div>
    </form>
  );
}
