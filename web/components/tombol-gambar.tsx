"use client";

import { ImageDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Unduh dokumen cetak sebagai gambar (PNG/JPG) — untuk dikirim cepat ke grup
 * WA dapur/tim tanpa membuka PDF. Yang difoto persis .lembar-cetak di layar.
 */
export function TombolGambar() {
  const [sedang, setSedang] = useState<"" | "png" | "jpg">("");

  async function unduh(jenis: "png" | "jpg") {
    const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
    if (!lembar) return;
    setSedang(jenis);
    try {
      const { toJpeg, toPng } = await import("html-to-image");
      const opsi = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true };
      const data = jenis === "png" ? await toPng(lembar, opsi) : await toJpeg(lembar, { ...opsi, quality: 0.92 });
      const a = document.createElement("a");
      a.href = data;
      a.download = `${document.title.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")}.${jenis}`;
      a.click();
    } catch {
      toast.error("Gambar gagal dibuat. Coba lagi, atau pakai Cetak → PDF.");
    } finally {
      setSedang("");
    }
  }

  return (
    <>
      {(["jpg", "png"] as const).map((j) => (
        <Button key={j} size="sm" variant="outline" disabled={Boolean(sedang)} onClick={() => unduh(j)}>
          {sedang === j ? <LoaderCircle className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          {j.toUpperCase()}
        </Button>
      ))}
    </>
  );
}
