"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PapanPin } from "@/components/papan-pin";
import { Button } from "@/components/ui/button";
import { pinLemah } from "@/lib/tim";

import { simpanPin } from "./actions";

export function BuatPin({ sudahAda }: { sudahAda: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [pertama, setPertama] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const lemah = pertama === null && pin.length >= 4 && pinLemah(pin);

  const lanjut = () => {
    if (pertama === null) return (setPertama(pin), setPin(""));
    if (pin !== pertama) {
      toast.error("PIN tidak sama. Ulangi dari awal.");
      return (setPertama(null), setPin(""));
    }
    mulai(async () => {
      try {
        await simpanPin(pin);
        toast.success("PIN tersimpan. HP ini sudah dipasangkan 👍");
        router.push("/beranda");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "PIN gagal disimpan.");
        setPertama(null);
        setPin("");
      }
    });
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-6 rounded-2xl border bg-card p-5">
      {sudahAda ? <p className="text-center text-sm text-muted-foreground">HP ini sudah dipasangkan. Tekan PIN baru di bawah untuk menggantinya.</p> : null}
      <p className="text-center text-lg font-semibold">{pertama === null ? "Tekan PIN baru (4–6 angka)" : "Tekan sekali lagi PIN yang sama"}</p>
      <PapanPin nilai={pin} ubah={setPin} nonaktif={menunggu} />
      {lemah ? <p className="text-center text-sm text-destructive">Terlalu gampang ditebak (mis. 1234 / 0000). Pilih angka lain.</p> : null}
      <Button className="h-14 w-full max-w-[18rem] rounded-full text-lg" disabled={pin.length < 4 || lemah || menunggu} onClick={lanjut}>
        {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        {pertama === null ? "Lanjut" : "Simpan PIN"}
      </Button>
    </div>
  );
}
