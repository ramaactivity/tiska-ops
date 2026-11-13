"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";

import { buatPrManual } from "../actions";

const TUJUAN = [
  { nilai: "event", label: "Untuk event" },
  { nilai: "stok", label: "Untuk stok gudang" },
] as const;

/** PR manual (D-146): pilih tujuan dulu — event (biayanya masuk Margin event itu) atau stok gudang. */
export function FormPrBaru({ event, hariIni }: { event: (OpsiCari & { tanggal: string | null })[]; hariIni: string }) {
  const [tujuan, setTujuan] = useState<"event" | "stok">("event");
  const [pilih, setPilih] = useState<(OpsiCari & { tanggal: string | null }) | undefined>();
  const [tanggal, setTanggal] = useState(hariIni);
  const [menunggu, mulai] = useTransition();

  const kirim = () =>
    mulai(async () => {
      try {
        await buatPrManual({ tujuan, idEvent: pilih?.id ?? null, tanggal });
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });

  return (
    <section className="flex flex-col gap-5 kartu p-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Belanja ini untuk apa?</p>
        <PilihanChip label="Tujuan belanja" pilihan={TUJUAN} nilai={tujuan} onPilih={(v) => setTujuan(v as "event" | "stok")} />
        <p className="text-xs text-muted-foreground">
          {tujuan === "event"
            ? "Perkiraan & realisasi biayanya otomatis masuk laporan Margin event yang dipilih."
            : "Barang masuk stok gudang. Tidak dibebankan ke event mana pun saat dibeli."}
        </p>
      </div>
      {tujuan === "event" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Event</p>
          <PilihCari
            nilai={pilih}
            pilihan={event}
            placeholder="Cari nama event atau customer…"
            onPilih={(p) => {
              const e = event.find((x) => x.id === p.id);
              setPilih(e);
              if (e?.tanggal) setTanggal(e.tanggal);
            }}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Dibutuhkan tanggal</p>
        <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} aria-label="Tanggal belanja dibutuhkan" className="max-w-xs" />
      </div>
      <div className="flex justify-end">
        <Button disabled={menunggu || !tanggal || (tujuan === "event" && !pilih)} onClick={kirim}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Buat PR lalu isi barangnya
        </Button>
      </div>
    </section>
  );
}
