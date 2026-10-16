"use client";

import { Check, FileUp, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CARA_SETUJU, type CaraSetuju } from "@/lib/persetujuan-klien";

import { catatPersetujuanKlien, mintaUnggahBukti } from "../actions";

const BATAS = 10 * 1024 * 1024;

/**
 * "Tandai disetujui" dengan catatan persetujuan customer (01-SPEC E.12,
 * D-044): lewat apa, catatan, dan bukti (screenshot WA / foto dokumen
 * bertanda tangan) — diunggah browser langsung ke penyimpanan tertutup.
 */
export function DialogSetuju({ id, nomor }: { id: string; nomor: string }) {
  const [buka, setBuka] = useState(false);
  const [cara, setCara] = useState<CaraSetuju | null>(null);
  const [catatan, setCatatan] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [sedang, setSedang] = useState(false);
  const masukan = useRef<HTMLInputElement>(null);

  async function simpan() {
    if (!cara) return toast.error("Pilih cara customer menyetujui.");
    if (berkas && berkas.size > BATAS) return toast.error("Bukti lebih dari 10 MB.");
    setSedang(true);
    try {
      let jalur: string | null = null;
      if (berkas) {
        const t = await mintaUnggahBukti(id, berkas.type);
        const r = await fetch(t.url, { method: "PUT", headers: { "content-type": berkas.type }, body: berkas });
        if (!r.ok) throw new Error(`Unggah bukti gagal (${r.status}).`);
        jalur = t.jalur;
      }
      await catatPersetujuanKlien(id, { cara, catatan, jalur });
      toast.success(`${nomor} disetujui customer.`);
      setBuka(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Persetujuan gagal dicatat.");
    } finally {
      setSedang(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setBuka(true)}>
        <Check className="size-4" />
        Tandai disetujui
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer menyetujui {nomor}</DialogTitle>
            <DialogDescription>Catat lewat apa customer setuju. Bukti boleh dilewati, tapi sangat dianjurkan.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cara customer menyetujui">
              {(Object.entries(CARA_SETUJU) as [CaraSetuju, string][]).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={cara === k}
                  onClick={() => setCara(k)}
                  className={`min-h-9 rounded-full border px-3.5 text-sm transition-colors ${cara === k ? "border-foreground bg-foreground text-background" : "hover:bg-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catatan-setuju">Catatan</Label>
              <Input
                id="catatan-setuju"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="mis. Bu Ira OK via WA 16 Okt, minta DP minggu depan"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Bukti (opsional)</span>
              <input
                ref={masukan}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="sr-only"
                aria-label="Berkas bukti persetujuan"
                onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" className="h-11 justify-start rounded-full" onClick={() => masukan.current?.click()}>
                <FileUp className="size-4" />
                <span className="truncate">{berkas ? berkas.name : "Pilih screenshot / foto / PDF…"}</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuka(false)} disabled={sedang}>
              Batal
            </Button>
            <Button onClick={simpan} disabled={sedang || !cara}>
              {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
              Simpan persetujuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
