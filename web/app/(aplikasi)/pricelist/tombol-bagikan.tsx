"use client";

import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { teksWa } from "@/lib/pricelist";

import { catatPricelist } from "./actions";

/**
 * Tiga aksi sales untuk satu pricelist. "Kirim WA" hanya membuka WhatsApp
 * dengan teks siap kirim — sales sendiri yang memilih kontak dan menekan
 * kirim (tidak ada pesan otomatis ke klien). Setiap aksi dicatat.
 */
export function TombolBagikan({ id, nama, tautan }: { id: string; nama: string; tautan: string }) {
  const catat = (jenis: "wa" | "salin" | "buka") => {
    void catatPricelist(id, jenis).catch(() => {});
  };
  const kelas =
    "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors hover:bg-accent";

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(teksWa(nama, tautan))}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => catat("wa")}
        className={`${kelas} border-transparent bg-primary text-primary-foreground hover:bg-primary/90`}
      >
        <MessageCircle className="size-4" /> Kirim WA
      </a>
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
