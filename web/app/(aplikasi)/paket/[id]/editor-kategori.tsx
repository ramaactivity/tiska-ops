"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { InputSaran } from "@/components/input-saran";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { simpanKategori } from "../actions";

type Opsi = { nama: string; hargaTambahan: number | null };
type Kategori = { kunci: number; label: string; pilih: number; tambahan: boolean; opsi: Opsi[] };

const ATURAN = [
  { nilai: "0", label: "Termasuk semua" },
  { nilai: "1", label: "Pilih 1" },
  { nilai: "2", label: "Pilih 2" },
  { nilai: "3", label: "Pilih 3" },
  { nilai: "4", label: "Pilih 4" },
  { nilai: "tambahan", label: "Menu tambahan (berbayar)" },
];

/**
 * Penyunting kategori paket pilihan (D-084): nama kategori, aturan pilih,
 * daftar pilihan menu (ketik bebas atau dari master Menu), urutan. Disimpan
 * utuh sekali tekan; quotation lama tidak berubah.
 */
export function EditorKategori({ id, awal, saranMenu }: { id: string; awal: Omit<Kategori, "kunci">[]; saranMenu: string[] }) {
  const urut = useRef(awal.length);
  const [kategori, setKategori] = useState<Kategori[]>(awal.map((k, i) => ({ ...k, kunci: i })));
  const [baru, setBaru] = useState<Record<number, string>>({});
  const [menyimpan, mulai] = useTransition();

  const ubah = (kunci: number, perubahan: Partial<Kategori>) => setKategori((l) => l.map((k) => (k.kunci === kunci ? { ...k, ...perubahan } : k)));
  const pindah = (i: number, arah: -1 | 1) =>
    setKategori((l) => {
      const b = [...l];
      [b[i], b[i + arah]] = [b[i + arah], b[i]];
      return b;
    });
  const tambahOpsi = (k: Kategori) => {
    const nama = (baru[k.kunci] ?? "").trim();
    if (!nama || k.opsi.some((o) => o.nama.toLowerCase() === nama.toLowerCase())) return;
    ubah(k.kunci, { opsi: [...k.opsi, { nama, hargaTambahan: null }] });
    setBaru((b) => ({ ...b, [k.kunci]: "" }));
  };

  return (
    <div className="flex flex-col gap-4">
      {kategori.map((k, i) => (
        <div key={k.kunci} className="flex flex-col gap-3 rounded-[12px] border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={k.label}
              onChange={(e) => ubah(k.kunci, { label: e.target.value.replace(/:/g, " -") })}
              placeholder="Nama kategori, mis. Soup"
              aria-label={`Nama kategori ${i + 1}`}
              className="h-9 min-w-40 flex-1 font-medium"
            />
            <Button type="button" variant="ghost" size="icon" className="size-9" disabled={i === 0} onClick={() => pindah(i, -1)} aria-label="Pindah ke atas">
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-9" disabled={i === kategori.length - 1} onClick={() => pindah(i, 1)} aria-label="Pindah ke bawah">
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={() => setKategori((l) => l.filter((x) => x.kunci !== k.kunci))} aria-label={`Hapus kategori ${k.label}`}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <PilihanChip
            kecil
            label={`Aturan ${k.label}`}
            pilihan={ATURAN}
            nilai={k.tambahan ? "tambahan" : String(Math.min(k.pilih, 4))}
            onPilih={(v) => ubah(k.kunci, v === "tambahan" ? { tambahan: true, pilih: 0 } : { tambahan: false, pilih: Number(v) })}
          />
          <div className="flex flex-wrap gap-1.5">
            {k.opsi.map((o, j) => (
              <span key={o.nama} className="inline-flex min-h-8 items-center gap-1 rounded-full border bg-muted/40 pr-1 pl-3 text-[0.8125rem]">
                {o.nama}
                {k.tambahan ? (
                  <Input
                    value={o.hargaTambahan ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ""));
                      ubah(k.kunci, { opsi: k.opsi.map((x, m) => (m === j ? { ...x, hargaTambahan: n || null } : x)) });
                    }}
                    inputMode="numeric"
                    placeholder="+harga"
                    aria-label={`Harga tambahan ${o.nama}`}
                    className="ml-1 h-6 w-20 rounded-full px-2 text-xs"
                  />
                ) : null}
                <button type="button" onClick={() => ubah(k.kunci, { opsi: k.opsi.filter((_, m) => m !== j) })} className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-destructive" aria-label={`Hapus ${o.nama}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div
            className="flex gap-2"
            onKeyDown={(e) => {
              // Enter yang dipakai memilih saran (sudah ditangani InputSaran) tidak ikut menambah teks setengah jadi.
              if (e.key === "Enter" && !e.defaultPrevented) {
                e.preventDefault();
                tambahOpsi(k);
              }
            }}
          >
            <div className="min-w-0 flex-1">
              <InputSaran value={baru[k.kunci] ?? ""} onChange={(v) => setBaru((b) => ({ ...b, [k.kunci]: v }))} saran={(baru[k.kunci] ?? "").trim() ? saranMenu : []} placeholder="Tambah pilihan menu… (Enter)" aria-label={`Tambah pilihan ${k.label}`} />
            </div>
            <Button type="button" variant="outline" className="bg-card" onClick={() => tambahOpsi(k)}>
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full bg-card"
          onClick={() => setKategori((l) => [...l, { kunci: urut.current++, label: "", pilih: 1, tambahan: false, opsi: [] }])}
        >
          <Plus className="size-4" />
          Tambah kategori
        </Button>
        <Button
          type="button"
          className="rounded-full px-5"
          disabled={menyimpan}
          onClick={() =>
            mulai(async () => {
              const h = await simpanKategori(
                id,
                kategori.map(({ label, pilih, tambahan, opsi }) => ({ label, pilih, tambahan, opsi })),
              );
              if (h.sukses) toast.success(h.pesan);
              else toast.error(h.pesan);
            })
          }
        >
          {menyimpan ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {menyimpan ? "Menyimpan…" : "Simpan kategori"}
        </Button>
      </div>
    </div>
  );
}
