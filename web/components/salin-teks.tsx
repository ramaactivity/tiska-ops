"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Salin teks ke clipboard untuk dikirim ke grup WA (brief tim D-050, daftar ulang tahun D-109). */
export function SalinTeks({ teks, label = "Salin" }: { teks: string; label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks);
          toast.success("Tersalin — tempel di grup WA tim.");
        } catch {
          toast.error("Browser menolak menyalin. Blok teksnya lalu salin manual.");
        }
      }}
    >
      <Copy className="size-4" />
      {label}
    </Button>
  );
}
