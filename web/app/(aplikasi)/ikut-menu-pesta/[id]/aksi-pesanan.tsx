"use client";

import { ArrowDown, ArrowUp, Ban, Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DialogPembatalan } from "@/components/dialog-pembatalan";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";

import { aturKloterPesanan, batalkanPesanan, geserUrutan, putuskanLuarArea } from "../pesanan-actions";

/** Tombol per pesanan: persetujuan kirim luar area (owner) & batalkan pesanan. */
export function AksiPesanan({ id, nama, bolehArea, menungguArea }: { id: string; nama: string; bolehArea: boolean; menungguArea: boolean }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const area = (setuju: boolean) =>
    mulai(async () => {
      const r = await putuskanLuarArea(id, setuju);
      if (!r.ok) toast.error(r.pesan);
      else {
        toast.success(setuju ? "Kirim luar area disetujui." : "Kirim luar area ditolak.");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {menungguArea && bolehArea ? (
        <>
          <Button type="button" size="sm" className="rounded-full" disabled={menunggu} onClick={() => area(true)}>
            {menunggu ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Setujui luar area
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => area(false)}>
            <X className="size-3.5" />
            Tolak
          </Button>
        </>
      ) : null}
      <Button type="button" size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => setBuka(true)}>
        <Ban className="size-3.5" />
        Batalkan
      </Button>
      <DialogPembatalan
        terbuka={buka}
        onTerbukaChange={setBuka}
        judul={`Batalkan pesanan ${nama}?`}
        keterangan="Invoice-nya ikut dibatalkan dan porsinya keluar dari hitungan dapur."
        labelTombol="Batalkan pesanan"
        onBatalkan={async (alasan) => {
          const r = await batalkanPesanan(id, alasan);
          if (!r.ok) throw new Error(r.pesan);
          toast.success("Pesanan dibatalkan.");
          router.refresh();
        }}
      />
    </div>
  );
}

/** Pesanan → kloter antar (D-117) + geser urutan antar. */
export function AntarPesanan({ id, kloter, terpilih }: { id: string; kloter: { nilai: string; label: string }[]; terpilih: string | null }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const jalan = (kerja: () => Promise<{ ok: boolean; pesan?: string }>) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) toast.error(r.pesan ?? "Gagal.");
      else router.refresh();
    });
  if (!kloter.length) return <span className="text-sm text-muted-foreground">Buat kloter antar dulu di bagian Pengiriman.</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-muted-foreground">🚚</span>
      <PilihanChip
        kecil
        label="Kloter antar"
        nilai={terpilih ?? ""}
        onPilih={(v) => !menunggu && jalan(() => aturKloterPesanan(id, v || null))}
        pilihan={[{ nilai: "", label: "Belum" }, ...kloter]}
      />
      {terpilih ? (
        <>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Antar lebih awal" disabled={menunggu} onClick={() => jalan(() => geserUrutan(id, -1))}>
            <ArrowUp className="size-4" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Antar lebih akhir" disabled={menunggu} onClick={() => jalan(() => geserUrutan(id, 1))}>
            <ArrowDown className="size-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
