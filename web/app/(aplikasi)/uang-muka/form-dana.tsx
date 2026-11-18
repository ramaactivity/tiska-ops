"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { IsianRupiah } from "@/components/isian-rupiah";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { catatPengembalian, catatTopup } from "./actions";
import { FotoNota } from "./foto-nota";

type OpsiPr = { id: string; label: string; jumlah: number; pemegang: string | null };

/** Panel Finance: dana masuk ke pemegang (dari PR disetujui) atau sisa yang dikembalikan. */
export function FormDana({ pemegang, pr }: { pemegang: OpsiCari[]; pr: OpsiPr[] }) {
  const [jenis, setJenis] = useState<"topup" | "pengembalian">("topup");
  const [orang, setOrang] = useState<OpsiCari | undefined>();
  const [prPilih, setPrPilih] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [bukti, setBukti] = useState<string[]>([]);
  const [menunggu, mulai] = useTransition();
  const nominal = Number(jumlah || 0);

  return (
    <section className="flex flex-col gap-3 kartu p-5">
      <h2 className="eyebrow">Finance</h2>
      <PilihanChip
        label="Jenis"
        nilai={jenis}
        onPilih={(v) => setJenis(v as typeof jenis)}
        pilihan={[
          { nilai: "topup", label: "Dana ditransfer ke pemegang" },
          { nilai: "pengembalian", label: "Sisa dikembalikan" },
        ]}
      />
      {jenis === "topup" && pr.length ? (
        <div className="flex flex-col gap-1.5">
          <Label>Untuk PR yang sudah disetujui (opsional)</Label>
          <PilihanChip
            kecil
            label="PR"
            nilai={prPilih}
            onPilih={(v) => {
              const p = pr.find((x) => x.id === v);
              setPrPilih(v === prPilih ? "" : v);
              if (p && v !== prPilih) {
                setJumlah(String(p.jumlah));
                const o = pemegang.find((x) => x.id === p.pemegang);
                if (o) setOrang(o);
              }
            }}
            pilihan={pr.map((p) => ({ nilai: p.id, label: p.label }))}
          />
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
        <div className="flex flex-col gap-1.5">
          <Label>Pemegang uang muka</Label>
          <PilihCari nilai={orang} pilihan={pemegang} onPilih={setOrang} placeholder="Cari nama, mis. Pak Sur" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nominal-dana">Nominal</Label>
          <IsianRupiah id="nominal-dana" value={jumlah} onChange={(teks) => setJumlah(teks.replace(/\D/g, ""))} className="text-right font-mono" placeholder="0" />
        </div>
      </div>
      <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (mis. transfer BCA 19 Okt)" aria-label="Catatan dana" />
      {jenis === "topup" ? <FotoNota jalur={bukti} onUbah={setBukti} maks={1} label="Bukti transfer" /> : null}
      <div className="flex justify-end">
        <Button
          disabled={menunggu || !orang || nominal <= 0}
          onClick={() =>
            mulai(async () => {
              try {
                const isi = { pemegang: orang!.id, jumlah: nominal, prId: jenis === "topup" ? prPilih || null : null, catatan, bukti: bukti[0] ?? null };
                await (jenis === "topup" ? catatTopup(isi) : catatPengembalian(isi));
                toast.success(jenis === "topup" ? "Dana masuk tercatat." : "Pengembalian tercatat.");
                setJumlah("");
                setCatatan("");
                setPrPilih("");
                setBukti([]);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Gagal.");
              }
            })
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Simpan
        </Button>
      </div>
    </section>
  );
}
