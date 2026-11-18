"use client";

import { ImageDown, LoaderCircle, Send, Share2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { buatPdf } from "@/components/tombol-pdf";
import { Button } from "@/components/ui/button";

type Jenis = "png" | "jpg" | "wa";

const diam = () => () => {};
const bisaBagikanBerkas = () => Boolean(navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }));
const bisaBagikanPdf = () => Boolean(navigator.canShare?.({ files: [new File([""], "x.pdf", { type: "application/pdf" })] }));

/** Dokumen untuk klien (quotation, invoice, kwitansi) dikirim sebagai PDF; lembar dapur, DO, surat jalan, BAST tetap gambar (D-203). */
const DOKUMEN_KLIEN = /^\/((tagihan|penawaran)\/\d+\/cetak|pembayaran\/\d+\/kwitansi)$/;

/**
 * Unduh dokumen cetak sebagai gambar (PNG/JPG) — untuk dikirim cepat ke grup
 * WA dapur/tim tanpa membuka PDF. Quotation, invoice & kwitansi dikirim ke WA sebagai PDF (D-203). Yang difoto .lembar-cetak, selalu selebar
 * A4 supaya hasil dari HP sama dengan dari laptop (D-112). "Kirim ke WA"
 * membuka lembar bagikan dengan JPG-nya; browser tanpa fitur itu mengunduh berkasnya lalu menawarkan
 * membuka WhatsApp (tombolnya selalu ada).
 */
export function TombolGambar() {
  const [sedang, setSedang] = useState<"" | Jenis>("");
  const pdfKlien = DOKUMEN_KLIEN.test(usePathname());
  const bisaBagikan = useSyncExternalStore(diam, pdfKlien ? bisaBagikanPdf : bisaBagikanBerkas, () => false);
  // PDF dibuat di server 2–9 dtk, lebih lama dari izin browser membuka lembar bagikan sesudah klik (±5 dtk).
  // Bila terlewat, berkasnya disimpan di sini dan tombol menjadi "Kirim PDF sekarang" (satu klik lagi).
  const [pdfSiap, setPdfSiap] = useState<File | null>(null);

  /**
   * Browser tanpa lembar bagikan (mis. Firefox di laptop): tombol TETAP ada (Rama: "kirim ke WA jangan
   * dihilangkan") — berkasnya diunduh, lalu satu ketuk membuka WhatsApp untuk dilampirkan di chat.
   */
  function unduhLaluWa(berkas: File) {
    const url = URL.createObjectURL(berkas);
    const a = document.createElement("a");
    a.href = url;
    a.download = berkas.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(`${berkas.name} tersimpan di Unduhan — lampirkan di chat WhatsApp.`, {
      action: { label: "Buka WhatsApp", onClick: () => window.open("https://web.whatsapp.com/", "_blank", "noopener") },
      duration: 10_000,
    });
  }

  /** Hanya berkasnya — tanpa teks/tautan yang ikut terkirim ke chat klien (Rama, 18 Nov). */
  async function bagikanPdf(berkas: File) {
    if (!bisaBagikan) return unduhLaluWa(berkas);
    try {
      await navigator.share({ files: [berkas] });
      setPdfSiap(null);
    } catch (e) {
      const n = (e as Error).name;
      if (n === "AbortError") return setPdfSiap(null);
      if (n === "NotAllowedError") return setPdfSiap(berkas);
      throw e;
    }
  }

  async function kirimPdf() {
    if (pdfSiap) return bagikanPdf(pdfSiap).catch(() => toast.error("PDF gagal dibagikan. Pakai Unduh PDF lalu lampirkan manual."));
    setSedang("wa");
    try {
      const { berkas, nama } = await buatPdf();
      await bagikanPdf(new File([berkas], nama, { type: "application/pdf" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF gagal dibuat. Coba lagi.");
    } finally {
      setSedang("");
    }
  }

  async function buat(jenis: Jenis) {
    const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
    if (!lembar) return;
    setSedang(jenis);
    const lebarAsli = lembar.style.width;
    lembar.style.width = "210mm";
    try {
      const { toJpeg, toPng } = await import("html-to-image");
      // Kotak bantu khusus layar (mis. "Area e-meterai") tidak ikut ke gambar.
      const opsi = {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        filter: (n: Node) => !(n instanceof HTMLElement && "hanyaLayar" in n.dataset),
      };
      const data = jenis === "png" ? await toPng(lembar, opsi) : await toJpeg(lembar, { ...opsi, quality: 0.92 });
      const nama = `${document.title.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")}.${jenis === "png" ? "png" : "jpg"}`;
      if (jenis === "wa") {
        lembar.style.width = lebarAsli;
        const berkas = new File([await (await fetch(data)).blob()], nama, { type: "image/jpeg" });
        if (!bisaBagikan) return unduhLaluWa(berkas);
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
      <Button
        size="sm"
        variant={pdfSiap ? "default" : "outline"}
        disabled={Boolean(sedang)}
        onClick={() => (pdfKlien ? kirimPdf() : buat("wa"))}
      >
        {sedang === "wa" ? <LoaderCircle className="size-4 animate-spin" /> : pdfSiap ? <Send className="size-4" /> : <Share2 className="size-4" />}
        {sedang === "wa" && pdfKlien ? "Menyiapkan PDF…" : pdfSiap ? "Kirim PDF sekarang" : pdfKlien ? "Kirim PDF ke WA" : "Kirim ke WA"}
      </Button>
      {(["jpg", "png"] as const).map((j) => (
        <Button key={j} size="sm" variant="outline" disabled={Boolean(sedang)} onClick={() => buat(j)}>
          {sedang === j ? <LoaderCircle className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          {j.toUpperCase()}
        </Button>
      ))}
    </>
  );
}
