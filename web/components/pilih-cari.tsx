"use client";

import { useMemo, useRef, useState } from "react";

import { Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { calonMirip, saringMirip } from "@/lib/cari-mirip";
import { cn } from "@/lib/utils";

export type OpsiCari = { id: string; label: string; sub?: string };

/**
 * Pencari pengganti <select> bawaan browser (DESIGN.md): ketik sebagian nama
 * atau kode, pilih dari maksimal 8 kecocokan, Enter memilih yang teratas.
 * Toleran salah ketik & urutan kata (lib/cari-mirip, D-122); tidak ada yang
 * cocok → "Mungkin maksudnya" berisi nama terdekat.
 * Daftar opsi disiapkan pemanggil — jangan pernah menaruh harga di dalamnya.
 */
export function PilihCari({
  nilai,
  pilihan,
  onPilih,
  placeholder = "Ketik untuk mencari…",
  semuaSaatKosong = false,
  autoFocus = false,
  id,
  onTulisBaru,
}: {
  nilai?: OpsiCari;
  pilihan: OpsiCari[];
  onPilih: (p: OpsiCari) => void;
  placeholder?: string;
  /** Daftar pendek (mis. menu sekategori): tampilkan semua sebelum mengetik. */
  semuaSaatKosong?: boolean;
  autoFocus?: boolean;
  /** Untuk <label htmlFor>. */
  id?: string;
  /** Jalan keluar terakhir (D-163): nama yang tidak ada di daftar baru boleh dipakai sesudah dicari dulu. */
  onTulisBaru?: (teks: string) => void;
}) {
  const [teks, setTeks] = useState("");
  const [buka, setBuka] = useState(false);
  const [sorot, setSorot] = useState(0);
  // Timer "tutup" dari blur sebelumnya harus dibatalkan saat kotak dibuka lagi —
  // kalau tidak, ia menutup daftar yang baru saja dibuka (race di HP/CI yang cepat).
  const tutup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batalTutup = () => {
    if (tutup.current) clearTimeout(tutup.current);
    tutup.current = null;
  };
  const { cocok, saran } = useMemo(() => {
    if (!teks.trim()) return { cocok: semuaSaatKosong ? pilihan : [], saran: false };
    const hasil = saringMirip(teks, pilihan, (p) => [p.label, p.sub], 8);
    if (hasil.length) return { cocok: hasil, saran: false };
    const dekat = calonMirip(teks, pilihan, (p) => p.label, 0.34, 5).map((c) => c.x);
    return { cocok: dekat, saran: dekat.length > 0 };
  }, [teks, pilihan, semuaSaatKosong]);
  const baru = teks.trim();
  const bolehBaru = Boolean(onTulisBaru) && baru.length >= 2 && !pilihan.some((p) => p.label.trim().toLowerCase() === baru.toLowerCase());
  const pakaiBaru = () => {
    onTulisBaru?.(baru);
    setTeks("");
    setBuka(false);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={buka ? teks : nilai ? `${nilai.label}${nilai.sub ? ` · ${nilai.sub}` : ""}` : ""}
        onFocus={() => {
          batalTutup();
          setTeks("");
          setBuka(true);
          setSorot(0);
        }}
        // Sesudah memilih, kotaknya masih fokus — klik lagi harus membuka
        // daftar, bukan menunggu fokus pindah dulu.
        onClick={() => {
          batalTutup();
          if (!buka) {
            setTeks("");
            setBuka(true);
          }
        }}
        onBlur={() => {
          tutup.current = setTimeout(() => setBuka(false), 150);
        }}
        // Mengetik selalu membuka daftar — sesudah memilih, kotak masih fokus dan
        // daftar tertutup; tanpa ini ketikan berikutnya tidak terlihat sama sekali.
        onChange={(e) => {
          batalTutup();
          setTeks(e.target.value);
          setBuka(true);
          setSorot(0);
        }}
        onKeyDown={(e) => {
          // ↑↓ menggerakkan sorotan (opsi "nama baru" = baris terakhir), Enter memilih yang tersorot.
          const n = cocok.length + (bolehBaru ? 1 : 0);
          if (e.key === "ArrowDown" && n) {
            e.preventDefault();
            setBuka(true);
            setSorot((x) => Math.min(x + 1, n - 1));
          } else if (e.key === "ArrowUp" && n) {
            e.preventDefault();
            setSorot((x) => Math.max(x - 1, 0));
          } else if (e.key === "Escape") {
            setBuka(false);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const p = cocok[Math.min(sorot, n - 1)];
            if (p && sorot < cocok.length) {
              onPilih(p);
              setBuka(false);
              (e.target as HTMLInputElement).blur();
            } else if (bolehBaru) pakaiBaru();
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={buka && (cocok.length > 0 || bolehBaru)}
        aria-autocomplete="list"
      />
      {buka && (cocok.length > 0 || bolehBaru) ? (
        <ul role="listbox" className="absolute z-20 mt-1.5 max-h-80 w-full min-w-60 overflow-auto rounded-xl border bg-popover p-1.5 shadow-[0_12px_32px_-12px_rgba(31,42,92,0.28)]">
          {saran || (bolehBaru && !cocok.length) ? (
            <li role="presentation" className="px-2.5 pt-1.5 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {saran ? "Tidak ketemu. Mungkin maksudnya:" : "Tidak ada di daftar."}
            </li>
          ) : null}
          {cocok.map((p, i) => (
            <li key={p.id} role="option" aria-selected={p.id === nilai?.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setSorot(i)}
                onClick={() => {
                  onPilih(p);
                  setBuka(false);
                }}
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[0.9375rem]",
                  i === sorot && "bg-accent",
                  p.id === nilai?.id && "font-medium text-primary-strong",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
                {p.sub ? <span className="shrink-0 text-xs font-normal text-muted-foreground">{p.sub}</span> : null}
                {p.id === nilai?.id ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            </li>
          ))}
          {bolehBaru ? (
            <li role="option" aria-selected={false} className={cocok.length ? "mt-1 border-t pt-1" : undefined}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setSorot(cocok.length)}
                onClick={pakaiBaru}
                className={cn("flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-sm", sorot === cocok.length && "bg-accent")}
              >
                <span>
                  Belum ada? Pakai nama baru <b className="font-semibold">“{baru}”</b>
                </span>
                <span className="text-xs text-muted-foreground">Ditulis sendiri, belum masuk daftar menu</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
