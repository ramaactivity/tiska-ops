"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BENTUK_LEAD, SUMBER_LEAD } from "@/lib/lead";

import { type KeadaanLead, simpanLead } from "./actions";

export type IsiLead = {
  id?: string;
  name: string;
  phone: string;
  source: string;
  event_type: string;
  event_date: string;
  location: string;
  pax: string;
  service_form: string;
  budget: string;
  next_followup_at: string;
  notes: string;
};

const chip = (aktif: boolean) =>
  `min-h-9 rounded-full border px-3.5 text-sm transition-colors ${aktif ? "border-foreground bg-foreground text-background" : "hover:bg-accent"}`;

export function FormLead({ isi, batalHref }: { isi: IsiLead; batalHref: string }) {
  const [keadaan, kirim, sedang] = useActionState<KeadaanLead, FormData>(simpanLead, {});
  const [sumber, setSumber] = useState(isi.source);
  const [bentuk, setBentuk] = useState(isi.service_form);
  const g = keadaan.galat ?? {};

  const bidang = (nama: keyof IsiLead, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={nama}>{label}</Label>
      <Input id={nama} name={nama} defaultValue={isi[nama]} aria-invalid={Boolean(g[nama])} {...props} />
      {g[nama] ? <p className="text-xs text-destructive">{g[nama]}</p> : null}
    </div>
  );

  return (
    <form action={kirim} className="flex flex-col gap-6 pb-10">
      {isi.id ? <input type="hidden" name="id" value={isi.id} /> : null}
      <input type="hidden" name="source" value={sumber} />
      <input type="hidden" name="service_form" value={bentuk} />
      {keadaan.pesan ? <p role="alert" className="text-sm text-destructive">{keadaan.pesan}</p> : null}

      <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        {bidang("name", "Nama calon customer", { placeholder: "Ibu Ira / PT Seelindo", autoFocus: !isi.id })}
        {bidang("phone", "No. HP / WA", { placeholder: "0812…", inputMode: "tel" })}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Dari mana</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sumber lead">
            {Object.entries(SUMBER_LEAD).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={sumber === k} onClick={() => setSumber(k)} className={chip(sumber === k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        {bidang("event_type", "Jenis acara", { placeholder: "Pernikahan, rapat kantor, syukuran…" })}
        {bidang("event_date", "Tanggal acara", { type: "date" })}
        {bidang("location", "Lokasi", { placeholder: "Sentul, Bogor" })}
        {bidang("pax", "Perkiraan tamu (pax)", { inputMode: "numeric", placeholder: "300" })}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Bentuk pesanan</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bentuk pesanan">
            {BENTUK_LEAD.map((b) => (
              <button key={b} type="button" aria-pressed={bentuk === b} onClick={() => setBentuk(bentuk === b ? "" : b)} className={chip(bentuk === b)}>
                {b}
              </button>
            ))}
          </div>
        </div>
        {bidang("budget", "Budget (kalau disebut)", { placeholder: "± 50 rb/pax" })}
        {bidang("next_followup_at", "Follow-up berikutnya", { type: "date" })}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="notes">Catatan</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={isi.notes} placeholder="Preferensi menu, alergi, permintaan khusus…" />
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" render={<Link href={batalHref} />}>
          Batal
        </Button>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Simpan lead
        </Button>
      </div>
    </form>
  );
}
