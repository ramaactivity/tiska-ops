"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type KeadaanAkunBaru, simpanAkunBaru } from "./actions";

const awal: KeadaanAkunBaru = {};

export function FormAkunBaru({ username }: { username: string }) {
  const [keadaan, kirim, sedang] = useActionState(simpanAkunBaru, awal);
  const g = keadaan.galat ?? {};
  return (
    <form action={kirim} className="flex flex-col gap-4" noValidate>
      {keadaan.pesan ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {keadaan.pesan}
        </p>
      ) : null}
      <Bidang id="username" label="Username" galat={g.username} bantuan="Dipakai untuk masuk. Boleh tetap seperti ini.">
        <Input id="username" name="username" defaultValue={username} autoCapitalize="none" autoComplete="username" aria-invalid={Boolean(g.username)} />
      </Bidang>
      <Bidang id="sandi" label="Kata sandi baru" galat={g.sandi}>
        <Input id="sandi" name="sandi" type="password" autoComplete="new-password" autoFocus aria-invalid={Boolean(g.sandi)} />
      </Bidang>
      <Bidang id="ulang" label="Ulangi kata sandi baru" galat={g.ulang}>
        <Input id="ulang" name="ulang" type="password" autoComplete="new-password" aria-invalid={Boolean(g.ulang)} />
      </Bidang>
      <Button type="submit" disabled={sedang} className="mt-2 h-10 rounded-full">
        {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {sedang ? "Menyimpan…" : "Simpan & masuk"}
      </Button>
    </form>
  );
}

function Bidang({ id, label, galat, bantuan, children }: { id: string; label: string; galat?: string; bantuan?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {galat ? <p className="text-xs text-destructive">{galat}</p> : bantuan ? <p className="text-xs text-muted-foreground">{bantuan}</p> : null}
    </div>
  );
}
