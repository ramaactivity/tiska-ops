"use client";

import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";

import { AvatarOrang } from "@/components/avatar-orang";
import { PapanPin } from "@/components/papan-pin";
import { Button } from "@/components/ui/button";
import type { PilihanAvatar } from "@/lib/avatar";

import { aksiMasukPin } from "./actions";

type Akun = { id: string; nama: string; avatar: PilihanAvatar };

/** Masuk HP tim (D-101): pilih wajah → tekan PIN. Form nama user & sandi tetap tersedia. */
export function MasukWajah({ akun, formBiasa }: { akun: Akun[]; formBiasa: ReactNode }) {
  const [dipilih, setDipilih] = useState<Akun | null>(akun.length === 1 ? akun[0] : null);
  const [biasa, setBiasa] = useState(false);
  const [pin, setPin] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();

  if (biasa) return formBiasa;

  const masuk = () =>
    mulai(async () => {
      const h = await aksiMasukPin(dipilih!.id, pin);
      setPesan(h.pesan);
      setPin("");
    });

  return (
    <div className="flex flex-col gap-6">
      {pesan ? (
        <p role="alert" className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>{pesan}</span>
        </p>
      ) : null}
      {dipilih ? (
        <div className="flex flex-col items-center gap-5">
          <button type="button" className="flex flex-col items-center gap-2" onClick={() => akun.length > 1 && (setDipilih(null), setPin(""), setPesan(null))}>
            <AvatarOrang pilihan={dipilih.avatar} nama={dipilih.nama} className="size-20" />
            <span className="text-lg font-semibold">{dipilih.nama}</span>
          </button>
          <p className="text-base">Tekan PIN kamu</p>
          <PapanPin nilai={pin} ubah={setPin} nonaktif={menunggu} />
          <Button className="h-14 w-full max-w-[18rem] rounded-full text-lg" disabled={pin.length < 4 || menunggu} onClick={masuk}>
            {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            Masuk
          </Button>
          {akun.length > 1 ? (
            <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground" onClick={() => (setDipilih(null), setPin(""), setPesan(null))}>
              <ArrowLeft className="size-4" /> Bukan saya
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold">Pilih wajahmu</p>
          <div className="grid grid-cols-2 gap-3">
            {akun.map((a) => (
              <button key={a.id} type="button" className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm active:bg-muted" onClick={() => setDipilih(a)}>
                <AvatarOrang pilihan={a.avatar} nama={a.nama} className="size-16" />
                <span className="text-center text-base font-medium">{a.nama}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="min-h-11 text-sm text-muted-foreground underline underline-offset-4" onClick={() => setBiasa(true)}>
        Masuk pakai nama user & sandi
      </button>
    </div>
  );
}
