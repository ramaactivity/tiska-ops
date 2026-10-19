"use client";

import { ClipboardList, LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { buatPrDariTanggal } from "../belanja/actions";

/** Buat daftar belanja (PR) dari Kebutuhan Bahan tanggal ini (D-075). */
export function TombolBuatPr({ tanggal, lagi }: { tanggal: string; lagi: boolean }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      variant={lagi ? "outline" : "default"}
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          try {
            await buatPrDariTanggal(tanggal);
          } catch (e) {
            if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
            toast.error(e instanceof Error ? e.message : "Gagal membuat PR.");
          }
        })
      }
    >
      {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ClipboardList className="size-4" />}
      {lagi ? "Buat PR baru" : "Buat daftar belanja (PR)"}
    </Button>
  );
}
