"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type KeadaanResep, simpanBahanResep } from "../actions";

/** Pilihan bahan untuk editor — TANPA harga (editor dipakai Kepala Dapur). */
export type PilihanBahan = { id: string; code: string; name: string; unit: string | null; pengganti: boolean };
type Baris = { kunci: number; bahanId: string; qty: string };

const awal: KeadaanResep = {};

export function EditorBahan({
  resepId,
  baris: barisAwal,
  pilihan,
}: {
  resepId: string;
  baris: { bahanId: string; qty: string }[];
  pilihan: PilihanBahan[];
}) {
  const urut = useRef(barisAwal.length);
  const [baris, setBaris] = useState<Baris[]>(barisAwal.map((b, i) => ({ kunci: i, ...b })));
  const [keadaan, kirim, sedang] = useActionState(simpanBahanResep, awal);
  const peta = useMemo(() => new Map(pilihan.map((p) => [p.id, p])), [pilihan]);

  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);

  const ubah = (kunci: number, isi: Partial<Baris>) =>
    setBaris((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)));

  return (
    <form action={kirim} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="id" value={resepId} />
      <input type="hidden" name="baris" value={JSON.stringify(baris.map(({ bahanId, qty }) => ({ bahanId, qty })))} />
      {keadaan.pesan && !keadaan.sukses ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {keadaan.pesan}
        </p>
      ) : null}

      <ol className="flex flex-col gap-2">
        {baris.map((b, i) => {
          const p = peta.get(b.bahanId);
          return (
            <li key={b.kunci} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 sm:flex-nowrap">
              <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <PilihBahan nilai={p} pilihan={pilihan} onPilih={(x) => ubah(b.kunci, { bahanId: x.id })} />
                {p?.pengganti ? (
                  <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
                    Bahan pengganti — ganti dengan bahan dari daftar
                  </span>
                ) : null}
              </div>
              <Input
                value={b.qty}
                onChange={(e) => ubah(b.kunci, { qty: e.target.value })}
                inputMode="decimal"
                aria-label={`Takaran baris ${i + 1}`}
                className="angka w-24 text-right tabular-nums"
                placeholder="0"
              />
              <span className="w-16 shrink-0 truncate text-xs text-muted-foreground">{p?.unit ?? ""}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Hapus baris ${i + 1}`}
                onClick={() => setBaris((s) => s.filter((x) => x.kunci !== b.kunci))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => setBaris((s) => [...s, { kunci: ++urut.current, bahanId: "", qty: "" }])}
        >
          <Plus className="size-4" /> Tambah bahan
        </Button>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : "Simpan isi resep"}
        </Button>
      </div>
    </form>
  );
}

/** Pencari bahan (pengganti <select> bawaan browser): ketik nama/kode, pilih dari daftar. */
function PilihBahan({
  nilai,
  pilihan,
  onPilih,
}: {
  nilai?: PilihanBahan;
  pilihan: PilihanBahan[];
  onPilih: (p: PilihanBahan) => void;
}) {
  const [teks, setTeks] = useState("");
  const [buka, setBuka] = useState(false);
  const cocok = useMemo(() => {
    const k = teks.trim().toLowerCase();
    if (!k) return [];
    return pilihan
      .filter((p) => !p.pengganti && (p.name.toLowerCase().includes(k) || p.code.toLowerCase().includes(k)))
      .slice(0, 8);
  }, [teks, pilihan]);

  return (
    <div className="relative">
      <Input
        value={buka ? teks : nilai ? `${nilai.name} · ${nilai.code}` : ""}
        onFocus={() => {
          setTeks("");
          setBuka(true);
        }}
        onBlur={() => setTimeout(() => setBuka(false), 150)}
        onChange={(e) => setTeks(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (cocok[0]) {
              onPilih(cocok[0]);
              setBuka(false);
              (e.target as HTMLInputElement).blur();
            }
          }
        }}
        placeholder="Ketik nama atau kode bahan…"
        role="combobox"
        aria-expanded={buka && cocok.length > 0}
        aria-autocomplete="list"
      />
      {buka && cocok.length > 0 ? (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
          {cocok.map((p) => (
            <li key={p.id} role="option" aria-selected={p.id === nilai?.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPilih(p);
                  setBuka(false);
                }}
                className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.code}
                  {p.unit ? ` · ${p.unit}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
