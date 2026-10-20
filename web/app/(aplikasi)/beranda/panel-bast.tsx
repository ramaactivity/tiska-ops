"use client";

import { Camera, LoaderCircle, PenLine, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PapanTandaTangan, type PapanTtd } from "@/components/papan-tanda-tangan";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kecilkanFoto } from "@/lib/foto";

import type { TugasTampil } from "./kartu-tugas";
import { useAntrian, useLapor } from "./status-sinyal";

/**
 * BAST di HP tim (D-103): sesudah "Sudah sampai", penerima menandatangani
 * di layar. Panel di dalam Beranda (bukan halaman lain) supaya tetap jalan
 * tanpa sinyal — ikut antrian laporan HP (D-099).
 */
export function TombolBast({ t }: { t: TugasTampil }) {
  const antre = useAntrian();
  const [buka, setBuka] = useState(false);
  const sampai = t.lacak.some((l) => l.status === "tiba") || antre.some((a) => a.jenis === "status" && a.id === t.kloterId && a.status === "tiba");
  const tertunda = antre.some((a) => a.jenis === "bast" && a.id === t.kloterId);
  if (t.bast) return <p className="text-sm text-lunas">✅ BAST ditandatangani {t.bast.penerima} · <span className="nomor-dokumen">{t.bast.nomor}</span></p>;
  if (tertunda) return <p className="text-sm text-perhatian">✍️ BAST ditandatangani · ⏳ menunggu sinyal</p>;
  if (!sampai) return null;
  return (
    <>
      <Button variant="outline" className="h-14 rounded-full border-2 text-lg" onClick={() => setBuka(true)}>
        <PenLine className="size-5" />
        BAST — tanda tangan penerima
      </Button>
      {buka ? <PanelBast t={t} tutup={() => setBuka(false)} /> : null}
    </>
  );
}

function PanelBast({ t, tutup }: { t: TugasTampil; tutup: () => void }) {
  const { lapor, menunggu } = useLapor();
  const [penerima, setPenerima] = useState(t.pic ?? "");
  const [kondisi, setKondisi] = useState("baik");
  const [catatan, setCatatan] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const papan = useRef<PapanTtd>(null);

  const kirim = async () => {
    if (penerima.trim().length < 2) return toast.error("Tulis nama penerima.");
    if (kondisi === "catatan" && catatan.trim().length < 3) return toast.error("Tulis catatannya (mis. 2 box kurang).");
    const ttd = await papan.current?.ambil();
    if (!ttd) return toast.error("Minta penerima tanda tangan di kotak putih.");
    lapor(
      async () => ({ jenis: "bast", id: t.kloterId, penerima, kondisi, catatan, ttd, foto: foto ? await kecilkanFoto(foto) : null, jam: Date.now() }),
      "BAST tersimpan ✍️",
      tutup,
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="BAST serah terima" className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-4 pb-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">✍️ Serah terima (BAST)</h2>
          <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={tutup} aria-label="Tutup">
            <X className="size-6" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{[t.tujuan, t.hari, `berangkat ${t.jam}`].filter(Boolean).join(" · ")}</p>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="pb-1 text-sm font-medium">Barang yang diserahkan</p>
          {t.barangBast.map((o, i) => (
            <div key={i} className="py-1">
              <p className="font-semibold">
                🍱 {o.nama} = <span className="tabular-nums">{o.jumlah}</span>
              </p>
              {o.isi.length ? <p className="text-sm text-muted-foreground">{o.isi.join(", ")}</p> : null}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="penerima">Nama penerima</Label>
          <Input id="penerima" className="h-12 text-base" value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="mis. Bu Sari" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Kondisi barang</Label>
          <PilihanChip
            label="Kondisi barang"
            nilai={kondisi}
            onPilih={setKondisi}
            pilihan={[
              { nilai: "baik", label: "✅ Lengkap & baik" },
              { nilai: "catatan", label: "⚠️ Ada catatan" },
            ]}
          />
          {kondisi === "catatan" ? <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="mis. 2 box kurang, menyusul jam 12" aria-label="Catatan kondisi" /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Tanda tangan penerima</Label>
          <PapanTandaTangan ref={papan} />
        </div>
        <input
          ref={kamera}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Foto serah terima"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" className="h-12 rounded-full" onClick={() => kamera.current?.click()}>
          <Camera className="size-5" />
          {foto ? "Foto terpasang ✓ (ganti)" : "Foto barang diterima (boleh dilewati)"}
        </Button>
        <Button className="h-14 rounded-full text-lg" disabled={menunggu} onClick={kirim}>
          {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
          Simpan BAST
        </Button>
      </div>
    </div>
  );
}
