"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { STATUS_KERJA } from "@/lib/hitung/honor";
import { rupiah } from "@/lib/uang";

import { FotoNota } from "../uang-muka/foto-nota";
import { aturStatusKerja, kembalikanAbsen, kunciHonor, simpanTarif, tandaiDibayar } from "./actions";

type Baris = {
  id: string;
  nama: string;
  peran: string;
  statusKerja: string;
  hadir: boolean | null;
  jam: string;
  hp: string | null;
  fee: number | null;
  catatan: string;
  dibayar: string | null;
  bukti: string | null;
};

const rp = (t: string) => (t ? Number(t).toLocaleString("id-ID") : "");
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

function jalan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, ok: string) {
  mulai(async () => {
    try {
      await kerja();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

function Keterangan({ b }: { b: Baris }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium">{b.nama}</p>
      <p className="text-xs text-muted-foreground">
        {[b.peran, b.statusKerja, b.hadir === false ? "tidak hadir" : b.jam || "hadir", b.hp].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

/** Finance mengunci fee satu kloter. Usulan dari tarif; kosong = tarif belum diisi. */
export function KunciKloter({ idKloter, baris }: { idKloter: string; baris: Baris[] }) {
  const [fee, setFee] = useState<Record<string, string>>(() => Object.fromEntries(baris.map((b) => [b.id, b.fee != null ? String(b.fee) : ""])));
  const [catatan, setCatatan] = useState<Record<string, string>>(() => Object.fromEntries(baris.map((b) => [b.id, b.catatan])));
  const [menunggu, mulai] = useTransition();
  const kosong = baris.filter((b) => fee[b.id] === "");
  return (
    <div>
      <ul className="divide-y">
        {baris.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 p-4">
            <Keterangan b={b} />
            <Input value={catatan[b.id]} onChange={(e) => setCatatan({ ...catatan, [b.id]: e.target.value })} placeholder="Catatan (lembur…)" className="w-44" aria-label={`Catatan fee ${b.nama}`} />
            <Input
              value={rp(fee[b.id])}
              inputMode="numeric"
              onChange={(e) => setFee({ ...fee, [b.id]: e.target.value.replace(/\D/g, "") })}
              placeholder="tarif belum ada"
              className="w-36 text-right font-mono tabular-nums"
              aria-label={`Fee ${b.nama}`}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4">
        {kosong.length ? <span className="mr-auto text-sm text-perhatian">{kosong.length} fee belum diisi (tarif belum ada).</span> : null}
        <Button variant="outline" disabled={menunggu} onClick={() => jalan(mulai, () => kembalikanAbsen(idKloter), "Dikembalikan ke captain.")}>
          Kembalikan ke captain
        </Button>
        <Button
          disabled={menunggu || kosong.length > 0}
          onClick={() => jalan(mulai, () => kunciHonor(idKloter, baris.map((b) => ({ id: b.id, fee: Number(fee[b.id]), catatan: catatan[b.id] }))), "Honor dikunci.")}
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Kunci fee
        </Button>
      </div>
    </div>
  );
}

/** Tandai dibayar (pilih orangnya — DW biasanya ditransfer satu-satu). */
export function BayarKloter({ baris, bisaBayar }: { baris: Baris[]; bisaBayar: boolean }) {
  // Semua tercentang, termasuk fee 0 (tidak hadir) — kalau tidak, barisnya tertinggal selamanya di "Belum dibayar".
  const [pilih, setPilih] = useState<string[]>(() => baris.map((b) => b.id));
  const [tanggal, setTanggal] = useState(hariIni);
  const [bukti, setBukti] = useState<string[]>([]);
  const [menunggu, mulai] = useTransition();
  return (
    <div>
      <ul className="divide-y">
        {baris.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
            {bisaBayar ? (
              <Checkbox
                checked={pilih.includes(b.id)}
                onCheckedChange={(c) => setPilih((s) => (c ? [...s, b.id] : s.filter((x) => x !== b.id)))}
                aria-label={`Pilih ${b.nama}`}
              />
            ) : null}
            <Keterangan b={b} />
            {b.dibayar ? (
              <span className="text-xs text-muted-foreground">
                dibayar {b.dibayar}
                {b.bukti ? (
                  <a href={b.bukti} target="_blank" rel="noreferrer" className="ml-2 text-primary underline">
                    bukti
                  </a>
                ) : null}
              </span>
            ) : null}
            <span className="w-32 text-right font-mono tabular-nums">{rupiah(b.fee ?? 0)}</span>
          </li>
        ))}
      </ul>
      {bisaBayar ? (
        <div className="flex flex-wrap items-end gap-2 border-t p-4">
          <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} className="w-48" aria-label="Tanggal transfer" />
          <FotoNota jalur={bukti} onUbah={setBukti} maks={1} label="Bukti transfer" />
          <span className="ml-auto font-mono text-sm tabular-nums">{rupiah(baris.filter((b) => pilih.includes(b.id)).reduce((s, b) => s + (b.fee ?? 0), 0))}</span>
          <Button
            disabled={menunggu || !pilih.length}
            onClick={() =>
              jalan(
                mulai,
                async () => {
                  await tandaiDibayar(pilih, tanggal, bukti[0] ?? null);
                  setBukti([]);
                },
                "Ditandai sudah dibayar.",
              )
            }
          >
            Tandai sudah dibayar ({pilih.length})
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Wizard tarif: peran tugas × status kerja. Kosong = belum ada (Finance mengisi fee manual). */
export function FormTarif({ peran, tarif }: { peran: { kunci: string; label: string }[]; tarif: { peran: string; status: string; jumlah: number }[] }) {
  const kunci = (p: string, s: string) => `${p}|${s}`;
  const [nilai, setNilai] = useState<Record<string, string>>(() => Object.fromEntries(tarif.map((t) => [kunci(t.peran, t.status), String(t.jumlah)])));
  const [menunggu, mulai] = useTransition();
  return (
    <section className="kartu">
      <h2 className="eyebrow border-b p-4">Tarif honor per event</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Peran</th>
              <th className="p-3 text-right font-medium">{STATUS_KERJA.tetap}</th>
              <th className="p-3 text-right font-medium">{STATUS_KERJA.freelance}</th>
            </tr>
          </thead>
          <tbody>
            {peran.map((p) => (
              <tr key={p.kunci} className="border-b last:border-b-0">
                <td className="p-3">{p.label}</td>
                {(["tetap", "freelance"] as const).map((s) => (
                  <td key={s} className="p-2 text-right">
                    <Input
                      value={rp(nilai[kunci(p.kunci, s)] ?? "")}
                      inputMode="numeric"
                      onChange={(e) => setNilai({ ...nilai, [kunci(p.kunci, s)]: e.target.value.replace(/\D/g, "") })}
                      placeholder="—"
                      className="ml-auto w-36 text-right font-mono tabular-nums"
                      aria-label={`Tarif ${p.label} ${s}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t p-4">
        <Button
          disabled={menunggu}
          onClick={() =>
            jalan(
              mulai,
              () =>
                simpanTarif(
                  peran.flatMap((p) =>
                    (["tetap", "freelance"] as const).map((s) => {
                      const v = nilai[kunci(p.kunci, s)] ?? "";
                      return { peran: p.kunci, status: s, jumlah: v === "" ? null : Number(v) };
                    }),
                  ),
                ),
              "Tarif tersimpan.",
            )
          }
        >
          Simpan tarif
        </Button>
      </div>
    </section>
  );
}

export function PilihStatusKerja({ id, status }: { id: string; status: "tetap" | "freelance" }) {
  const [nilai, setNilai] = useState<string>(status);
  const [, mulai] = useTransition();
  return (
    <PilihanChip
      kecil
      label="Status kerja"
      nilai={nilai}
      onPilih={(v) => {
        setNilai(v);
        jalan(mulai, () => aturStatusKerja(id, v as "tetap"), "Status kerja tersimpan.");
      }}
      pilihan={[
        { nilai: "tetap", label: STATUS_KERJA.tetap },
        { nilai: "freelance", label: STATUS_KERJA.freelance },
      ]}
    />
  );
}
