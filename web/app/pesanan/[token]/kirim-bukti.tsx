"use client";

import { Camera, CircleCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { kecilkanFoto } from "@/lib/foto";

import { kirimBuktiTransfer } from "./actions";

/** Foto / screenshot bukti transfer — dikecilkan di HP dulu (lib/foto), lalu dikirim. Boleh diganti selama belum lunas. */
export function KirimBukti({ token, terkirim }: { token: string; terkirim: string | null }) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [menunggu, mulai] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);

  const pilih = (berkas: File | undefined) =>
    berkas &&
    mulai(async () => {
      setGalat(null);
      try {
        const data = new FormData();
        data.set("foto", await kecilkanFoto(berkas), "bukti.jpg");
        const r = await kirimBuktiTransfer(token, data);
        if (!r.ok) setGalat(r.pesan ?? "Gagal mengirim.");
        else router.refresh();
      } catch {
        setGalat("Foto gagal diproses. Coba foto lain.");
      }
    });

  return (
    <div className="flex flex-col gap-2">
      {terkirim ? (
        <p className="flex items-center gap-2 text-[0.9375rem] text-lunas">
          <CircleCheck className="size-4 shrink-0" />
          Bukti transfer terkirim {terkirim}. Admin akan mengecek.
        </p>
      ) : null}
      <input ref={masukan} type="file" accept="image/*" className="hidden" onChange={(e) => pilih(e.target.files?.[0])} />
      <Button type="button" size="lg" variant={terkirim ? "outline" : "default"} className="min-h-11 w-fit rounded-full" disabled={menunggu} onClick={() => masukan.current?.click()}>
        {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {terkirim ? "Ganti bukti transfer" : "Kirim bukti transfer"}
      </Button>
      {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
    </div>
  );
}
