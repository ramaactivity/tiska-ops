"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AvatarOrang } from "@/components/avatar-orang";
import { PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uraiAvatar } from "@/lib/avatar";
import { BULAN, mendatang } from "@/lib/hitung/ulang-tahun";
import { cn } from "@/lib/utils";

import { hapusUlangTahun, simpanUlangTahun } from "./actions";

type Baris = {
  id: string;
  nama: string;
  hari: number;
  bulan: number;
  tahun: number | null;
  catatan: string;
  akun: { id: string; nama: string; username: string; avatar: string | null; gender: string | null } | null;
};
type Akun = { id: string; label: string; sub?: string; terpakai: boolean };

const BULAN_OPSI = BULAN.map((b, i) => ({ id: String(i + 1), label: b }));
const kapan = (lagi: number) => (lagi === 0 ? "Hari ini 🎉" : lagi === 1 ? "Besok" : `${lagi} hari lagi`);

function Wajah({ b, className }: { b: Baris; className: string }) {
  return b.akun ? (
    <AvatarOrang pilihan={uraiAvatar(b.akun.avatar, b.akun.username, b.akun.gender)} nama={b.nama} className={className} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary-strong", className)}>
      {b.nama.split(/\s+/).slice(0, 2).map((k) => k[0]?.toUpperCase()).join("")}
    </span>
  );
}

export function DaftarUlangTahun({ data, akun, hariIni }: { data: Baris[]; akun: Akun[]; hariIni: string }) {
  const [ubah, setUbah] = useState<Baris | null>(null);
  const segera = mendatang(data, hariIni, 30);
  const bulanIni = Number(hariIni.slice(5, 7));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[18px] border bg-card p-5">
        <h2 className="eyebrow pb-3">Segera · 30 hari ke depan</h2>
        {segera.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {segera.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setUbah(b)}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-muted/40", b.lagi === 0 && "border-perhatian-garis bg-perhatian-halus")}
                >
                  <Wajah b={b} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{b.nama}</span>
                    <span className="block text-sm text-muted-foreground">
                      {b.hari} {BULAN[b.bulan - 1]}
                      {b.tahun ? ` · ${new Date(Date.parse(`${hariIni}T00:00:00Z`) + b.lagi * 86_400_000).getUTCFullYear() - b.tahun} tahun` : ""}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", b.lagi === 0 ? "bg-perhatian text-white" : b.lagi <= 7 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {kapan(b.lagi)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada yang berulang tahun dalam 30 hari ke depan.</p>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BULAN.map((nama, i) => {
          const isi = data.filter((b) => b.bulan === i + 1);
          return (
            <section key={nama} className={cn("kartu p-4", i + 1 === bulanIni && "border-primary/40")}>
              <h3 className="flex items-baseline justify-between pb-2 text-sm font-semibold text-primary-strong">
                📅 {nama.toUpperCase()}
                <span className="font-mono text-xs text-muted-foreground">{isi.length || ""}</span>
              </h3>
              {isi.length ? (
                <ul className="flex flex-col">
                  {isi.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setUbah(b)} className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-muted/50">
                        <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">{String(b.hari).padStart(2, "0")}</span>
                        <Wajah b={b} className="size-7" />
                        <span className="min-w-0 flex-1 truncate text-sm">{b.nama}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1.5 text-sm text-muted-foreground">—</p>
              )}
            </section>
          );
        })}
      </div>

      {ubah ? <FormUlangTahun awal={ubah} akun={akun} tutup={() => setUbah(null)} /> : null}
    </div>
  );
}

export function TombolTambah({ akun }: { akun: Akun[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setBuka(true)}>
        <Plus className="size-4" />
        Tambah
      </Button>
      {buka ? <FormUlangTahun awal={null} akun={akun} tutup={() => setBuka(false)} /> : null}
    </>
  );
}

function FormUlangTahun({ awal, akun, tutup }: { awal: Baris | null; akun: Akun[]; tutup: () => void }) {
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [hari, setHari] = useState(awal ? String(awal.hari) : "");
  const [bulan, setBulan] = useState(awal ? String(awal.bulan) : "");
  const [tahun, setTahun] = useState(awal?.tahun ? String(awal.tahun) : "");
  const [idAkun, setIdAkun] = useState(awal?.akun?.id ?? "");
  const [catatan, setCatatan] = useState(awal?.catatan ?? "");
  const [yakinHapus, setYakinHapus] = useState(false);
  const [menunggu, mulai] = useTransition();
  const opsiAkun = [{ id: "", label: "Tanpa akun aplikasi" }, ...akun.filter((a) => !a.terpakai || a.id === awal?.akun?.id)];

  const jalan = (kerja: () => Promise<void>, pesan: string) =>
    mulai(async () => {
      try {
        await kerja();
        toast.success(pesan);
        tutup();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });

  return (
    <Dialog open onOpenChange={(b) => !b && tutup()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{awal ? "Ubah ulang tahun" : "Tambah ulang tahun"}</DialogTitle>
          <DialogDescription>Tahun lahir boleh dikosongkan.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ut-nama">Nama</Label>
            <Input id="ut-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Sukir Edi Setiyawan" />
          </div>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ut-hari">Tanggal</Label>
              <Input id="ut-hari" inputMode="numeric" value={hari} onChange={(e) => setHari(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="12" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ut-bulan">Bulan</Label>
              <PilihCari id="ut-bulan" semuaSaatKosong nilai={BULAN_OPSI.find((b) => b.id === bulan)} pilihan={BULAN_OPSI} onPilih={(b) => setBulan(b.id)} placeholder="Pilih bulan" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ut-tahun">Tahun</Label>
              <Input id="ut-tahun" inputMode="numeric" value={tahun} onChange={(e) => setTahun(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="opsional" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ut-akun">Akun aplikasi (kalau punya)</Label>
            <PilihCari
              id="ut-akun"
              semuaSaatKosong
              nilai={opsiAkun.find((a) => a.id === idAkun)}
              pilihan={opsiAkun}
              onPilih={(a) => {
                setIdAkun(a.id);
                if (a.id && !nama.trim()) setNama(a.label);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ut-catatan">Catatan</Label>
            <Input id="ut-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. suka kue lapis legit" />
          </div>
        </div>
        <DialogFooter className="mt-2 flex-wrap gap-2 sm:justify-between">
          {awal ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={menunggu}
              onClick={() => (yakinHapus ? jalan(() => hapusUlangTahun(awal.id), `${awal.nama} dihapus dari daftar.`) : setYakinHapus(true))}
            >
              <Trash2 className="size-4" />
              {yakinHapus ? "Yakin hapus?" : "Hapus"}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={menunggu}
            onClick={() =>
              jalan(
                () =>
                  simpanUlangTahun({
                    id: awal?.id ?? null,
                    nama,
                    hari: Number(hari),
                    bulan: Number(bulan),
                    tahun: tahun ? Number(tahun) : null,
                    akun: idAkun || null,
                    catatan,
                  }),
                `${nama.trim() || "Ulang tahun"} tersimpan.`,
              )
            }
          >
            {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
