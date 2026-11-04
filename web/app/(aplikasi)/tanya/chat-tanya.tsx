"use client";

import { ArrowUp, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Pesan = { peran: "user" | "assistant"; isi: string; alat?: string[]; galat?: boolean };

/** Teks jawaban AI: baris "- " jadi butir, **tebal** jadi tebal. Tanpa HTML mentah. */
function TeksJawaban({ teks }: { teks: string }) {
  const tebal = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((b, i) => (b.startsWith("**") && b.endsWith("**") ? <strong key={i}>{b.slice(2, -2)}</strong> : <Fragment key={i}>{b}</Fragment>));
  return (
    <div className="flex flex-col gap-1.5">
      {teks.split("\n").map((baris, i) => {
        const butir = /^\s*[-*•]\s+/.test(baris);
        if (!baris.trim()) return null;
        return butir ? (
          <p key={i} className="flex gap-2 pl-1">
            <span aria-hidden>•</span>
            <span>{tebal(baris.replace(/^\s*[-*•]\s+/, ""))}</span>
          </p>
        ) : (
          <p key={i}>{tebal(baris)}</p>
        );
      })}
    </div>
  );
}

export function ChatTanya({ saran, nama }: { saran: string[]; nama: string }) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [teks, setTeks] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const bawah = useRef<HTMLDivElement>(null);
  // Bertubuh blok: scrollIntoView di Chrome baru mengembalikan Promise — jangan sampai terbaca sebagai fungsi pembersih effect.
  useEffect(() => {
    bawah.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan, sibuk]);

  async function kirim(isi: string) {
    const q = isi.trim();
    if (!q || sibuk) return;
    const riwayat = [...pesan.filter((m) => !m.galat), { peran: "user" as const, isi: q }];
    setPesan((p) => [...p, { peran: "user", isi: q }]);
    setTeks("");
    setSibuk(true);
    try {
      const r = await fetch("/api/tanya", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pesan: riwayat.map(({ peran, isi }) => ({ peran, isi })) }) });
      const j = (await r.json()) as { jawaban?: string; alat?: string[]; pesan?: string };
      setPesan((p) => [...p, r.ok && j.jawaban ? { peran: "assistant", isi: j.jawaban, alat: j.alat } : { peran: "assistant", isi: j.pesan ?? "Gagal menjawab. Coba lagi.", galat: true }]);
    } catch {
      setPesan((p) => [...p, { peran: "assistant", isi: "Koneksi terputus. Coba lagi.", galat: true }]);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-16rem)] flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4">
        {pesan.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border bg-card px-5 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
              <Sparkles className="size-7" />
            </span>
            <div>
              <p className="text-xl font-semibold">Halo {nama}, mau tanya apa?</p>
              <p className="mt-1 max-w-xl text-[0.9375rem] text-muted-foreground">Aku bisa lihat acara, tagihan, penjualan, menu, paket & harga, stok, rekanan, dan lainnya — sesuai akses akunmu.</p>
            </div>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {saran.map((s) => (
                <button key={s} type="button" onClick={() => kirim(s)} className="min-h-10 rounded-full border bg-background px-4 text-sm transition-colors hover:bg-accent">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          pesan.map((m, i) => (
            <div key={i} className={cn("flex", m.peran === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[min(42rem,90%)] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                  m.peran === "user" ? "bg-primary text-primary-foreground" : m.galat ? "border border-perhatian-garis bg-perhatian-halus" : "border bg-card",
                )}
              >
                {m.peran === "assistant" && !m.galat ? <TeksJawaban teks={m.isi} /> : <p className="whitespace-pre-wrap">{m.isi}</p>}
                {m.alat?.length ? <p className="mt-2 text-xs text-muted-foreground">Dicek dari: {m.alat.join(", ")}</p> : null}
              </div>
            </div>
          ))
        )}
        {sibuk ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Lagi ngecek data…
          </div>
        ) : null}
        <div ref={bawah} />
      </div>
      <form
        className="sticky bottom-3 flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim(teks);
        }}
      >
        {pesan.length ? (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Percakapan baru" onClick={() => setPesan([])}>
            <RotateCcw className="size-4" />
          </Button>
        ) : null}
        <Textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void kirim(teks);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Tanya soal acara, tagihan, harga, stok…"
          aria-label="Pertanyaan"
          className="min-h-10 flex-1 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={sibuk || !teks.trim()} aria-label="Kirim">
          <ArrowUp className="size-4" />
        </Button>
      </form>
      <p className="-mt-2 text-center text-xs text-muted-foreground">Asisten bisa keliru — untuk keputusan penting, cek lagi di halaman aslinya.</p>
    </div>
  );
}
