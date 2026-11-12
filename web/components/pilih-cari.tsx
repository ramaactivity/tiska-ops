"use client";

import { useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { calonMirip, saringMirip } from "@/lib/cari-mirip";

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
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (cocok[0]) {
              onPilih(cocok[0]);
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
        <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
          {saran || (bolehBaru && !cocok.length) ? (
            <li role="presentation" className="px-2.5 pt-1.5 pb-1 text-xs text-muted-foreground">
              {saran ? "Tidak ketemu. Mungkin maksudnya:" : "Tidak ada di daftar."}
            </li>
          ) : null}
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
                <span className="truncate">{p.label}</span>
                {p.sub ? <span className="shrink-0 text-xs text-muted-foreground">{p.sub}</span> : null}
              </button>
            </li>
          ))}
          {bolehBaru ? (
            <li role="option" aria-selected={false} className={cocok.length ? "mt-1 border-t pt-1" : undefined}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={pakaiBaru}
                className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
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
