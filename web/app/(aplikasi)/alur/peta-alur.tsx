"use client";

import { ArrowRight, Maximize, Minus, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ALUR, KARTU, LANGKAH, pathSiku, posisi, SAMBUNGAN, tengahGaris, titikGaris, UKURAN, type Langkah } from "@/lib/peta-alur";
import { cn } from "@/lib/utils";

const PER_ID = new Map(LANGKAH.map((l) => [l.id, l]));
const GARIS = SAMBUNGAN.map((s) => {
  const t = titikGaris(PER_ID.get(s.dari)!, PER_ID.get(s.ke)!, s.sisi);
  return { ...s, d: pathSiku(t), tengah: tengahGaris(t) };
});

/**
 * Kanvas peta alur (D-104): kartu di kisi, garis siku dengan panah, geser
 * dengan seret (mouse) atau jari, perbesar/perkecil. Satu alur bisa disorot.
 */
export function PetaAlur({ boleh }: { boleh: Record<string, boolean> }) {
  const wadah = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  const [aktif, setAktif] = useState<string | null>(null);
  const [pilih, setPilih] = useState<Langkah | null>(null);
  const [daftar, setDaftar] = useState(true);
  const seret = useRef<{ x: number; y: number; kiri: number; atas: number } | null>(null);

  const sorot = useMemo(() => new Set(ALUR.find((a) => a.id === aktif)?.langkah ?? []), [aktif]);
  const redup = (id: string) => aktif !== null && !sorot.has(id);

  const pas = () => {
    const w = wadah.current;
    if (w) setSkala(Math.max(0.4, Math.min(1, (w.clientWidth - 16) / UKURAN.lebar, (w.clientHeight - 16) / UKURAN.tinggi)));
  };
  useEffect(() => {
    // Mulai pada ukuran yang tulisannya masih terbaca (≥ 70%); seluruh peta lewat tombol "Muat seluruh peta".
    const w = wadah.current;
    if (w) setSkala(Math.max(0.7, Math.min(1, (w.clientWidth - 16) / UKURAN.lebar)));
    // HP: daftar alur menutupi kanvas, jadi mulai tertutup.
    if (window.innerWidth < 768) setDaftar(false);
  }, []);

  const tuju = (l: Langkah) => {
    setPilih(l);
    const w = wadah.current;
    if (!w) return;
    const p = posisi(l);
    w.scrollTo({ left: (p.x + KARTU.lebar / 2) * skala - w.clientWidth / 2, top: (p.y + KARTU.tinggi / 2) * skala - w.clientHeight / 2, behavior: "smooth" });
  };

  return (
    <div className="relative flex h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden rounded-[18px] border bg-card">
      {daftar ? (
        <aside className="absolute inset-y-0 left-0 z-20 flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-card p-3 md:static">
          <div className="flex items-center justify-between pb-1">
            <span className="eyebrow">Alur</span>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setDaftar(false)} aria-label="Tutup daftar alur">
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <button type="button" onClick={() => setAktif(null)} className={cn("rounded-xl px-3 py-2 text-left text-sm", aktif === null ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted")}>
            🗺️ Semua alur
          </button>
          {ALUR.map((a) => (
            <div key={a.id} className="flex flex-col">
              <button type="button" onClick={() => setAktif(aktif === a.id ? null : a.id)} className={cn("rounded-xl px-3 py-2 text-left text-sm", aktif === a.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted")}>
                {a.ikon} {a.judul}
              </button>
              {aktif === a.id ? (
                <ul className="mb-1 ml-5 flex flex-col border-l pl-2">
                  {a.langkah.map((id) => {
                    const l = PER_ID.get(id)!;
                    return (
                      <li key={id}>
                        <button type="button" onClick={() => tuju(l)} className={cn("w-full rounded-lg px-2 py-1.5 text-left text-[13px]", pilih?.id === id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}>
                          {l.ikon} {l.judul}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ))}
          <p className="mt-auto px-3 pt-3 text-xs text-muted-foreground">Garis putus-putus = langkah bila perlu (cabang). Seret kanvas untuk menggeser.</p>
        </aside>
      ) : null}

      <div
        ref={wadah}
        className="relative flex-1 cursor-grab overflow-auto active:cursor-grabbing"
        style={{ backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1px)", backgroundSize: `${20 * skala}px ${20 * skala}px` }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || (e.target as HTMLElement).closest("button,a")) return;
          seret.current = { x: e.clientX, y: e.clientY, kiri: e.currentTarget.scrollLeft, atas: e.currentTarget.scrollTop };
        }}
        onPointerMove={(e) => {
          const s = seret.current;
          if (!s || !e.buttons) return;
          e.currentTarget.scrollLeft = s.kiri - (e.clientX - s.x);
          e.currentTarget.scrollTop = s.atas - (e.clientY - s.y);
        }}
        onPointerUp={() => (seret.current = null)}
      >
        <div style={{ width: UKURAN.lebar * skala, height: UKURAN.tinggi * skala }}>
          <div className="relative origin-top-left" style={{ width: UKURAN.lebar, height: UKURAN.tinggi, transform: `scale(${skala})` }}>
            <svg className="absolute inset-0" width={UKURAN.lebar} height={UKURAN.tinggi} aria-hidden="true">
              <defs>
                <marker id="panah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary-strong)" />
                </marker>
              </defs>
              {GARIS.map((g) => {
                const nyala = aktif === null || (sorot.has(g.dari) && sorot.has(g.ke));
                return (
                  <path
                    key={`${g.dari}-${g.ke}`}
                    d={g.d}
                    fill="none"
                    stroke="var(--primary-strong)"
                    strokeWidth={1.75}
                    strokeDasharray={g.putus ? "5 5" : undefined}
                    markerEnd="url(#panah)"
                    opacity={nyala ? 0.85 : 0.12}
                    className="transition-opacity duration-700"
                  />
                );
              })}
            </svg>
            {GARIS.filter((g) => g.label).map((g) => (
              <span
                key={`l-${g.dari}-${g.ke}`}
                className={cn("pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-primary-strong px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-white transition-opacity duration-700", aktif !== null && !(sorot.has(g.dari) && sorot.has(g.ke)) && "opacity-15")}
                style={{ left: g.tengah.x, top: g.tengah.y }}
              >
                {g.label}
              </span>
            ))}
            {LANGKAH.map((l) => {
              const p = posisi(l);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setPilih(l)}
                  className={cn(
                    "absolute flex flex-col gap-1.5 rounded-[14px] border bg-card p-3 text-left shadow-sm transition-[opacity,box-shadow] duration-700 hover:shadow-md",
                    pilih?.id === l.id && "border-primary ring-2 ring-primary/30",
                    redup(l.id) && "opacity-25",
                  )}
                  style={{ left: p.x, top: p.y, width: KARTU.lebar, height: KARTU.tinggi }}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary-strong">
                    <span className="text-base">{l.ikon}</span>
                    {l.judul}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{l.ringkas}</span>
                  <span className="mt-auto flex flex-wrap gap-1">
                    {l.peran.map((r) => (
                      <span key={r} className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {r}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!daftar ? (
        <Button variant="outline" size="icon" className="absolute top-3 left-3 z-10 size-10 rounded-xl bg-card" onClick={() => setDaftar(true)} aria-label="Buka daftar alur">
          <PanelLeftOpen className="size-4" />
        </Button>
      ) : null}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-2">
        <Button variant="outline" size="icon" className="size-10 rounded-xl bg-card" onClick={() => setSkala((s) => Math.min(1.5, s + 0.1))} aria-label="Perbesar">
          <Plus className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="size-10 rounded-xl bg-card" onClick={() => setSkala((s) => Math.max(0.4, s - 0.1))} aria-label="Perkecil">
          <Minus className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="size-10 rounded-xl bg-card" onClick={pas} aria-label="Muat seluruh peta">
          <Maximize className="size-4" />
        </Button>
      </div>

      {pilih ? (
        <section className="absolute inset-x-3 bottom-3 z-30 flex max-h-[70%] flex-col gap-3 overflow-y-auto rounded-2xl border bg-card p-4 shadow-lg md:inset-x-auto md:top-3 md:right-16 md:bottom-auto md:w-80">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-primary-strong">
              <span className="text-xl">{pilih.ikon}</span>
              {pilih.judul}
            </h2>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setPilih(null)} aria-label="Tutup">
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {pilih.peran.map((r) => (
              <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {r}
              </span>
            ))}
          </div>
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm">
            {pilih.rinci.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Alur: {ALUR.filter((a) => a.langkah.includes(pilih.id)).map((a) => a.judul).join(" · ")}
          </p>
          {boleh[pilih.id] ? (
            <Button className="rounded-full" render={<Link href={pilih.href} />}>
              Buka menunya
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">Menu ini dikerjakan peran lain — tidak terbuka untuk akun Anda.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
