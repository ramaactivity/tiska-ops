"use client";

import { Download, Images, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { kirimFoto, unduhFoto } from "@/lib/foto-klien";
import type { KelompokFoto } from "@/lib/foto-menu";
import { cn } from "@/lib/utils";

/** "Foto untuk klien" di halaman Paket & Quotation (D-125): pilih foto isi paket lalu Kirim ke WA / Unduh. */
export function StripFoto({ kelompok, judul }: { kelompok: KelompokFoto[]; judul: string }) {
  const [pilih, setPilih] = useState<string[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const semua = kelompok.flatMap((k) => k.foto);
  if (!kelompok.length) return null;
  const dipilih = semua.filter((f) => pilih.includes(f.id));
  const bagikan = async (cara: "kirim" | "unduh") => {
    setSibuk(true);
    try {
      const catatan = cara === "kirim" ? await kirimFoto(dipilih, judul) : (await unduhFoto(dipilih, judul), "");
      if (catatan) toast.success(catatan);
    } catch (e) {
      toast.error((e as Error).message || "Gagal. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Images className="size-4" /> Foto untuk klien
        </h2>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setPilih(pilih.length === semua.length ? [] : semua.map((f) => f.id))}>
          {pilih.length === semua.length ? "Batal pilih semua" : "Pilih semua"}
        </Button>
      </div>
      {kelompok.map((k) => (
        <div key={k.href} className="flex flex-col gap-1.5">
          <Link href={k.href} className="text-sm font-medium hover:underline">
            {k.judul} <span className="font-normal text-muted-foreground">· {k.jumlah} foto</span>
          </Link>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {k.foto.map((f) => {
              const aktif = pilih.includes(f.id);
              return (
                <li key={f.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={aktif}
                    aria-label={`Pilih foto ${k.judul}`}
                    onClick={() => setPilih((p) => (aktif ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                    className={cn("relative block size-24 overflow-hidden rounded-xl border bg-muted", aktif && "ring-3 ring-primary")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail R2 */}
                    <img src={f.thumb} alt={k.judul} loading="lazy" className="size-full object-cover" />
                    <span className={cn("absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white text-[0.625rem] font-bold text-white shadow", aktif ? "bg-primary" : "bg-black/20")}>
                      {aktif ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {pilih.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-medium">{pilih.length} dipilih</span>
          <Button type="button" size="sm" className="rounded-full" disabled={sibuk} onClick={() => bagikan("kirim")}>
            {sibuk ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Kirim ke WA
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={sibuk} onClick={() => bagikan("unduh")}>
            <Download className="size-3.5" />
            Unduh
          </Button>
        </div>
      ) : null}
    </section>
  );
}
