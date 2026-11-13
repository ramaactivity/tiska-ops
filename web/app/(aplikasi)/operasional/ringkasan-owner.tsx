"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";

/**
 * Ringkasan harian owner (D-093): malam / pagi / sore, siap disalin atau dibuka
 * di WA (dikirim sendiri — tidak ada pesan otomatis). Hermes memakai generator
 * yang sama nanti.
 */
export function RingkasanOwner({ malam, pagi, sore, bawaan }: { malam: string; pagi: string; sore: string; bawaan: "malam" | "pagi" | "sore" }) {
  const [pilih, setPilih] = useState<string>(bawaan);
  const teks = pilih === "malam" ? malam : pilih === "pagi" ? pagi : sore;
  return (
    <section className="flex flex-col gap-3 kartu p-4">
      <h2 className="eyebrow">Ringkasan untuk owner</h2>
      <PilihanChip
        kecil
        label="Waktu ringkasan"
        nilai={pilih}
        onPilih={setPilih}
        pilihan={[
          { nilai: "malam", label: "🌙 Malam" },
          { nilai: "pagi", label: "☀️ Pagi" },
          { nilai: "sore", label: "🌇 Sore" },
        ]}
      />
      <pre className="max-h-80 overflow-auto rounded-xl bg-muted/50 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">{teks}</pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(teks).then(() => toast.success("Ringkasan disalin."))}>
          <Copy className="size-4" />
          Salin
        </Button>
        <Button size="sm" variant="outline" render={<a href={`https://wa.me/?text=${encodeURIComponent(teks)}`} target="_blank" rel="noreferrer" />}>
          <MessageCircle className="size-4" />
          Buka WA
        </Button>
      </div>
    </section>
  );
}
