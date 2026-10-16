"use client";

import { FileText, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JENIS_AKTIVITAS, TAHAP_LEAD, type TahapLead } from "@/lib/lead";

import { buatQuotationDariLead, catatAktivitasLead, ubahTahapLead } from "../actions";

const chip = (aktif: boolean) =>
  `min-h-9 rounded-full border px-3.5 text-sm transition-colors ${aktif ? "border-foreground bg-foreground text-background" : "hover:bg-accent"}`;

function jalankan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, sukses: string) {
  mulai(async () => {
    try {
      await kerja();
      toast.success(sukses);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

export function PilihTahap({ id, tahap }: { id: string; tahap: string }) {
  const [menunggu, mulai] = useTransition();
  const [batal, setBatal] = useState(false);
  const [alasan, setAlasan] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tahap lead">
        {(Object.entries(TAHAP_LEAD) as [TahapLead, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={menunggu}
            aria-pressed={tahap === k}
            onClick={() => (k === "batal" ? setBatal(true) : jalankan(mulai, () => ubahTahapLead(id, k), `Tahap: ${label}`))}
            className={chip(tahap === k)}
          >
            {label}
          </button>
        ))}
      </div>
      {batal && tahap !== "batal" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan batal, mis. harga di atas budget" className="max-w-sm" aria-label="Alasan batal" />
          <Button size="sm" variant="outline" disabled={menunggu} onClick={() => jalankan(mulai, () => ubahTahapLead(id, "batal", alasan), "Lead ditandai batal")}>
            Tandai batal
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function CatatAktivitas({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  const [jenis, setJenis] = useState("chat");
  const [isi, setIsi] = useState("");
  const [followup, setFollowup] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jenis aktivitas">
        {Object.entries(JENIS_AKTIVITAS).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={jenis === k} onClick={() => setJenis(k)} className={chip(jenis === k)}>
            {label}
          </button>
        ))}
      </div>
      <Textarea value={isi} onChange={(e) => setIsi(e.target.value)} rows={3} placeholder="Ringkasan: tanya harga buffet 300 pax, minta dikirim pricelist wedding…" aria-label="Ringkasan aktivitas" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="followup">Follow-up berikutnya</Label>
          <Input id="followup" type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} className="w-44" />
        </div>
        <Button
          disabled={menunggu || !isi.trim()}
          className="rounded-full"
          onClick={() =>
            jalankan(
              mulai,
              async () => {
                await catatAktivitasLead(id, { jenis, isi, followup: followup || null });
                setIsi("");
                setFollowup("");
              },
              "Aktivitas tercatat",
            )
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Catat
        </Button>
      </div>
    </div>
  );
}

export function TombolBuatQuotation({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button size="sm" disabled={menunggu} onClick={() => mulai(() => buatQuotationDariLead(id))}>
      {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileText className="size-4" />}
      Buat quotation
    </Button>
  );
}
