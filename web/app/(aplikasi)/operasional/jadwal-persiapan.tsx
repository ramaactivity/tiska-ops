"use client";

import { ChefHat } from "lucide-react";
import { useState } from "react";

import { SalinTeks } from "@/app/(aplikasi)/event/[id]/aksi-event";
import { PilihanChip } from "@/components/pilihan-chip";
import { briefPersiapan, geserJam, MENIT_PACKING, type SesiPersiapan } from "@/lib/brief";

const DURASI = [
  { nilai: "90", label: "1½ jam" },
  { nilai: "120", label: "2 jam" },
  { nilai: "150", label: "2½ jam" },
  { nilai: "180", label: "3 jam" },
];

/**
 * Jadwal persiapan dapur (07-BRIEF §5): jam dihitung mundur dari jam
 * berangkat; durasi masak dipilih per sesi, teks siap ditempel ke grup Kitchen.
 */
export function JadwalPersiapan({
  tanggal,
  besok,
  pemesan,
  sesi,
  tanpaJam,
}: {
  tanggal: string;
  besok: boolean;
  pemesan: string[];
  sesi: Omit<SesiPersiapan, "menitMasak">[];
  tanpaJam: string[];
}) {
  const [menit, setMenit] = useState<number[]>(() => sesi.map(() => 120));
  const lengkap = sesi.map((s, i) => ({ ...s, menitMasak: menit[i] ?? 120 }));
  const teks = briefPersiapan({ tanggal, besok, pemesan, sesi: lengkap });

  return (
    <section className="rounded-[14px] border bg-card p-4">
      <div className="flex items-center justify-between gap-2 pb-1">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-primary-strong">
          <ChefHat className="size-4" />
          Jadwal persiapan dapur
        </h2>
        {sesi.length ? <SalinTeks teks={teks} /> : null}
      </div>
      <p className="pb-3 text-sm text-muted-foreground">Dihitung mundur dari jam berangkat. Pilih lama masak tiap sesi, lalu Salin ke grup Kitchen.</p>

      {sesi.length ? (
        <ul className="flex flex-col gap-3 pb-3">
          {lengkap.map((s, i) => (
            <li key={`${s.judul}-${s.siap}`} className="flex flex-col gap-1.5 border-b border-border-row pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {i + 1}. {s.judul}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold">{s.siap}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Masak mulai <b className="font-mono font-semibold text-foreground">{geserJam(s.siap, -MENIT_PACKING - s.menitMasak)}</b> · packing{" "}
                {geserJam(s.siap, -MENIT_PACKING)} · {s.ambil ? "diambil" : "berangkat"} {s.siap}
              </span>
              <PilihanChip
                kecil
                label={`Lama masak ${s.judul}`}
                pilihan={DURASI}
                nilai={String(s.menitMasak)}
                onPilih={(v) => setMenit((m) => m.map((x, k) => (k === i ? Number(v) : x)))}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {tanpaJam.length ? (
        <p className="mb-3 rounded-[10px] bg-perhatian-halus px-3 py-2 text-xs text-perhatian">
          Belum punya jam berangkat (tambah kloter di event): {tanpaJam.join(", ")}
        </p>
      ) : null}

      {sesi.length ? (
        <pre className="max-h-72 overflow-auto rounded-[10px] bg-muted/50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{teks}</pre>
      ) : null}
    </section>
  );
}
