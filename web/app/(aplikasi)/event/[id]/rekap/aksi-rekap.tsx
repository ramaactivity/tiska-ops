"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { bukaRekap, kunciRekap, setujuiRekap } from "./actions";

/** Tombol alur rekap untuk Finance/owner + peringatan data yang belum lengkap. */
export function AksiRekap({
  id,
  status,
  adaInvoice,
  marginFinal,
  bolehKunci,
  admin,
  peringatan,
}: {
  id: string;
  status: string | null;
  adaInvoice: boolean;
  marginFinal: boolean;
  bolehKunci: boolean;
  admin: boolean;
  peringatan: string[];
}) {
  const [menunggu, mulai] = useTransition();
  const jalan = (k: () => Promise<void>, ok: string) =>
    mulai(async () => {
      try {
        await k();
        toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      {peringatan.length ? (
        <ul className="flex flex-col gap-1 text-sm text-perhatian">
          {peringatan.map((p) => (
            <li key={p}>⚠️ {p}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Data operasional lengkap.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "dikunci" ? (
          <Button disabled={menunggu || !adaInvoice || marginFinal} onClick={() => jalan(() => setujuiRekap(id), "Rekap disetujui — biaya masuk laporan Margin.")}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {status === "disetujui" ? "Perbarui biaya ke Margin" : "Setujui & kirim biaya ke Margin"}
          </Button>
        ) : null}
        {status === "disetujui" && bolehKunci ? (
          <Button variant="outline" disabled={menunggu} onClick={() => jalan(() => kunciRekap(id), "Rekap dikunci.")}>
            Kunci rekap
          </Button>
        ) : null}
        {status === "dikunci" && admin ? (
          <Button variant="outline" disabled={menunggu} onClick={() => jalan(() => bukaRekap(id), "Rekap dibuka kembali.")}>
            Buka kembali
          </Button>
        ) : null}
      </div>
      {marginFinal ? <p className="text-xs text-muted-foreground">Margin invoice sudah difinalisasi — buka kembali di halaman Margin untuk memperbarui biaya.</p> : null}
    </section>
  );
}
