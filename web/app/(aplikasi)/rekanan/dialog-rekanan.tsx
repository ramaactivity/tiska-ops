"use client";

import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JENIS_REKANAN } from "@/lib/hitung/rekanan";

import { simpanRekanan } from "./actions";

export type IsiRekanan = { id: string | null; nama: string; jenis: string; pic: string; hp: string; email: string; instagram: string; rekening: string; feePct: string; catatan: string };
const KOSONG: IsiRekanan = { id: null, nama: "", jenis: "wo", pic: "", hp: "", email: "", instagram: "", rekening: "", feePct: "", catatan: "" };
const PILIHAN = Object.entries(JENIS_REKANAN).map(([nilai, label]) => ({ nilai, label }));

/** Tambah / ubah rekanan pembawa klien (D-132). Partner Fee kosong = bawaan Angka Bisnis. */
export function TombolRekanan({ rekanan, feeBawaan }: { rekanan?: IsiRekanan; feeBawaan: number }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [f, setF] = useState<IsiRekanan>(rekanan ?? KOSONG);
  const [menunggu, mulai] = useTransition();
  const ubah = (k: keyof IsiRekanan, v: string) => setF((x) => ({ ...x, [k]: v }));
  const isian = (k: keyof IsiRekanan, label: string, placeholder = "", lebar = false) => (
    <label className={`flex flex-col gap-1.5 text-sm font-medium${lebar ? " sm:col-span-2" : ""}`}>
      {label}
      <Input value={f[k] ?? ""} onChange={(e) => ubah(k, e.target.value)} placeholder={placeholder} />
    </label>
  );
  return (
    <>
      <Button
        type="button"
        variant={rekanan ? "outline" : "default"}
        className={rekanan ? "rounded-full bg-card" : "rounded-full"}
        onClick={() => {
          setF(rekanan ?? KOSONG);
          setBuka(true);
        }}
      >
        {rekanan ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {rekanan ? "Ubah" : "Rekanan baru"}
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{rekanan ? "Ubah rekanan" : "Rekanan baru"}</DialogTitle>
            <DialogDescription>EO, WO, MC, venue, dan pihak lain yang membawa klien ke Tiska.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {isian("nama", "Nama rekanan", "mis. Jasmine Wedding Organizer", true)}
            <div className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Jenis
              <PilihanChip pilihan={PILIHAN} nilai={f.jenis} onPilih={(n) => ubah("jenis", n)} label="Jenis rekanan" kecil />
            </div>
            {isian("pic", "Nama PIC")}
            {isian("hp", "Nomor WhatsApp", "08…")}
            {isian("instagram", "Instagram", "@…")}
            {isian("email", "Email")}
            {isian("rekening", "Rekening Partner Fee", "mis. BCA 123… a.n. …", true)}
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Partner Fee (%)
              <Input inputMode="decimal" value={f.feePct} onChange={(e) => ubah("feePct", e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))} placeholder={`kosong = bawaan ${String(feeBawaan).replace(".", ",")}%`} className="font-mono tabular-nums" />
              <span className="text-xs font-normal text-muted-foreground">Dari nilai makanan & minuman (tanpa layanan, Delivery Fee, pajak). Isi kalau kesepakatan dengan rekanan ini berbeda.</span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Catatan
              <Textarea value={f.catatan} onChange={(e) => ubah("catatan", e.target.value)} maxLength={1000} placeholder="mis. biasa bawa klien wedding Bogor, minta Partner Fee dibayar per bulan" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button
              className="rounded-full"
              disabled={menunggu || f.nama.trim().length < 2}
              onClick={() =>
                mulai(async () => {
                  const r = await simpanRekanan(f as Parameters<typeof simpanRekanan>[0]);
                  if (!r.ok) return void toast.error(r.pesan);
                  toast.success(r.pesan);
                  setBuka(false);
                  if (!rekanan && r.id) router.push(`/rekanan/${r.id}`);
                  else router.refresh();
                })
              }
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
