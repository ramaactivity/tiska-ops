"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { unduhFoto } from "@/lib/foto-klien";

import { catatDibuka } from "./actions";

type Kelompok = { judul: string; foto: { id: string; thumb: string; utama: string; keterangan: string | null }[] };

export function GaleriKlien({ token, untuk, kelompok, catat }: { token: string; untuk: string | null; kelompok: Kelompok[]; catat: boolean }) {
  const [sibuk, setSibuk] = useState(false);
  const jumlah = kelompok.reduce((n, k) => n + k.foto.length, 0);
  useEffect(() => {
    // Admin yang sedang login tidak dihitung sebagai "dibuka klien".
    if (catat) void catatDibuka(token);
  }, [catat, token]);

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-primary">Foto menu{untuk ? ` untuk ${untuk}` : ""}</p>
        <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-balance">
          {kelompok.length === 1 ? kelompok[0].judul : `${kelompok.length} menu · ${jumlah} foto`}
        </h1>
        <p className="text-[0.9375rem] text-muted-foreground">Ketuk foto untuk melihat ukuran penuh.</p>
      </header>
      <div>
        <Button
          type="button"
          className="rounded-full"
          disabled={sibuk}
          onClick={async () => {
            setSibuk(true);
            try {
              await unduhFoto(
                kelompok.flatMap((k) => k.foto.map((f) => ({ utama: f.utama, tujuan: k.judul }))),
                "foto-menu-tiska",
              );
            } catch (e) {
              toast.error((e as Error).message || "Gagal mengunduh. Coba lagi.");
            } finally {
              setSibuk(false);
            }
          }}
        >
          {sibuk ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          Unduh semua foto
        </Button>
      </div>
      {kelompok.map((k) => (
        <section key={k.judul} className="flex flex-col gap-2.5">
          <h2 className="text-base font-semibold">
            {k.judul} <span className="font-normal text-muted-foreground">· {k.foto.length} foto</span>
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {k.foto.map((f) => (
              <li key={f.id}>
                <a href={f.utama} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border bg-muted shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- berkas R2, sudah dikecilkan */}
                  <img src={f.thumb} alt={f.keterangan ?? k.judul} loading="lazy" className="aspect-square w-full object-cover" />
                </a>
                {f.keterangan ? <p className="mt-1 text-sm text-muted-foreground">{f.keterangan}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
