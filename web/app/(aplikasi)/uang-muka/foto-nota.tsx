"use client";

import { Camera, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { kecilkanFoto } from "@/lib/foto";

import { mintaUnggahNota } from "./actions";

/**
 * Foto nota / bukti transfer: kamera HP, dikecilkan, langsung ke bucket
 * tertutup. Yang disimpan form hanya jalurnya.
 */
export function FotoNota({ jalur, onUbah, maks = 10, label = "Foto nota" }: { jalur: string[]; onUbah: (j: string[]) => void; maks?: number; label?: string }) {
  const kamera = useRef<HTMLInputElement>(null);
  const [unggah, setUnggah] = useState(0);
  const [pratinjau, setPratinjau] = useState<Record<string, string>>({});

  async function tambah(berkas: FileList | null) {
    if (!berkas?.length) return;
    const daftar = [...berkas].slice(0, maks - jalur.length);
    setUnggah(daftar.length);
    const baru: string[] = [];
    for (const b of daftar) {
      try {
        const kecil = await kecilkanFoto(b);
        const t = await mintaUnggahNota();
        const r = await fetch(t.url, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: kecil });
        if (!r.ok) throw new Error("Foto gagal terkirim. Coba lagi saat ada sinyal.");
        baru.push(t.jalur);
        setPratinjau((p) => ({ ...p, [t.jalur]: URL.createObjectURL(kecil) }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Foto gagal diunggah.");
      }
      setUnggah((n) => n - 1);
    }
    onUbah([...jalur, ...baru]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {jalur.map((j) => (
        <div key={j} className="relative size-20 overflow-hidden rounded-[10px] border bg-muted">
          {pratinjau[j] ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob lokal, bukan aset
            <img src={pratinjau[j]} alt="Foto nota" className="size-full object-cover" />
          ) : null}
          <button
            type="button"
            aria-label="Hapus foto"
            onClick={() => onUbah(jalur.filter((x) => x !== j))}
            className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <input ref={kamera} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => tambah(e.target.files).finally(() => (e.target.value = ""))} />
      {jalur.length < maks ? (
        <Button type="button" variant="outline" className="h-20 min-w-20 flex-col gap-1" disabled={unggah > 0} onClick={() => kamera.current?.click()}>
          {unggah > 0 ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5" />}
          <span className="text-xs">{unggah > 0 ? "Mengunggah…" : label}</span>
        </Button>
      ) : null}
    </div>
  );
}
