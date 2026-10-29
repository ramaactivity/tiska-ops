"use client";

import { LoaderCircle, Plus, Send, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { PilihCari } from "@/components/pilih-cari";
import { PilihJam } from "@/components/pilih-jam";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { jenisHari, peringatanPaket } from "@/lib/hitung/ikut-menu-pesta";
import type { MenuAcara } from "@/lib/ikut-menu-pesta";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { type InputProgram, simpanProgram } from "./actions";

type Isi = { idMenu: string | null; nama: string; dariAcara: boolean; kategori: string | null };
type Paket = { judul: string; isi: Isi[] };
export type AwalProgram = {
  idProgram: string | null;
  tanggalKirim: string;
  batasTanggal: string;
  batasJam: string;
  minPax: number;
  maksPax: number | null;
  area: string;
  kontak: string;
  catatan: string;
  paket: Paket[];
};

const MAKS_PAKET = 4;
const angka = (t: string) => (t.trim() === "" ? null : Number(t.replace(/\D/g, "")) || null);

export function FormProgram({
  acara,
  menuAcara,
  menuLain,
  harga,
  awal,
}: {
  acara: { id: string; pelanggan: string; nama: string; tanggal: string | null; batal: boolean };
  menuAcara: MenuAcara[];
  menuLain: { id: string; nama: string; kategori: string | null; label: string | null }[];
  harga: number;
  awal: AwalProgram;
}) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [f, setF] = useState(awal);
  const [minPax, setMinPax] = useState(String(awal.minPax));
  const [maksPax, setMaksPax] = useState(awal.maksPax ? String(awal.maksPax) : "");
  const ubah = <K extends keyof AwalProgram>(k: K, v: AwalProgram[K]) => setF((x) => ({ ...x, [k]: v }));
  const ubahPaket = (i: number, p: (x: Paket) => Paket) => setF((x) => ({ ...x, paket: x.paket.map((y, j) => (j === i ? p(y) : y)) }));
  const opsiLain = menuLain.map((m) => ({ id: m.id, label: m.nama, sub: m.label ?? undefined }));
  const kategoriLain = new Map(menuLain.map((m) => [m.id, m.kategori]));

  const kirim = () =>
    mulai(async () => {
      const input: InputProgram = {
        idProgram: f.idProgram,
        idEvent: acara.id,
        tanggalKirim: f.tanggalKirim,
        batasTanggal: f.batasTanggal,
        batasJam: f.batasJam,
        minPax: angka(minPax) ?? 0,
        maksPax: angka(maksPax),
        area: f.area,
        kontak: f.kontak,
        catatan: f.catatan,
        paket: f.paket.map((p) => ({ judul: p.judul, isi: p.isi.map(({ idMenu, nama, dariAcara }) => ({ idMenu, nama, dariAcara })) })),
      };
      const r = await simpanProgram(input);
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      toast.success("Usulan terkirim ke Finance untuk cek HPP.");
      router.push(`/ikut-menu-pesta/${r.id}`);
    });

  return (
    <div className="flex flex-col gap-3.5">
      <BagianForm nomor={1} judul="Acara induk & jadwal" keterangan="Menu dimasak bersama acara ini. Harga mengikuti Angka Bisnis, belum termasuk PBJT.">
        <div className="rounded-[12px] bg-secondary/50 px-4 py-3">
          <p className="font-semibold">{acara.pelanggan}</p>
          <p className="text-sm text-muted-foreground">{[acara.tanggal, acara.nama].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tanggal kirim</Label>
            <PilihTanggal value={f.tanggalKirim} onChange={(v) => ubah("tanggalKirim", v)} aria-label="Tanggal kirim" />
            {f.tanggalKirim ? <p className="text-sm text-muted-foreground">Program {jenisHari(f.tanggalKirim)}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Batas order — tanggal</Label>
            <PilihTanggal value={f.batasTanggal} onChange={(v) => ubah("batasTanggal", v)} aria-label="Tanggal batas order" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Batas order — jam (WIB)</Label>
            <PilihJam value={f.batasJam} onChange={(v) => ubah("batasJam", v)} aria-label="Jam batas order" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>Harga per pax</Label>
            <p className="flex h-10 items-center font-mono font-semibold">{rupiah(harga)}</p>
            <p className="text-sm text-muted-foreground">+ PBJT, dari Angka Bisnis</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="min-pax">Minimal order (pax)</Label>
            <Input id="min-pax" inputMode="numeric" value={minPax} onChange={(e) => setMinPax(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maks-pax">Kuota maksimal (pax)</Label>
            <Input id="maks-pax" inputMode="numeric" placeholder="Tanpa batas" value={maksPax} onChange={(e) => setMaksPax(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area">Area gratis kirim</Label>
            <Input id="area" value={f.area} onChange={(e) => ubah("area", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kontak">Kontak pemesanan (untuk flyer)</Label>
            <Input id="kontak" placeholder="Admin +62 813-… (Ida)" value={f.kontak} onChange={(e) => ubah("kontak", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catatan">Catatan untuk Finance (opsional)</Label>
            <Textarea id="catatan" className="min-h-10" value={f.catatan} onChange={(e) => ubah("catatan", e.target.value)} />
          </div>
        </div>
      </BagianForm>

      <BagianForm
        nomor={2}
        judul="Paket retail"
        keterangan="Pola: 2 protein + 1 sayur, dengan nasi olahan atau tanpa nasi. Nasi putih tidak ditawarkan. Menu di luar acara boleh, ditandai."
      >
        {menuAcara.length === 0 ? (
          <p className="text-sm text-perhatian">Isi menu acara ini belum terbaca. Tambahkan menu lewat pencarian di tiap paket.</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {f.paket.map((p, i) => {
            const dipilih = new Set(p.isi.map((x) => x.nama));
            const peringatan = peringatanPaket(p.isi.map((x) => ({ nama: x.nama, kategori: x.kategori })));
            return (
              <div key={i} className="flex min-w-0 flex-col gap-3 rounded-[14px] border p-4">
                <div className="flex items-center gap-2">
                  <Input aria-label={`Judul paket ${i + 1}`} className="font-semibold" value={p.judul} onChange={(e) => ubahPaket(i, (x) => ({ ...x, judul: e.target.value }))} />
                  {f.paket.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus paket ${i + 1}`}
                      onClick={() => setF((x) => ({ ...x, paket: x.paket.filter((_, j) => j !== i) }))}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div>
                  <p className="pb-1.5 text-sm font-medium">Menu dari acara</p>
                  <div className="flex flex-wrap gap-1.5">
                    {menuAcara.map((m) => {
                      const aktif = dipilih.has(m.nama);
                      return (
                        <button
                          key={m.nama}
                          type="button"
                          aria-pressed={aktif}
                          onClick={() =>
                            ubahPaket(i, (x) => ({
                              ...x,
                              isi: aktif ? x.isi.filter((y) => y.nama !== m.nama) : [...x.isi, { idMenu: m.idMenu, nama: m.nama, dariAcara: true, kategori: m.kategori }],
                            }))
                          }
                          className={cn(
                            "min-h-9 rounded-full border px-3.5 text-sm transition-colors",
                            aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent",
                          )}
                        >
                          {m.nama}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="pb-1.5 text-sm font-medium">Tambah menu lain</p>
                  <PilihCari
                    pilihan={opsiLain.filter((o) => !dipilih.has(o.label))}
                    placeholder="Ketik nama menu, mis. Keripik Kentang"
                    onPilih={(o) => ubahPaket(i, (x) => ({ ...x, isi: [...x.isi, { idMenu: o.id, nama: o.label, dariAcara: false, kategori: kategoriLain.get(o.id) ?? null }] }))}
                  />
                </div>

                {p.isi.length ? (
                  <ol className="flex flex-col gap-1 rounded-[12px] bg-muted/40 p-3">
                    {p.isi.map((x, j) => (
                      <li key={x.nama} className="flex items-center gap-2 text-[0.9375rem]">
                        <span className="w-5 font-mono text-sm text-muted-foreground">{j + 1}.</span>
                        <span className="min-w-0 flex-1">
                          {x.nama}
                          {!x.dariAcara ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">bukan masakan acara</span> : null}
                        </span>
                        <button
                          type="button"
                          aria-label={`Keluarkan ${x.nama}`}
                          className="rounded-full p-1 text-muted-foreground hover:bg-accent"
                          onClick={() => ubahPaket(i, (y) => ({ ...y, isi: y.isi.filter((z) => z.nama !== x.nama) }))}
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {peringatan.length ? (
                  <p className="flex items-start gap-2 text-sm text-perhatian">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {peringatan.join(" ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {f.paket.length < MAKS_PAKET ? (
          <div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setF((x) => ({ ...x, paket: [...x.paket, { judul: `the Menu ${x.paket.length + 1}`, isi: [] }] }))}
            >
              <Plus className="size-4" />
              Tambah paket
            </Button>
          </div>
        ) : null}
      </BagianForm>

      <div className="flex justify-end">
        <Button type="button" size="lg" className="rounded-full" disabled={menunggu || acara.batal} onClick={kirim}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          {f.idProgram ? "Simpan & kirim ulang untuk cek HPP" : "Kirim untuk cek HPP"}
        </Button>
      </div>
    </div>
  );
}
