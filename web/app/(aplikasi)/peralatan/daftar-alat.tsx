"use client";

import { Check, LoaderCircle, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { IsianRupiah } from "@/components/isian-rupiah";
import type { KATEGORI_ALAT } from "@/lib/hitung/peralatan";
import { rupiah } from "@/lib/uang";

import { hitungAlat, simpanAlat } from "./actions";

type Kategori = (typeof KATEGORI_ALAT)[number];
type Alat = {
  id: string;
  kategori: string;
  nama: string;
  satuan: string;
  milik: number | null;
  rusak: number;
  diLuar: number;
  hargaSewa: number | null;
  hargaGanti: number | null;
  /** Disewakan ke klien (D-209). */
  disewakan: boolean;
  catatan: string;
  aktif: boolean;
  dihitung: string | null;
};

const angkaBulat = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(/\D/g, "")));

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

function BarisAlat({ a, bolehHarga }: { a: Alat; bolehHarga: boolean }) {
  const [milik, setMilik] = useState(a.milik?.toString() ?? "");
  const [rusak, setRusak] = useState(a.rusak.toString());
  const [catatan, setCatatan] = useState(a.catatan);
  const [sewa, setSewa] = useState(a.hargaSewa?.toString() ?? "");
  const [ganti, setGanti] = useState(a.hargaGanti?.toString() ?? "");
  const [disewakan, setDisewakan] = useState(a.disewakan);
  const [menunggu, mulai] = useTransition();
  const ubahHitung = milik !== (a.milik?.toString() ?? "") || rusak !== a.rusak.toString() || catatan !== a.catatan;
  const ubahHarga = sewa !== (a.hargaSewa?.toString() ?? "") || ganti !== (a.hargaGanti?.toString() ?? "") || disewakan !== a.disewakan;
  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {a.nama} {!a.aktif ? <span className="text-xs text-muted-foreground">(nonaktif)</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {a.milik === null ? "Belum dihitung" : `Siap pakai ${Math.max(0, a.milik - a.rusak - a.diLuar)} ${a.satuan}${a.diLuar ? ` · ${a.diLuar} sedang di event` : ""}`}
            {a.dihitung ? ` · dihitung ${a.dihitung}` : ""}
            {!bolehHarga && a.hargaSewa ? ` · sewa ${rupiah(a.hargaSewa)}/${a.satuan}` : ""}
          </p>
        </div>
        {a.milik !== null ? <Check className="size-4 text-lunas" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Milik
          <Input value={milik} inputMode="numeric" onChange={(e) => setMilik(e.target.value.replace(/\D/g, ""))} className="w-20 text-right font-mono tabular-nums" aria-label={`Jumlah milik ${a.nama}`} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Rusak
          <Input value={rusak} inputMode="numeric" onChange={(e) => setRusak(e.target.value.replace(/\D/g, ""))} className="w-16 text-right font-mono tabular-nums" aria-label={`Jumlah rusak ${a.nama}`} />
        </label>
        <span className="text-sm text-muted-foreground">{a.satuan}</span>
        <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan, mis. rak B2" className="min-w-36 flex-1" aria-label={`Catatan ${a.nama}`} />
        <Button
          size="sm"
          disabled={menunggu || !ubahHitung || !(angkaBulat(milik) >= 0)}
          onClick={() => jalankan(mulai, () => hitungAlat(a.id, angkaBulat(milik), angkaBulat(rusak) || 0, catatan), `${a.nama} tersimpan.`)}
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Simpan hitung
        </Button>
      </div>
      {bolehHarga ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Sewa ke klien
          <IsianRupiah value={sewa} onChange={(t) => setSewa(t.replace(/\D/g, ""))} className="w-36 text-right font-mono" aria-label={`Harga sewa ${a.nama}`} />
          Ganti rugi (lost & breakable)
          <IsianRupiah value={ganti} onChange={(t) => setGanti(t.replace(/\D/g, ""))} placeholder="belum ada" className="w-36 text-right font-mono" aria-label={`Harga ganti ${a.nama}`} />
          {/* D-209: tampil di section Sewa alat quotation/invoice. */}
          <label className="flex cursor-pointer items-center gap-1.5">
            <Checkbox checked={disewakan} onCheckedChange={(v) => setDisewakan(v === true)} aria-label={`Disewakan ke klien ${a.nama}`} />
            Disewakan ke klien
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={menunggu || !ubahHarga}
            onClick={() =>
              jalankan(
                mulai,
                () =>
                  simpanAlat({
                    id: a.id,
                    kategori: a.kategori as Kategori,
                    nama: a.nama,
                    satuan: a.satuan,
                    hargaSewa: sewa ? Number(sewa) : null,
                    hargaGanti: ganti ? Number(ganti) : null,
                    aktif: a.aktif,
                    disewakan,
                  }),
                "Harga tersimpan.",
              )
            }
          >
            Simpan harga
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function TambahAlat({ kategori }: { kategori: string }) {
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("pc");
  const [menunggu, mulai] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t p-4">
      <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder={`Alat lain di ${kategori}…`} className="min-w-0 flex-1" aria-label="Nama alat baru" />
      <Input value={satuan} onChange={(e) => setSatuan(e.target.value)} className="w-20" aria-label="Satuan alat baru" />
      <Button
        variant="outline"
        disabled={menunggu || nama.trim().length < 2}
        onClick={() =>
          jalankan(
            mulai,
            async () => {
              await simpanAlat({ id: null, kategori: kategori as Kategori, nama, satuan: satuan || "pc", hargaSewa: null, hargaGanti: null, aktif: true });
              setNama("");
            },
            "Alat ditambahkan.",
          )
        }
      >
        <Plus className="size-4" />
        Tambah
      </Button>
    </div>
  );
}

/** Wizard Hitung Awal: satu kategori dalam satu layar, progres per kategori. */
export function DaftarAlat({ kategori, alat, bolehHarga }: { kategori: string[]; alat: Alat[]; bolehHarga: boolean }) {
  const [aktif, setAktif] = useState(kategori.find((k) => alat.some((a) => a.kategori === k && a.milik === null)) ?? kategori[0]);
  const isi = alat.filter((a) => a.kategori === aktif);
  return (
    <div className="flex flex-col gap-4">
      <PilihanChip
        kecil
        label="Kategori alat"
        nilai={aktif}
        onPilih={setAktif}
        pilihan={kategori.map((k) => {
          const semua = alat.filter((a) => a.kategori === k);
          const sudah = semua.filter((a) => a.milik !== null).length;
          return { nilai: k, label: `${k} ${semua.length ? `${sudah}/${semua.length}` : ""}`.trim() };
        })}
      />
      <section className="kartu">
        <h2 className="eyebrow border-b p-4">{aktif}</h2>
        {!isi.length ? <p className="p-4 text-sm text-muted-foreground">Belum ada alat di kategori ini. Tambahkan di bawah.</p> : null}
        <ul className="divide-y">
          {isi.map((a) => (
            <BarisAlat key={a.id} a={a} bolehHarga={bolehHarga} />
          ))}
        </ul>
        <TambahAlat kategori={aktif} />
      </section>
    </div>
  );
}
