"use client";

import { ImageDown, LoaderCircle, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Jenis = "png" | "jpg" | "wa";

const diam = () => () => {};
const bisaBagikanBerkas = () => Boolean(navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }));

/**
 * Unduh dokumen cetak sebagai gambar (PNG/JPG) — untuk dikirim cepat ke grup
 * WA dapur/tim tanpa membuka PDF. Yang difoto .lembar-cetak, selalu selebar
 * A4 supaya hasil dari HP sama dengan dari laptop (D-112). "Kirim ke WA"
 * membuka lembar bagikan HP dengan JPG-nya; browser tanpa fitur itu
 * (kebanyakan laptop) tidak menampilkan tombolnya.
 */
export function TombolGambar() {
  const [sedang, setSedang] = useState<"" | Jenis>("");
  const bisaBagikan = useSyncExternalStore(diam, bisaBagikanBerkas, () => false);

  async function buat(jenis: Jenis) {
    const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
    if (!lembar) return;
    setSedang(jenis);
    const lebarAsli = lembar.style.width;
    lembar.style.width = "210mm";
    try {
      const { toJpeg, toPng } = await import("html-to-image");
      const opsi = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true };
      const data = jenis === "png" ? await toPng(lembar, opsi) : await toJpeg(lembar, { ...opsi, quality: 0.92 });
      const nama = `${document.title.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")}.${jenis === "png" ? "png" : "jpg"}`;
      if (jenis === "wa") {
        lembar.style.width = lebarAsli;
        const berkas = new File([await (await fetch(data)).blob()], nama, { type: "image/jpeg" });
        try {
          await navigator.share({ files: [berkas] });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
        return;
      }
      const a = document.createElement("a");
      a.href = data;
      a.download = nama;
      a.click();
    } catch {
      toast.error("Gambar gagal dibuat. Coba lagi, atau pakai Cetak → PDF.");
    } finally {
      lembar.style.width = lebarAsli;
      setSedang("");
    }
  }

  return (
    <>
      {bisaBagikan && (
        <Button size="sm" disabled={Boolean(sedang)} onClick={() => buat("wa")}>
          {sedang === "wa" ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}
          Kirim ke WA
        </Button>
      )}
      {(["jpg", "png"] as const).map((j) => (
        <Button key={j} size="sm" variant="outline" disabled={Boolean(sedang)} onClick={() => buat(j)}>
          {sedang === j ? <LoaderCircle className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          {j.toUpperCase()}
        </Button>
      ))}
    </>
  );
}
