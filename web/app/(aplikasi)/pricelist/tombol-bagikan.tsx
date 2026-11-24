"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { KirimWa } from "@/components/kirim-wa";

import { catatPricelist } from "./actions";

/**
 * Tiga aksi sales untuk satu pricelist. "Kirim PDF ke WA" mengirim BERKAS PDF-nya saja, tanpa teks/link
 * (Rama 24 Nov, D-229) — lewat KirimWa yang sama dengan halaman cetak: HP lembar bagikan, laptop Aplikasi /
 * WhatsApp Web. Sales sendiri yang memilih kontak & menekan kirim. Versi ringan dipakai bila ada (lebih
 * cepat terkirim). Salin link & Buka tetap untuk yang butuh link /pl. Setiap aksi dicatat.
 */
export function TombolBagikan({
  id,
  nama,
  tautan,
  berkas,
}: {
  id: string;
  nama: string;
  tautan: string;
  berkas: { id: string; ringan: boolean };
}) {
  const catat = (jenis: "wa" | "salin" | "buka") => {
    void catatPricelist(id, jenis).catch(() => {});
  };
  const kelas =
    "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors hover:bg-accent";
  // "Pricelist Artisan Holiday Hampers - Tiska Catering.pdf" — nama yang terbaca di chat klien.
  const namaBerkas = `Pricelist ${nama} - Tiska Catering.pdf`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ");

  return (
    <div className="flex flex-wrap gap-2">
      <div className="grid min-w-40 flex-1">
        <KirimWa
          label="Kirim PDF ke WA"
          className="min-h-11 rounded-full border-transparent bg-primary text-sm text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          siapkan={async () => {
            const r = await fetch(`/pricelist/berkas/${berkas.id}${berkas.ringan ? "?jenis=ringan" : ""}`);
            if (!r.ok) throw new Error("PDF gagal diambil. Periksa koneksi, lalu coba lagi.");
            catat("wa");
            return new File([await r.blob()], namaBerkas, { type: "application/pdf" });
          }}
        />
      </div>
      <button
        type="button"
        className={kelas}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(tautan);
            toast.success("Link disalin");
            catat("salin");
          } catch {
            toast.error("Gagal menyalin. Tekan lama link-nya lalu salin manual.");
          }
        }}
      >
        <Copy className="size-4" /> Salin link
      </button>
      <a href={tautan} target="_blank" rel="noopener noreferrer" onClick={() => catat("buka")} className={kelas}>
        <ExternalLink className="size-4" /> Buka
      </a>
    </div>
  );
}
