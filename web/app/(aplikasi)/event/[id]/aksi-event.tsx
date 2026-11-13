"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARA_LAYANAN, STATUS_EVENT } from "@/lib/hitung/event";

import { perbaruiEvent, simpanInfoEvent, ubahPenanggungJawab, ubahStatusEvent } from "../actions";

export function PilihStatusEvent({ id, status }: { id: string; status: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <div className={menunggu ? "pointer-events-none opacity-60" : ""}>
      <PilihanChip
        kecil
        label="Status event"
        nilai={status}
        // Batal lewat halaman "Batalkan event" (alasan + refund, D-102).
        pilihan={Object.entries(STATUS_EVENT).filter(([nilai]) => nilai !== "batal").map(([nilai, label]) => ({ nilai, label }))}
        onPilih={(s) =>
          mulai(async () => {
            try {
              await ubahStatusEvent(id, s);
              toast.success(`Status: ${STATUS_EVENT[s as keyof typeof STATUS_EVENT]}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Gagal.");
            }
          })
        }
      />
    </div>
  );
}

export function TombolPerbarui({ id, sumber }: { id: string; sumber: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          try {
            toast.success((await perbaruiEvent(id)).pesan);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal memperbarui.");
          }
        })
      }
    >
      {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" />}
      Perbarui dari {sumber}
    </Button>
  );
}

export type InfoEvent = {
  id: string;
  service_mode: string;
  venue: string;
  address: string;
  maps_url: string;
  pic_name: string;
  pic_phone: string;
  eo_name: string;
  guest_count: string;
  notes: string;
};

export function FormInfoEvent({ info }: { info: InfoEvent }) {
  const [keadaan, kirim, sedang] = useActionState(simpanInfoEvent, {});
  const [mode, setMode] = useState(info.service_mode);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  const bidang = (nama: keyof InfoEvent, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`ev-${nama}`}>{label}</Label>
      <Input id={`ev-${nama}`} name={nama} defaultValue={info[nama]} {...props} />
    </div>
  );
  return (
    <form action={kirim} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={info.id} />
      {keadaan.pesan && !keadaan.sukses ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cara layanan</span>
        <PilihanChip kecil label="Cara layanan" nama="service_mode" nilai={mode} onPilih={setMode} pilihan={Object.entries(CARA_LAYANAN).map(([nilai, label]) => ({ nilai, label }))} />
      </div>
      {bidang("venue", "Venue")}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ev-address">Alamat lengkap / patokan</Label>
        <Textarea id="ev-address" name="address" rows={2} defaultValue={info.address} />
      </div>
      {bidang("maps_url", "Link Google Maps", { inputMode: "url", placeholder: "https://maps.app.goo.gl/…" })}
      <div className="grid gap-3 sm:grid-cols-2">
        {bidang("pic_name", "PIC di lokasi")}
        {bidang("pic_phone", "HP PIC", { inputMode: "tel" })}
        {bidang("eo_name", "EO / WO")}
        {bidang("guest_count", "Jumlah tamu", { inputMode: "numeric" })}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ev-notes">Catatan untuk tim</Label>
        <Textarea id="ev-notes" name="notes" rows={3} defaultValue={info.notes} placeholder="Akses loading dock, jam tiba, alergi tamu VIP…" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={sedang} className="rounded-full">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Simpan info
        </Button>
      </div>
    </form>
  );
}

export { SalinTeks } from "@/components/salin-teks";

/** Alihkan penanggung jawab (D-175): tombol "Alihkan" membuka pencari akun kantor. */
export function AlihkanPenanggungJawab({ id, nilai, pilihan }: { id: string; nilai: OpsiCari | null; pilihan: OpsiCari[] }) {
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  if (!buka)
    return (
      <Button variant="ghost" size="sm" className="rounded-full text-primary" onClick={() => setBuka(true)}>
        {nilai ? "Alihkan" : "Pilih"}
      </Button>
    );
  return (
    <div className={`w-full pt-3 ${menunggu ? "pointer-events-none opacity-60" : ""}`}>
      <PilihCari
        autoFocus
        semuaSaatKosong
        nilai={nilai ?? undefined}
        pilihan={pilihan}
        placeholder="Ketik nama orang kantor…"
        onPilih={(p) =>
          mulai(async () => {
            try {
              await ubahPenanggungJawab(id, p.id);
              toast.success(`Penanggung jawab: ${p.label}`);
              setBuka(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Gagal mengalihkan.");
            }
          })
        }
      />
    </div>
  );
}
