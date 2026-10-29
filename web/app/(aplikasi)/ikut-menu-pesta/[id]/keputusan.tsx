"use client";

import { Check, LoaderCircle, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { putuskanProgram } from "../actions";

/** Setujui / Kembalikan / Tolak — catatan wajib untuk dua yang terakhir (dicek ulang di server). */
export function KeputusanProgram({ id }: { id: string }) {
  const router = useRouter();
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  const putus = (k: "disetujui" | "dikembalikan" | "ditolak") =>
    mulai(async () => {
      const r = await putuskanProgram(id, k, catatan);
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      toast.success({ disetujui: "Program disetujui — bahan flyer siap.", dikembalikan: "Dikembalikan ke pengusul.", ditolak: "Program ditolak." }[k]);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <Textarea aria-label="Catatan keputusan" placeholder="Catatan (wajib bila dikembalikan atau ditolak)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-full" disabled={menunggu} onClick={() => putus("disetujui")}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          Setujui
        </Button>
        <Button type="button" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => putus("dikembalikan")}>
          <Undo2 className="size-4" />
          Kembalikan
        </Button>
        <Button type="button" variant="destructive" className="rounded-full" disabled={menunggu} onClick={() => putus("ditolak")}>
          <X className="size-4" />
          Tolak
        </Button>
      </div>
    </div>
  );
}
