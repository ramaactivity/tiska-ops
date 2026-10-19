"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { ajukanRekap } from "./rekap/actions";

export function TombolAjukanRekap({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          try {
            await ajukanRekap(id);
            toast.success("Rekap diajukan ke Finance.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal.");
          }
        })
      }
    >
      Ajukan rekap ke Finance
    </Button>
  );
}
