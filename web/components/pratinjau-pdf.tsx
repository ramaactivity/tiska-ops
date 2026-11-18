"use client";

import { FileText, LoaderCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buatPdf } from "@/components/tombol-pdf";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PRATINJAU HALAMAN ASLI (D-205, Rama: "pratinjaunya tidak real, nyambung
   semua dari awal sampai akhir")

   Yang tampil adalah PDF yang SAMA dengan Unduh PDF / Kirim ke WA, digambar
   per halaman dengan pdf.js — pemisah & jumlah halamannya persis hasil
   cetak, bukan perkiraan dari satu lembar panjang. Lembar HTML-nya tetap ada
   (disembunyikan di luar layar) untuk dicetak, dijadikan JPG/PNG, dan diukur
   oleh pengatur ukuran.

   Tidak dipakai di kwitansi (satu halaman; meterai/tanda tangan berubah tanpa
   alamat berubah) dan saat halaman ini dibuka oleh pembuat PDF di server
   (`_mesin`) — tanpa penjaga itu ia akan meminta PDF dirinya sendiri terus.
   ========================================================================== */

type Halaman = { url: string; lebar: number; tinggi: number };

let pekerja: Worker | null = null;

async function gambarHalaman(berkas: Blob): Promise<Halaman[]> {
  const pdfjs = await import("pdfjs-dist");
  if (!pekerja) {
    pekerja = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    pdfjs.GlobalWorkerOptions.workerPort = pekerja;
  }
  const tugas = pdfjs.getDocument({ data: new Uint8Array(await berkas.arrayBuffer()) });
  const dok = await tugas.promise;
  const hasil: Halaman[] = [];
  for (let i = 1; i <= dok.numPages; i++) {
    const hal = await dok.getPage(i);
    const dasar = hal.getViewport({ scale: 1 });
    // Setajam layar: lebar tampil ±794 px (210 mm) dikali kepadatan piksel layar.
    const tampak = hal.getViewport({ scale: (794 * Math.min(window.devicePixelRatio || 1, 2.5)) / dasar.width });
    const kanvas = document.createElement("canvas");
    kanvas.width = Math.ceil(tampak.width);
    kanvas.height = Math.ceil(tampak.height);
    await hal.render({ canvas: kanvas, viewport: tampak }).promise;
    const gambar = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, "image/png"));
    if (gambar) hasil.push({ url: URL.createObjectURL(gambar), lebar: dasar.width, tinggi: dasar.height });
  }
  await tugas.destroy();
  return hasil;
}

export function PratinjauPdf() {
  const jalur = usePathname();
  const cari = useSearchParams();
  const aktif = !jalur.endsWith("/kwitansi") && !cari.has("_mesin");
  const [halaman, setHalaman] = useState<Halaman[]>([]);
  const [keadaan, setKeadaan] = useState<"memuat" | "siap" | "gagal">("memuat");
  const urutan = useRef(0);

  useEffect(() => {
    if (!aktif) return;
    let tunda: ReturnType<typeof setTimeout> | undefined;
    const susun = () => {
      const ke = ++urutan.current;
      setKeadaan("memuat");
      buatPdf({ simpan: true })
        .then(({ berkas }) => gambarHalaman(berkas))
        .then((baru) => {
          // Pilihan sudah berganti lagi selagi menunggu — hasil lama dibuang.
          if (ke !== urutan.current) return baru.forEach((h) => URL.revokeObjectURL(h.url));
          setHalaman((lama) => {
            lama.forEach((h) => URL.revokeObjectURL(h.url));
            return baru;
          });
          setKeadaan("siap");
          document.documentElement.dataset.pratinjau = "pdf";
        })
        .catch(() => {
          if (ke !== urutan.current) return;
          setKeadaan("gagal");
          delete document.documentElement.dataset.pratinjau;
        });
    };
    // Ukuran isi diganti → susun ulang (sesudah skalanya terpasang & tidak berganti lagi).
    const saatSkala = () => {
      clearTimeout(tunda);
      tunda = setTimeout(susun, 300);
    };
    window.addEventListener("skala-cetak", saatSkala);
    saatSkala();
    return () => {
      clearTimeout(tunda);
      window.removeEventListener("skala-cetak", saatSkala);
      delete document.documentElement.dataset.pratinjau;
    };
  }, [aktif, jalur, cari]);

  if (!aktif) return null;
  const n = halaman.length;
  const a5 = n > 0 && halaman[0].lebar > halaman[0].tinggi;

  // Halaman pertama belum jadi: tampilan lama tetap terlihat di bawah, di sini cukup status.
  if (!n)
    return (
      <div className="mb-2 flex w-full max-w-[210mm] justify-end print:hidden">
        {keadaan === "gagal" ? (
          <span className="text-xs text-perhatian">Pratinjau per halaman gagal dibuat — tampilan di bawah tetap bisa diunduh &amp; dicetak.</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium shadow-[0_1px_2px_rgb(31_42_92/0.08)]">
            <LoaderCircle className="size-3.5 animate-spin" />
            Menyiapkan pratinjau per halaman…
          </span>
        )}
      </div>
    );

  return (
    <div className="flex w-full flex-col items-center print:hidden">
      <div className="mb-3 flex w-full max-w-[210mm] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
        <FileText className="size-4" strokeWidth={1.75} />
        <span>Pratinjau halaman asli</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">
          {a5 ? "A5 mendatar" : "A4"} · <b className="font-semibold text-foreground">{n} halaman</b>
        </span>
        {keadaan === "memuat" ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-[0_1px_2px_rgb(31_42_92/0.08)]">
            <LoaderCircle className="size-3.5 animate-spin" />
            Menyusun ulang halaman…
          </span>
        ) : keadaan === "gagal" ? (
          <span className="ml-auto text-xs text-perhatian">Gagal menyusun ulang — halaman di bawah belum memakai ukuran terbaru.</span>
        ) : null}
      </div>
      {n ? (
        <ol className={cn("flex w-full flex-col items-center gap-7 transition-opacity duration-300", keadaan === "memuat" && "opacity-55")} aria-label={`${n} halaman`}>
          {halaman.map((h, i) => (
            <li key={h.url} className="flex w-full flex-col items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.url}
                alt={`Halaman ${i + 1} dari ${n}`}
                style={{ aspectRatio: `${h.lebar} / ${h.tinggi}` }}
                className="w-full max-w-[210mm] rounded-[3px] bg-white shadow-[0_1px_2px_rgba(31,42,92,0.06),0_18px_40px_-16px_rgba(31,42,92,0.28)] ring-1 ring-black/[0.04]"
              />
              <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground tabular-nums shadow-[0_1px_2px_rgb(31_42_92/0.06)]">
                Halaman {i + 1} dari {n}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
