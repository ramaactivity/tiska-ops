"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { SlotPanelCetak } from "@/components/panel-cetak";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PENGATUR CETAK KWITANSI (tidak ikut tercetak)

   Kertas: A5 polos (desain penuh) · Blanko Tiska (isi saja, di kertas kwitansi
   yang sudah tercetak) · A4 isi 2 (atas-bawah, potong di tengah).
   Pilihan disimpan di alamat halaman (?kertas=&ttd=&bawah=) supaya server yang
   menggambar lembarnya. Geser blanko disimpan per komputer (localStorage):
   tiap printer menarik kertas sedikit berbeda.
   ========================================================================== */

const KERTAS = [
  { nilai: "a5", label: "A5 polos", ket: "Desain lengkap di kertas A5" },
  { nilai: "blanko", label: "Blanko kwitansi Tiska", ket: "Hanya isian, di blanko yang sudah ada" },
  { nilai: "a4", label: "A4 isi 2", ket: "Dua kwitansi atas-bawah, potong di tengah" },
] as const;
const TTD = [
  { nilai: "digital", label: "Digital", ket: "gambar ikut tercetak" },
  { nilai: "basah", label: "Basah", ket: "ditandatangani pulpen" },
] as const;

const KUNCI_GESER = "geser-blanko";
type Geser = { x: number; y: number };

function pasangGeser(g: Geser) {
  document.documentElement.style.setProperty("--geser-x", `${g.x}mm`);
  document.documentElement.style.setProperty("--geser-y", `${g.y}mm`);
}

export function PengaturKwitansi({
  kertas,
  ttd,
  bawah,
  pilihanBawah,
}: {
  kertas: string;
  ttd: string;
  bawah: OpsiCari;
  pilihanBawah: OpsiCari[];
}) {
  const router = useRouter();
  const jalur = usePathname();
  const cari = useSearchParams();
  const [geser, setGeser] = useState<Geser>({ x: 0, y: 0 });

  const ganti = (kunci: string, nilai: string) => {
    const q = new URLSearchParams(cari.toString());
    q.set(kunci, nilai);
    router.replace(`${jalur}?${q}`, { scroll: false });
  };

  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(KUNCI_GESER) ?? "null") as Geser | null;
      if (g && Number.isFinite(g.x) && Number.isFinite(g.y)) {
        // Menyelaraskan dengan setelan tersimpan di browser (sistem luar) sekali saat dibuka — pola skala-cetak.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGeser(g);
        pasangGeser(g);
      }
    } catch {
      /* penyimpanan browser tidak tersedia — mulai dari 0 */
    }
  }, []);

  const ubahGeser = (dx: number, dy: number) => {
    const g = dx === 0 && dy === 0 ? { x: 0, y: 0 } : { x: Math.round((geser.x + dx) * 10) / 10, y: Math.round((geser.y + dy) * 10) / 10 };
    setGeser(g);
    pasangGeser(g);
    try {
      localStorage.setItem(KUNCI_GESER, JSON.stringify(g));
    } catch {
      /* tetap berlaku sampai halaman ditutup */
    }
  };

  const label = (teks: string) => <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{teks}</h2>;
  const geserTeks =
    geser.x === 0 && geser.y === 0
      ? "Belum digeser"
      : [geser.x ? `${geser.x > 0 ? "Kanan" : "Kiri"} ${Math.abs(geser.x)} mm` : "", geser.y ? `${geser.y > 0 ? "Bawah" : "Atas"} ${Math.abs(geser.y)} mm` : ""]
          .filter(Boolean)
          .join(" · ");
  const panah = (aria: string, dx: number, dy: number, Ikon: typeof ArrowUp, letak: string) => (
    <Button size="icon" variant="outline" aria-label={aria} className={`rounded-[10px] ${letak}`} onClick={() => ubahGeser(dx, dy)}>
      <Ikon className="size-4" strokeWidth={1.75} />
    </Button>
  );

  return (
    <SlotPanelCetak>
      <section className="flex flex-col gap-2.5 border-t p-5">
        {label("Kertas")}
        <div role="radiogroup" aria-label="Kertas" className="flex flex-col gap-2">
          {KERTAS.map((k) => {
            const aktif = kertas === k.nilai;
            return (
              <button
                key={k.nilai}
                type="button"
                role="radio"
                aria-checked={aktif}
                onClick={() => ganti("kertas", k.nilai)}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-200",
                  aktif ? "border-primary bg-primary/[0.06] shadow-[inset_0_0_0_1px_var(--primary)]" : "bg-card hover:border-primary/40 hover:bg-accent",
                )}
              >
                <GambarKertas jenis={k.nilai} aktif={aktif} />
                <span className="flex min-w-0 flex-col">
                  <span className={cn("text-[15px] leading-tight font-semibold", aktif ? "text-primary-strong" : "text-foreground")}>{k.label}</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">{k.ket}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2.5 border-t p-5">
        {label("Tanda tangan")}
        <div role="radiogroup" aria-label="Tanda tangan" className="grid grid-cols-2 gap-1 rounded-[12px] bg-muted p-1">
          {TTD.map((t) => (
            <button
              key={t.nilai}
              type="button"
              role="radio"
              aria-checked={ttd === t.nilai}
              onClick={() => ganti("ttd", t.nilai)}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-[9px] px-2 py-1.5 text-sm transition-[background-color,box-shadow] duration-200",
                ttd === t.nilai ? "bg-card font-semibold text-primary-strong shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="text-[11.5px] font-normal text-muted-foreground">{t.ket}</span>
            </button>
          ))}
        </div>
      </section>

      {kertas === "blanko" ? (
        <section className="flex flex-col gap-3 border-t p-5">
          {label("Geser isian")}
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-3 grid-rows-3 gap-1">
              {panah("Geser ke atas 1 mm", 0, -1, ArrowUp, "col-start-2")}
              {panah("Geser ke kiri 1 mm", -1, 0, ArrowLeft, "col-start-1 row-start-2")}
              <Button size="icon" variant="ghost" aria-label="Kembalikan ke posisi awal" className="col-start-2 row-start-2 rounded-[10px]" onClick={() => ubahGeser(0, 0)}>
                <RotateCcw className="size-4" strokeWidth={1.75} />
              </Button>
              {panah("Geser ke kanan 1 mm", 1, 0, ArrowRight, "col-start-3 row-start-2")}
              {panah("Geser ke bawah 1 mm", 0, 1, ArrowDown, "col-start-2 row-start-3")}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-semibold tabular-nums">{geserTeks}</span>
              <span className="text-[13px] leading-snug text-muted-foreground">Per tekan 1 mm. Diingat di komputer ini.</span>
            </div>
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">Isian tidak tepat di garis blanko? Geser ke arah yang kurang, lalu cetak lagi.</p>
        </section>
      ) : null}

      {kertas === "a4" ? (
        <section className="flex flex-col gap-2.5 border-t p-5">
          {label("Kwitansi bagian bawah")}
          <PilihCari nilai={bawah} pilihan={pilihanBawah} onPilih={(p) => ganti("bawah", p.id)} semuaSaatKosong placeholder="Cari nomor kwitansi atau pelanggan…" />
          <p className="text-[13px] leading-snug text-muted-foreground">Bawaannya kwitansi yang sama (klien + arsip). Ganti untuk mencetak dua kwitansi berbeda.</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-2.5 border-t p-5">
        {label("Di dialog cetak")}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Paper size</dt>
          <dd className="font-semibold">{kertas === "a4" ? "A4" : "A5"}</dd>
          <dt className="text-muted-foreground">Margins</dt>
          <dd className="font-semibold">None</dd>
          <dt className="text-muted-foreground">Scale</dt>
          <dd className="font-semibold">100</dd>
          <dt className="text-muted-foreground">Kertas masuk</dt>
          <dd>{kertas === "blanko" ? "Berdiri, sisi logo TISKA di atas" : "Berdiri, sisi pendek dulu"}</dd>
        </dl>
        {kertas === "blanko" ? (
          <p className="text-[13px] leading-snug text-muted-foreground">Pertama kali: cetak dulu di kertas polos bertanda silang untuk melihat sisi mana yang tercetak, supaya blanko tidak terbuang.</p>
        ) : null}
      </section>
    </SlotPanelCetak>
  );
}

/** Gambar mini kertas untuk tiap pilihan — bentuk & proporsinya sesuai kertas sungguhan. */
function GambarKertas({ jenis, aktif }: { jenis: string; aktif: boolean }) {
  const garis = aktif ? "var(--primary)" : "#9aa0b4";
  const isi = aktif ? "var(--primary)" : "#c4c8d6";
  return (
    <svg viewBox="0 0 44 44" className="size-11 shrink-0" aria-hidden>
      {jenis === "a4" ? (
        <>
          <rect x="11.5" y="2.5" width="21" height="39" rx="1.5" fill="#fff" stroke={garis} />
          <path d="M11.5 22h21" stroke={garis} strokeDasharray="2 1.5" />
          {[6, 9.5, 13].map((y) => <path key={y} d={`M14.5 ${y}h15`} stroke={isi} strokeWidth="1.4" />)}
          {[25.5, 29, 32.5].map((y) => <path key={y} d={`M14.5 ${y}h15`} stroke={isi} strokeWidth="1.4" />)}
        </>
      ) : (
        <>
          <rect x="2.5" y="8.5" width="39" height="27" rx="1.5" fill="#fff" stroke={garis} />
          {jenis === "blanko" ? (
            <>
              <path d="M27 14c2-3 3 2 5-1s2 1 4-1" fill="none" stroke={garis} strokeWidth="1.2" />
              {[19, 23.5, 28].map((y) => <path key={y} d={`M14 ${y}h23`} stroke={garis} strokeWidth="0.8" strokeDasharray="1.5 1.2" />)}
              <path d="M6 31h12" stroke={garis} strokeWidth="0.8" strokeDasharray="1.5 1.2" />
            </>
          ) : (
            <>
              <path d="M6 14.5h32" stroke={isi} strokeWidth="1.2" />
              {[19, 23].map((y) => <path key={y} d={`M14 ${y}h24`} stroke={isi} strokeWidth="1.4" />)}
              <rect x="6" y="27" width="12" height="5" rx="1" fill={isi} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
