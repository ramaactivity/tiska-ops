"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  CornerDownRight,
  Hash,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  StickyNote,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { type JenisPoin, nomorPoin, type Poin, tulisPoin, uraiPoin } from "@/lib/poin-syarat";
import { cn } from "@/lib/utils";

import { simpanSyarat } from "./actions";

type Baris = Poin & { kunci: string };
const kunciBaru = () => crypto.randomUUID();
const denganKunci = (p: Poin[]): Baris[] => p.map((x) => ({ ...x, kunci: kunciBaru() }));

/**
 * Penyunting satu bagian S&K (D-064) — dibuat untuk pemakai yang tidak
 * terbiasa mengetik dokumen panjang: satu poin satu kotak, nomor diatur
 * otomatis, Enter = poin baru (seperti daftar bernomor di Word), tempel
 * banyak baris = dipecah jadi poin, dan tersimpan otomatis.
 */
export function EditorSyarat({
  id,
  judulAwal,
  poinAwal,
  aktifAwal,
  untuk,
}: {
  id: string;
  judulAwal: string;
  poinAwal: Poin[];
  aktifAwal: boolean;
  untuk: string;
}) {
  const [judul, setJudul] = useState(judulAwal);
  const [baris, setBaris] = useState<Baris[]>(() => denganKunci(poinAwal.length ? poinAwal : [{ jenis: "poin", teks: "" }]));
  const [aktif, setAktif] = useState(aktifAwal);
  const [pesan, setPesan] = useState("");
  const [, mulai] = useTransition();
  const ref = useRef(new Map<string, HTMLTextAreaElement>());
  // Poin yang harus difokus setelah daftar berubah (Enter, hapus, tempel).
  const fokusNanti = useRef<{ kunci: string; pos: number } | null>(null);
  const setFokus = (f: { kunci: string; pos: number }) => {
    fokusNanti.current = f;
  };
  const daftarkan = (kunci: string, el: HTMLTextAreaElement | null) => {
    if (el) ref.current.set(kunci, el);
    else ref.current.delete(kunci);
  };
  const urutan = useRef(0);
  const nomor = nomorPoin(baris);
  // Yang terakhir tersimpan, dalam bentuk teks — simpan hanya bila isi benar-benar berubah
  // (bukan karena halaman baru dibuka; itu akan mengganti "terakhir diubah oleh").
  const potret = JSON.stringify([judul.trim(), aktif, tulisPoin(baris)]);
  const [tersimpan, setTersimpan] = useState(() => JSON.stringify([judulAwal.trim(), aktifAwal, tulisPoin(poinAwal)]));
  const status = pesan ? "gagal" : potret === tersimpan ? "tersimpan" : "menyimpan";

  // Simpan otomatis 1 detik setelah berhenti mengetik.
  useEffect(() => {
    if (potret === tersimpan) return;
    const ke = ++urutan.current;
    const t = setTimeout(() => {
      mulai(async () => {
        const h = await simpanSyarat({ id, judul, aktif, poin: baris.map(({ jenis, teks }) => ({ jenis, teks })) }).catch(() => ({
          ok: false,
          pesan: "Koneksi terputus — coba lagi sebentar.",
        }));
        if (ke !== urutan.current) return;
        if (h.ok) setTersimpan(potret);
        setPesan(h.ok ? "" : (h.pesan ?? "Gagal menyimpan."));
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [id, judul, aktif, baris, potret, tersimpan]);

  // Jangan sampai halaman ditutup sebelum tersimpan.
  useEffect(() => {
    if (status === "tersimpan") return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [status]);

  useLayoutEffect(() => {
    const f = fokusNanti.current;
    if (!f) return;
    fokusNanti.current = null;
    const el = ref.current.get(f.kunci);
    el?.focus();
    el?.setSelectionRange(f.pos, f.pos);
  }, [baris]);

  const ubah = (i: number, ubahan: Partial<Poin>) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, ...ubahan } : x)));
  const sisip = (i: number, baru: Poin[], pos = 0) => {
    const b2 = denganKunci(baru);
    setBaris((b) => [...b.slice(0, i), ...b2, ...b.slice(i)]);
    if (b2.length) setFokus({ kunci: b2[b2.length - 1].kunci, pos });
  };
  const hapus = (i: number) => {
    setBaris((b) => (b.length > 1 ? b.filter((_, j) => j !== i) : [{ ...b[0], teks: "" }]));
    const sebelum = baris[i - 1];
    if (sebelum) setFokus({ kunci: sebelum.kunci, pos: sebelum.teks.length });
  };

  /** Satu "blok" = poin utama + sub-poinnya; dipindah bersama. */
  const blok = (i: number): [number, number] => {
    if (baris[i].jenis !== "poin") return [i, i + 1];
    let akhir = i + 1;
    while (baris[akhir]?.jenis === "sub") akhir++;
    return [i, akhir];
  };
  const awalBlokSebelum = (i: number) => {
    let j = i - 1;
    if (baris[i].jenis === "sub") return baris[j]?.jenis === "sub" ? j : -1;
    while (j >= 0 && baris[j].jenis === "sub") j--;
    return j;
  };
  const pindah = (i: number, arah: -1 | 1) => {
    const [a, z] = blok(i);
    if (arah === -1) {
      const j = awalBlokSebelum(i);
      if (j < 0) return;
      setBaris((b) => [...b.slice(0, j), ...b.slice(a, z), ...b.slice(j, a), ...b.slice(z)]);
    } else {
      if (z >= baris.length || (baris[i].jenis === "sub" && baris[z].jenis !== "sub")) return;
      const [, z2] = baris[i].jenis === "sub" ? [z, z + 1] : blok(z);
      setBaris((b) => [...b.slice(0, a), ...b.slice(z, z2), ...b.slice(a, z), ...b.slice(z2)]);
    }
  };

  function tombol(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
    const el = e.currentTarget;
    const b = baris[i];
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter = poin baru di bawahnya (teks setelah kursor ikut pindah).
      e.preventDefault();
      const pos = el.selectionStart;
      ubah(i, { teks: b.teks.slice(0, pos) });
      sisip(i + 1, [{ jenis: b.jenis === "catatan" ? "poin" : b.jenis, teks: b.teks.slice(pos) }]);
    } else if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.jenis === "sub" && b.teks) {
        e.preventDefault();
        ubah(i, { jenis: "poin" });
      } else if (!b.teks && baris.length > 1) {
        e.preventDefault();
        hapus(i);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (b.jenis !== "catatan") ubah(i, { jenis: e.shiftKey ? "poin" : "sub" });
    }
  }

  function tempel(e: React.ClipboardEvent<HTMLTextAreaElement>, i: number) {
    const teks = e.clipboardData.getData("text");
    if (!/\n/.test(teks.trim())) return;
    // Banyak baris → dipecah jadi poin; nomor yang ikut tertempel dibuang.
    e.preventDefault();
    const potong = uraiPoin(teks);
    const b = baris[i];
    if (!b.teks.trim()) {
      setBaris((x) => [...x.slice(0, i), ...denganKunci(potong), ...x.slice(i + 1)]);
    } else sisip(i + 1, potong, potong[potong.length - 1]?.teks.length ?? 0);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Kepala: judul + untuk pesanan apa + status simpan */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">Untuk {untuk.toLowerCase()}</span>
          <StatusSimpan status={status} pesan={pesan} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Judul bagian</span>
          <Input value={judul} onChange={(e) => setJudul(e.target.value)} className="h-12 text-lg font-semibold md:text-lg" />
        </label>
      </div>

      {/* Daftar poin */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Isi — nomor diatur otomatis</span>
          <span className="hidden text-xs text-subtle-foreground sm:block">Enter = poin baru · Tab = jadikan sub-poin</span>
        </div>
        <ol className="flex flex-col gap-2">
          {baris.map((b, i) => (
            <li
              key={b.kunci}
              className={cn(
                "flex items-start gap-2 rounded-[12px] border bg-card py-2 pr-1.5 pl-2 transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/15",
                b.jenis === "sub" && "ml-6 sm:ml-12",
                b.jenis === "catatan" && "border-dashed bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "mt-1 flex h-8 min-w-11 shrink-0 items-center justify-center rounded-[8px] px-1.5 font-mono text-[0.9375rem] font-semibold",
                  b.jenis === "catatan" ? "text-xs font-medium text-subtle-foreground" : "bg-accent text-primary",
                )}
              >
                {b.jenis === "catatan" ? "catatan" : nomor[i]}
              </span>
              <TeksTumbuh
                daftarkan={(el) => daftarkan(b.kunci, el)}
                value={b.teks}
                onChange={(t) => ubah(i, { teks: t })}
                onKeyDown={(e) => tombol(e, i)}
                onPaste={(e) => tempel(e, i)}
                placeholder={b.jenis === "catatan" ? "Catatan tanpa nomor…" : "Tulis poin…"}
                aria-label={b.jenis === "catatan" ? `Catatan ke-${i + 1}` : `Poin ${nomor[i]}`}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" variant="ghost" size="icon" className="mt-0.5 size-9 shrink-0 text-muted-foreground" aria-label={`Pilihan untuk ${b.jenis === "catatan" ? "catatan" : `poin ${nomor[i]}`}`} />}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem onClick={() => pindah(i, -1)}>
                    <ArrowUp className="size-4" />
                    Pindah ke atas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => pindah(i, 1)}>
                    <ArrowDown className="size-4" />
                    Pindah ke bawah
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {b.jenis === "poin" ? (
                    <DropdownMenuItem onClick={() => ubah(i, { jenis: "sub" })}>
                      <CornerDownRight className="size-4" />
                      Jadikan sub-poin (menjorok)
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => ubah(i, { jenis: "poin" })}>
                      <Hash className="size-4" />
                      Jadikan poin bernomor
                    </DropdownMenuItem>
                  )}
                  {b.jenis !== "catatan" ? (
                    <DropdownMenuItem onClick={() => ubah(i, { jenis: "catatan" as JenisPoin })}>
                      <StickyNote className="size-4" />
                      Jadikan catatan tanpa nomor
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => sisip(blok(i)[1], [{ jenis: b.jenis === "sub" ? "sub" : "poin", teks: "" }])}>
                    <Plus className="size-4" />
                    Tambah poin di bawahnya
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => hapus(i)}>
                    <Trash2 className="size-4" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" className="h-11" onClick={() => sisip(baris.length, [{ jenis: "poin", teks: "" }])}>
            <Plus className="size-4" />
            Tambah poin
          </Button>
          <Button type="button" variant="ghost" className="h-11 text-muted-foreground" onClick={() => sisip(baris.length, [{ jenis: "catatan", teks: "" }])}>
            <StickyNote className="size-4" />
            Tambah catatan tanpa nomor
          </Button>
        </div>
      </div>

      {/* Dipakai / tidak */}
      <div className="flex flex-col gap-2 rounded-[12px] bg-muted/50 p-4">
        <span className="text-sm font-medium">Ikut dirakit ke quotation baru?</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Ikut dirakit ke quotation baru">
          {[
            [true, "Ya, dipakai"],
            [false, "Tidak dipakai"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={aktif === v}
              onClick={() => setAktif(v as boolean)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                aktif === v ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {label as string}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Quotation yang sudah dibuat tidak ikut berubah — teksnya sudah tersalin ke masing-masing dokumen.</span>
      </div>

      {status === "gagal" ? (
        <Button type="button" variant="outline" className="self-start" onClick={() => {
            setPesan("");
            setBaris((b) => [...b]);
          }}>
          <Undo2 className="size-4" />
          Coba simpan lagi
        </Button>
      ) : null}
    </div>
  );
}

function StatusSimpan({ status, pesan }: { status: string; pesan: string }) {
  if (status === "tersimpan")
    return (
      <span className="flex items-center gap-1.5 text-sm text-lunas">
        <Check className="size-4" /> Tersimpan otomatis
      </span>
    );
  if (status === "gagal")
    return (
      <span role="alert" className="flex items-center gap-1.5 text-sm font-medium text-tempo">
        <CircleAlert className="size-4" /> Belum tersimpan: {pesan}
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" /> Menyimpan…
    </span>
  );
}

/** Kotak teks yang tingginya mengikuti isi — tanpa gulir di dalam kotak kecil. */
function TeksTumbuh({
  daftarkan,
  value,
  onChange,
  ...lain
}: {
  daftarkan: (el: HTMLTextAreaElement | null) => void;
  value: string;
  onChange: (t: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">) {
  const el = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(t) => {
        el.current = t;
        daftarkan(t);
      }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-10 flex-1 resize-none overflow-hidden bg-transparent px-1 py-1.5 text-base leading-relaxed outline-none placeholder:text-subtle-foreground"
      {...lain}
    />
  );
}
