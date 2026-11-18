"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IsianRupiah } from "@/components/isian-rupiah";
import { JENIS_SEWA, type JenisSewa } from "@/lib/hitung/sewa";
import { rupiah } from "@/lib/uang";

import { FotoNota } from "../uang-muka/foto-nota";
import { batalkanSewa, simpanSewa } from "./actions";

const PILIHAN_JENIS = Object.entries(JENIS_SEWA).map(([nilai, j]) => ({ nilai, label: j.label }));

export type OpsiEventSewa = OpsiCari & {
  /** Invoice tujuan biaya; null = event belum punya invoice (biaya belum bisa masuk Margin). */
  invoice: string | null;
  /** Sewa alat bernominal yang sudah tercatat di Peralatan event — jangan dicatat dua kali. */
  sewaAlat: { nama: string; vendor: string | null; biaya: number }[];
};

function pesanGalat(e: unknown) {
  return e instanceof Error ? e.message : "Gagal.";
}

/** Catat biaya sewa (D-147): event → jenis → vendor, tanggal bayar, nominal, keterangan, bukti. */
export function FormSewa({ event, hariIni }: { event: OpsiEventSewa[]; hariIni: string }) {
  const kosong = { jenis: "alat_makan" as JenisSewa, vendor: "", tanggal: hariIni, nominal: "", catatan: "", bukti: [] as string[] };
  const [acara, setAcara] = useState<OpsiEventSewa | undefined>();
  const [f, setF] = useState(kosong);
  const [menunggu, mulai] = useTransition();
  const ubah = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const simpan = () =>
    mulai(async () => {
      try {
        await simpanSewa({ idEvent: acara?.id ?? "", jenis: f.jenis, vendor: f.vendor, tanggal: f.tanggal, nominal: Number(f.nominal), catatan: f.catatan, bukti: f.bukti });
        toast.success(acara?.invoice ? `Tercatat — masuk Margin ${acara.invoice}.` : "Tercatat.");
        setF({ ...kosong, tanggal: f.tanggal });
      } catch (e) {
        toast.error(pesanGalat(e));
      }
    });

  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="eyebrow">Catat biaya sewa</h2>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Untuk event
        <PilihCari nilai={acara} pilihan={event} onPilih={(p) => setAcara(event.find((x) => x.id === p.id))} placeholder="Cari nama event atau customer…" />
        {acara && !acara.invoice ? (
          <span className="text-xs font-normal text-perhatian">Event ini belum punya invoice — biaya tercatat, masuk Margin begitu invoice-nya tersambung.</span>
        ) : null}
        {acara?.sewaAlat.length ? (
          <div className="rounded-lg border border-perhatian-garis bg-perhatian-halus p-3 text-xs font-normal text-perhatian">
            Sudah tercatat di Peralatan event (ikut Margin lewat rekap event) — jangan dicatat lagi di sini:
            <ul className="mt-1 list-disc pl-4">
              {acara.sewaAlat.map((a, i) => (
                <li key={i}>
                  {a.nama}
                  {a.vendor ? ` · ${a.vendor}` : ""} · <span className="font-mono tabular-nums">{rupiah(a.biaya)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Jenis sewa
        <PilihanChip kecil label="Jenis sewa" pilihan={PILIHAN_JENIS} nilai={f.jenis} onPilih={(v) => ubah("jenis", v as JenisSewa)} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Vendor (opsional)
          <Input value={f.vendor} onChange={(e) => ubah("vendor", e.target.value)} maxLength={255} placeholder="mis. Agro Rental" />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Tanggal bayar
          <PilihTanggal value={f.tanggal} onChange={(t) => ubah("tanggal", t)} bisaHapus={false} aria-label="Tanggal bayar" />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nominal
          <IsianRupiah value={f.nominal} onChange={(t) => ubah("nominal", t.replace(/\D/g, "").slice(0, 11))} placeholder="0" className="text-right font-mono" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Keterangan (opsional)
        <Textarea value={f.catatan} onChange={(e) => ubah("catatan", e.target.value)} rows={2} maxLength={500} placeholder="mis. 10 chafing dish + 2 meja prasmanan, DP 50%" />
      </label>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Bukti transaksi (opsional)
        <FotoNota jalur={f.bukti} onUbah={(j) => ubah("bukti", j)} maks={5} label="Foto bukti" />
      </div>
      <div className="flex justify-end">
        <Button className="rounded-full" disabled={menunggu || !acara || !Number(f.nominal) || !f.tanggal} onClick={simpan}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Simpan biaya sewa
        </Button>
      </div>
    </section>
  );
}

/** Batalkan beralasan (salah catat). */
export function TombolBatalSewa({ id }: { id: string }) {
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [menunggu, mulai] = useTransition();
  if (!buka)
    return (
      <Button variant="ghost" size="sm" onClick={() => setBuka(true)}>
        Batalkan
      </Button>
    );
  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} placeholder="Kenapa dibatalkan? (mis. salah nominal, salah event)" aria-label="Alasan pembatalan" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={menunggu} onClick={() => setBuka(false)}>
          Tidak jadi
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={menunggu || alasan.trim().length < 5}
          onClick={() =>
            mulai(async () => {
              try {
                await batalkanSewa(id, alasan);
                toast.success("Dibatalkan — baris Margin ikut dihapus.");
              } catch (e) {
                toast.error(pesanGalat(e));
              }
            })
          }
        >
          Ya, batalkan
        </Button>
      </div>
    </div>
  );
}
