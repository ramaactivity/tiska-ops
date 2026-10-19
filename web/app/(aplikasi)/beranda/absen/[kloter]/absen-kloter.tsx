"use client";

import { LoaderCircle, Send, Trash2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PEKERJAAN_DW, rapikanJam } from "@/lib/hitung/honor";

import { catatAbsen, hapusDw, kirimAbsenKeFinance, tambahDw } from "../../../honor/actions";

type Anggota = { id: string; nama: string; peran: string; dw: boolean; hadir: boolean | null; datang: string; pulang: string };

function jalan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, ok?: string) {
  mulai(async () => {
    try {
      await kerja();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

/** Satu anggota: Hadir/Tidak (tombol besar) + jam datang–pulang, tersimpan langsung. */
function KartuAnggota({ a, kunci }: { a: Anggota; kunci: boolean }) {
  const [hadir, setHadir] = useState(a.hadir);
  const [datang, setDatang] = useState(a.datang);
  const [pulang, setPulang] = useState(a.pulang);
  const [menunggu, mulai] = useTransition();
  const simpan = (h: boolean | null, d = datang, p = pulang) => jalan(mulai, () => catatAbsen(a.id, { hadir: h, datang: d, pulang: p }));
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{a.nama}</p>
          <p className="text-sm text-muted-foreground">{a.peran}</p>
        </div>
        {menunggu ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" /> : null}
        {a.dw && !kunci ? (
          <Button variant="ghost" size="icon" aria-label={`Hapus ${a.nama}`} onClick={() => jalan(mulai, () => hapusDw(a.id), "Dihapus.")}>
            <Trash2 className="size-5" />
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          [true, "✅ Hadir"],
          [false, "❌ Tidak hadir"],
        ].map(([v, label]) => (
          <button
            key={String(v)}
            type="button"
            disabled={kunci}
            aria-pressed={hadir === v}
            onClick={() => {
              setHadir(v as boolean);
              simpan(v as boolean);
            }}
            className={`min-h-12 rounded-xl border text-base font-medium ${hadir === v ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {label as string}
          </button>
        ))}
      </div>
      {hadir ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Jam datang
            <Input value={datang} disabled={kunci} inputMode="decimal" placeholder="07.30" onChange={(e) => setDatang(e.target.value)} onBlur={() => {
              const rapi = rapikanJam(datang) ?? datang;
              setDatang(rapi);
              if (rapi !== a.datang) simpan(hadir, rapi, pulang);
            }} className="h-12 text-center font-mono text-lg" aria-label={`Jam datang ${a.nama}`} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Jam pulang
            <Input value={pulang} disabled={kunci} inputMode="decimal" placeholder="15.00" onChange={(e) => setPulang(e.target.value)} onBlur={() => {
              const rapi = rapikanJam(pulang) ?? pulang;
              setPulang(rapi);
              if (rapi !== a.pulang) simpan(hadir, datang, rapi);
            }} className="h-12 text-center font-mono text-lg" aria-label={`Jam pulang ${a.nama}`} />
          </label>
        </div>
      ) : null}
    </li>
  );
}

export function AbsenKloter({ idKloter, anggota, terkirim, dwLama }: { idKloter: string; anggota: Anggota[]; terkirim: string | null; dwLama: OpsiCari[] }) {
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [kerja, setKerja] = useState<string>(PEKERJAAN_DW[0]);
  const [menunggu, mulai] = useTransition();
  const kunci = Boolean(terkirim);
  const belum = anggota.filter((a) => a.hadir === null).length;
  return (
    <div className="flex flex-col gap-4">
      {terkirim ? <p className="rounded-xl bg-lunas-halus p-3 text-sm text-lunas">Sudah dikirim ke Finance — {terkirim}.</p> : null}
      <ul className="flex flex-col gap-3">
        {anggota.map((a) => (
          <KartuAnggota key={a.id} a={a} kunci={kunci} />
        ))}
      </ul>
      {!kunci ? (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 font-semibold">
              <UserPlus className="size-5" />
              Tambah DW
            </p>
            {dwLama.length ? (
              <PilihCari
                pilihan={dwLama}
                placeholder="Pilih DW yang pernah ikut…"
                onPilih={(p) => {
                  const [n, h] = p.id.split("|");
                  setNama(n);
                  setHp(h);
                }}
              />
            ) : null}
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama DW" className="h-12 text-base" aria-label="Nama DW" />
            <Input value={hp} onChange={(e) => setHp(e.target.value)} placeholder="No. HP (untuk transfer)" inputMode="tel" className="h-12 text-base" aria-label="HP DW" />
            <PilihanChip label="Pekerjaan DW" nilai={kerja} onPilih={setKerja} pilihan={PEKERJAAN_DW.map((p) => ({ nilai: p, label: p }))} />
            <Button
              className="h-12 text-base"
              variant="outline"
              disabled={menunggu || nama.trim().length < 2}
              onClick={() =>
                jalan(
                  mulai,
                  async () => {
                    await tambahDw(idKloter, { nama, hp, pekerjaan: kerja as (typeof PEKERJAAN_DW)[number] });
                    setNama("");
                    setHp("");
                  },
                  "DW ditambahkan.",
                )
              }
            >
              Tambah DW
            </Button>
          </section>
          <Button className="h-14 text-lg" disabled={menunggu || belum > 0} onClick={() => jalan(mulai, () => kirimAbsenKeFinance(idKloter), "Terkirim ke Finance.")}>
            {menunggu ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
            {belum ? `Tandai ${belum} orang lagi dulu` : "Kirim ke Finance"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
