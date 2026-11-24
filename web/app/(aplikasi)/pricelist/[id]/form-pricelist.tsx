"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { type KeadaanPricelist, ubahPricelist } from "../actions";

const awal: KeadaanPricelist = {};

export function FormPricelist({ p }: { p: { id: string; name: string; status: string; notes: string | null; canva: string | null } }) {
  const [keadaan, kirim, sedang] = useActionState(ubahPricelist, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  return (
    <form action={kirim} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={p.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nama-pl">Nama</Label>
        <Input id="nama-pl" name="name" defaultValue={p.name} aria-invalid={Boolean(keadaan.galat?.name)} />
        {keadaan.galat?.name ? <p className="text-xs text-destructive">{keadaan.galat.name}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {[
            ["aktif", "Aktif — bisa dikirim"],
            ["arsip", "Arsip — link klien dimatikan"],
          ].map(([v, label]) => (
            <label
              key={v}
              className="flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:checked]:border-foreground/35 has-[:checked]:bg-accent has-[:checked]:font-medium"
            >
              <input type="radio" name="status" value={v} defaultChecked={p.status === v} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="canva-pl">Link desain Canva</Label>
        <Input
          id="canva-pl"
          name="canva_url"
          type="url"
          inputMode="url"
          defaultValue={p.canva ?? ""}
          placeholder="https://www.canva.com/design/…"
          aria-invalid={Boolean(keadaan.galat?.canva_url)}
        />
        {keadaan.galat?.canva_url ? (
          <p className="text-xs text-destructive">{keadaan.galat.canva_url}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Untuk tim yang mengedit desainnya. Tidak ikut terkirim ke klien.</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catatan-pl">Catatan untuk tim</Label>
        <Textarea id="catatan-pl" name="notes" rows={2} defaultValue={p.notes ?? ""} />
      </div>
      <div>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
