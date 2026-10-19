"use client";

import { LoaderCircle, PackageMinus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { batalkanPemakaian, catatPemakaian } from "../stok/actions";

/** Catat / batalkan pemakaian bahan satu tanggal ke stok (D-087). */
export function TombolPemakaian({ tanggal, sudah }: { tanggal: string; sudah: boolean }) {
  const [menunggu, mulai] = useTransition();
  const [yakin, setYakin] = useState(false);
  const jalan = (kerja: () => Promise<void>) =>
    mulai(async () => {
      try {
        await kerja();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });
  if (sudah) {
    return yakin ? (
      <span className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Kembalikan stok tanggal ini?</span>
        <Button variant="outline" size="sm" onClick={() => setYakin(false)}>
          Tidak
        </Button>
        <Button size="sm" variant="destructive" disabled={menunggu} onClick={() => jalan(async () => { await batalkanPemakaian(tanggal); toast.success("Pemakaian dibatalkan, stok kembali."); setYakin(false); })}>
          Ya, batalkan
        </Button>
      </span>
    ) : (
      <Button variant="ghost" onClick={() => setYakin(true)}>
        Batalkan pemakaian
      </Button>
    );
  }
  return (
    <Button
      disabled={menunggu}
      onClick={() =>
        jalan(async () => {
          const h = await catatPemakaian(tanggal);
          toast.success(`Pemakaian ${h.dicatat} bahan tercatat.`);
          if (h.dilewati.length) toast.warning(`Satuan tidak cocok, catat manual di Stok: ${h.dilewati.join(", ")}`);
        })
      }
    >
      {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <PackageMinus className="size-4" />}
      Catat pemakaian tanggal ini
    </Button>
  );
}
