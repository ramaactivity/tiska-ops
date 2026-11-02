"use client";

import { LoaderCircle, Pause, Pencil, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { kalimatAturan } from "@/lib/hitung/loyalti";
import type { ProgramLoyalti } from "@/lib/loyalti";

import { aktifkanProgramLoyalti, simpanProgramLoyalti } from "./actions";

type Isi = { id: string | null; nama: string; syarat: string; minBelanja: string; jendelaHari: string; hadiah: string; berlakuHari: string; mulai: string };
const angka = (s: string) => s.replace(/\D/g, "");

/** Tombol "Program baru" / "Ubah" + dialog aturan (D-131). Semua angka bebas diatur — Rama belum menentukan. */
export function TombolProgram({ program, hariIni }: { program?: ProgramLoyalti; hariIni: string }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const awal: Isi = program
    ? { id: program.id, nama: program.nama, syarat: String(program.syarat), minBelanja: program.minBelanja ? String(program.minBelanja) : "", jendelaHari: program.jendelaHari ? String(program.jendelaHari) : "", hadiah: program.hadiah, berlakuHari: program.berlakuHari ? String(program.berlakuHari) : "", mulai: program.mulai }
    : { id: null, nama: "Kartu Setia Ikut Menu Pesta", syarat: "5", minBelanja: "", jendelaHari: "90", hadiah: "", berlakuHari: "30", mulai: hariIni };
  const [f, setF] = useState(awal);
  const ubah = (k: keyof Isi, v: string) => setF((x) => ({ ...x, [k]: v }));
  const contoh = kalimatAturan({ id: "", syarat: Number(f.syarat) || 1, minBelanja: Number(f.minBelanja) || null, jendelaHari: Number(f.jendelaHari) || null, berlakuHari: Number(f.berlakuHari) || null, mulai: f.mulai, hadiah: f.hadiah || "(hadiah)" });

  return (
    <>
      <span className="flex gap-1">
        <Button
          type="button"
          size={program ? "sm" : "default"}
          variant={program ? "outline" : "default"}
          className="rounded-full"
          onClick={() => {
            setF(awal);
            setBuka(true);
          }}
        >
          {program ? <Pencil className="size-3.5" /> : <Plus className="size-4" />}
          {program ? "Ubah" : "Program baru"}
        </Button>
        {program ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => {
                const r = await aktifkanProgramLoyalti(program.id, !program.aktif);
                if (r.ok) toast.success(r.pesan);
                else toast.error(r.pesan);
                router.refresh();
              })
            }
          >
            {program.aktif ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {program.aktif ? "Hentikan" : "Aktifkan"}
          </Button>
        ) : null}
      </span>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{program ? "Ubah program loyalti" : "Program loyalti baru"}</DialogTitle>
            <DialogDescription>Yang dihitung: pesanan Ikut Menu Pesta yang sudah lunas. Mengubah syarat menghitung ulang kartu semua pembeli.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium">
              Nama program
              <Input value={f.nama} onChange={(e) => ubah("nama", e.target.value)} maxLength={120} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Jumlah pesanan untuk 1 hadiah
              <Input inputMode="numeric" value={f.syarat} onChange={(e) => ubah("syarat", angka(e.target.value).slice(0, 3))} className="font-mono tabular-nums" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Minimal belanja / pesanan (opsional)
              <Input
                inputMode="numeric"
                value={f.minBelanja ? Number(f.minBelanja).toLocaleString("id-ID") : ""}
                onChange={(e) => ubah("minBelanja", angka(e.target.value).slice(0, 12))}
                placeholder="Rp berapa pun"
                className="text-right font-mono tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Harus terpenuhi dalam (hari)
              <Input inputMode="numeric" value={f.jendelaHari} onChange={(e) => ubah("jendelaHari", angka(e.target.value).slice(0, 4))} placeholder="kosong = tanpa batas" className="font-mono tabular-nums" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Hadiah berlaku (hari)
              <Input inputMode="numeric" value={f.berlakuHari} onChange={(e) => ubah("berlakuHari", angka(e.target.value).slice(0, 4))} placeholder="kosong = tanpa batas" className="font-mono tabular-nums" />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium">
              Hadiah
              <Input value={f.hadiah} onChange={(e) => ubah("hadiah", e.target.value)} maxLength={300} placeholder="mis. Free 1 box Paket Ayam Bakar / Gratis ongkir / Potongan Rp25.000" />
            </label>
            <div className="col-span-2 flex flex-col gap-1.5 text-sm font-medium">
              Mulai dihitung dari pesanan yang dikirim tanggal
              <PilihTanggal value={f.mulai} onChange={(t) => ubah("mulai", t)} bisaHapus={false} aria-label="Mulai dihitung" />
            </div>
            <p className="col-span-2 rounded-xl bg-muted px-3 py-2.5 text-sm">{contoh}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={menunggu || !f.hadiah.trim() || !Number(f.syarat)}
              onClick={() =>
                mulai(async () => {
                  const r = await simpanProgramLoyalti({ ...f, syarat: Number(f.syarat) });
                  if (!r.ok) return void toast.error(r.pesan);
                  toast.success(r.pesan);
                  setBuka(false);
                  router.refresh();
                })
              }
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Simpan program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
