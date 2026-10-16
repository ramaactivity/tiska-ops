"use client";

import { useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export type OpsiCari = { id: string; label: string; sub?: string };

/**
 * Pencari pengganti <select> bawaan browser (DESIGN.md): ketik sebagian nama
 * atau kode, pilih dari maksimal 8 kecocokan, Enter memilih yang teratas.
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
  const cocok = useMemo(() => {
    const k = teks.trim().toLowerCase();
    if (!k) return semuaSaatKosong ? pilihan : [];
    return pilihan.filter((p) => p.label.toLowerCase().includes(k) || p.sub?.toLowerCase().includes(k)).slice(0, 8);
  }, [teks, pilihan, semuaSaatKosong]);

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
        placeholder={placeholder}
        autoFocus={autoFocus}
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
                <span className="truncate">{p.label}</span>
                {p.sub ? <span className="shrink-0 text-xs text-muted-foreground">{p.sub}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
