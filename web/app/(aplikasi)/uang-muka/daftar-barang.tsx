"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nilaiBarisNota } from "@/lib/hitung/uang-muka";
import { rupiah } from "@/lib/uang";

/* Daftar barang Jumlah × Harga = Total (pola Google Sheets tim) — dipakai nota
   belanja pasar (D-081) dan PO supplier (D-083). */

export type Barang = { prItemId: string | null; idBahan: string | null; nama: string; qty: number; satuan: string };
export type Baris = Omit<Barang, "qty"> & { kunci: string; qty: string; harga: string };

// "1,5" (kebiasaan Indonesia) dan "1.5" sama-sama diterima.
export const keAngka = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));
const tampilQty = (n: number) => String(n).replace(".", ",");
export const keBaris = (b: Barang): Baris => ({ ...b, kunci: crypto.randomUUID(), qty: tampilQty(b.qty), harga: "" });

export function DaftarBarang({
  baris,
  setBaris,
  bahan,
  kosong,
}: {
  baris: Baris[];
  setBaris: (f: (s: Baris[]) => Baris[]) => void;
  bahan: OpsiCari[];
  kosong: string;
}) {
  const [lain, setLain] = useState({ nama: "", satuan: "" });
  const ganti = (kunci: string, isi: Partial<Baris>) => setBaris((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)));
  return (
    <section className="rounded-[14px] border bg-card">
      <h2 className="eyebrow border-b p-4">Barang · {baris.length}</h2>
      {!baris.length ? <p className="p-4 text-sm text-muted-foreground">{kosong}</p> : null}
      <ul className="divide-y">
        {baris.map((b) => {
          const q = keAngka(b.qty);
          const h = keAngka(b.harga);
          return (
            <li key={b.kunci} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{b.nama}</p>
                <Button variant="ghost" size="icon" aria-label={`Hapus ${b.nama}`} onClick={() => setBaris((s) => s.filter((x) => x.kunci !== b.kunci))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input value={b.qty} inputMode="decimal" onChange={(e) => ganti(b.kunci, { qty: e.target.value })} className="w-20 text-right font-mono tabular-nums" aria-label={`Jumlah ${b.nama}`} />
                <Input value={b.satuan} onChange={(e) => ganti(b.kunci, { satuan: e.target.value })} className="w-24" placeholder="satuan" aria-label={`Satuan ${b.nama}`} />
                <span className="text-muted-foreground">×</span>
                <Input
                  value={b.harga ? Number(b.harga).toLocaleString("id-ID") : ""}
                  inputMode="numeric"
                  onChange={(e) => ganti(b.kunci, { harga: e.target.value.replace(/\D/g, "") })}
                  className="w-32 text-right font-mono tabular-nums"
                  placeholder="Harga"
                  aria-label={`Harga ${b.nama}`}
                />
                <span className="ml-auto font-mono tabular-nums">= {q > 0 && h >= 0 ? rupiah(nilaiBarisNota(q, h)) : "—"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t p-4">
        <PilihCari pilihan={bahan} placeholder="+ Tambah bahan dari master…" onPilih={(p) => setBaris((s) => [...s, keBaris({ prItemId: null, idBahan: p.id, nama: p.label, qty: 1, satuan: p.sub?.split(" · ").at(-1) ?? "" })])} />
        <div className="flex flex-wrap gap-2">
          <Input value={lain.nama} onChange={(e) => setLain({ ...lain, nama: e.target.value })} placeholder="Barang lain (gas, es batu, …)" className="min-w-0 basis-full sm:flex-1 sm:basis-auto" aria-label="Nama barang lain" />
          <Input value={lain.satuan} onChange={(e) => setLain({ ...lain, satuan: e.target.value })} placeholder="Satuan" className="min-w-0 flex-1 sm:w-24 sm:flex-none" aria-label="Satuan barang lain" />
          <Button
            variant="outline"
            disabled={!lain.nama.trim()}
            onClick={() => {
              setBaris((s) => [...s, keBaris({ prItemId: null, idBahan: null, nama: lain.nama.trim(), qty: 1, satuan: lain.satuan.trim() })]);
              setLain({ nama: "", satuan: "" });
            }}
          >
            <Plus className="size-4" />
            Tambah
          </Button>
        </div>
      </div>
    </section>
  );
}
