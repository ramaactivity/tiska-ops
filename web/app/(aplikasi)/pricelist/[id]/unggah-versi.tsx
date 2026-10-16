"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { mintaUnggah, simpanVersi } from "../actions";

const BATAS = 50 * 1024 * 1024;

/**
 * Unggah versi baru: browser mengirim berkas LANGSUNG ke penyimpanan lewat
 * tautan sekali pakai (berkas pricelist sampai 22 MB, melebihi batas kiriman
 * server 4,5 MB), lalu server mencatat versinya & menjadikannya aktif.
 */
export function UnggahVersi({ id }: { id: string }) {
  const masukan = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");
  const [sedang, setSedang] = useState(false);

  async function unggah() {
    if (!berkas) return;
    if (berkas.type !== "application/pdf") return toast.error("Hanya berkas PDF.");
    if (berkas.size > BATAS) return toast.error("Berkas lebih dari 50 MB.");
    setSedang(true);
    try {
      const { url, versi } = await mintaUnggah(id);
      const r = await fetch(url, { method: "PUT", headers: { "content-type": "application/pdf" }, body: berkas });
      if (!r.ok) throw new Error(`Unggah gagal (${r.status}).`);
      const hasil = await simpanVersi(id, versi, catatan);
      if (!hasil.sukses) throw new Error(hasil.pesan);
      toast.success(hasil.pesan);
      setBerkas(null);
      setCatatan("");
      if (masukan.current) masukan.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unggah gagal.");
    } finally {
      setSedang(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={masukan} type="file" accept="application/pdf" className="sr-only" onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} />
      <Button type="button" variant="outline" className="h-11 justify-start rounded-full" onClick={() => masukan.current?.click()}>
        <FileUp className="size-4" />
        <span className="truncate">{berkas ? `${berkas.name} (${(berkas.size / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB)` : "Pilih berkas PDF…"}</span>
      </Button>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catatan-versi">Apa yang berubah?</Label>
        <Input id="catatan-versi" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. harga stall naik, tambah menu Natal" />
      </div>
      <div>
        <Button type="button" onClick={unggah} disabled={!berkas || sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Mengunggah…" : "Unggah & jadikan aktif"}
        </Button>
      </div>
    </div>
  );
}
