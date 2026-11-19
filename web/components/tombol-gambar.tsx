"use client";

import { ImageDown, LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { KirimWa } from "@/components/kirim-wa";
import { buatPdf } from "@/components/tombol-pdf";
import { Button } from "@/components/ui/button";

/** Dokumen untuk klien (quotation, invoice, kwitansi) dikirim sebagai PDF; lembar dapur, DO, surat jalan, BAST tetap gambar (D-203). */
const DOKUMEN_KLIEN = /^\/((tagihan|penawaran)\/\d+\/cetak|pembayaran\/\d+\/kwitansi)$/;

/**
 * Unduh dokumen cetak sebagai gambar (PNG/JPG) — untuk dikirim cepat ke grup
 * WA dapur/tim tanpa membuka PDF. Quotation, invoice & kwitansi dikirim ke WA sebagai PDF (D-203). Yang difoto .lembar-cetak, selalu selebar
 * A4 supaya hasil dari HP sama dengan dari laptop (D-112). "Kirim ke WA": lihat components/kirim-wa (D-206).
 */
export function TombolGambar() {
  const [sedang, setSedang] = useState<"" | "png" | "jpg">("");
  const pdfKlien = DOKUMEN_KLIEN.test(usePathname());

  async function unduhGambar(jenis: "png" | "jpg") {
    setSedang(jenis);
    try {
      const { data, nama } = await gambarLembar(jenis);
      const a = document.createElement("a");
      a.href = data;
      a.download = nama;
      a.click();
    } catch {
      toast.error("Gambar gagal dibuat. Coba lagi, atau pakai Cetak → PDF.");
    } finally {
      setSedang("");
    }
  }

  return (
    <>
      {/* Satu baris penuh; JPG & PNG berdua di bawahnya. */}
      <div className="col-span-2 grid">
        <KirimWa
          label={pdfKlien ? "Kirim PDF ke WA" : "Kirim ke WA"}
          siapkan={async () => {
            if (pdfKlien) {
              const { berkas, nama } = await buatPdf();
              return new File([berkas], nama, { type: "application/pdf" });
            }
            const { data, nama } = await gambarLembar("jpg");
            return new File([await (await fetch(data)).blob()], nama, { type: "image/jpeg" });
          }}
        />
      </div>
      {(["jpg", "png"] as const).map((j) => (
        <Button key={j} size="sm" variant="outline" disabled={Boolean(sedang)} onClick={() => unduhGambar(j)}>
          {sedang === j ? <LoaderCircle className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
          {j.toUpperCase()}
        </Button>
      ))}
    </>
  );
}

/** .lembar-cetak sebagai gambar, selalu selebar A4 (D-112); kotak bantu khusus layar tidak ikut. */
async function gambarLembar(jenis: "png" | "jpg"): Promise<{ data: string; nama: string }> {
  const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
  if (!lembar) throw new Error("Lembar dokumen tidak ditemukan.");
  const lebarAsli = lembar.style.width;
  lembar.style.width = "210mm";
  try {
    const { toJpeg, toPng } = await import("html-to-image");
    const opsi = {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (n: Node) => !(n instanceof HTMLElement && "hanyaLayar" in n.dataset),
      // Saat pratinjau halaman asli aktif (D-205) lembar ini dipindah ke luar layar (left: -10000px). html-to-image
      // menyalin posisi itu ke salinannya → isinya tergambar di luar bingkai → gambar putih kosong (laporan Mbak
      // Rakhma 19 Nov, HP Android; terulang juga di iPhone & laptop). Salinan dikembalikan ke posisi normal.
      style: { position: "static", left: "0", top: "0", margin: "0" },
    };
    const data = jenis === "png" ? await toPng(lembar, opsi) : await toJpeg(lembar, { ...opsi, quality: 0.92 });
    return { data, nama: `${document.title.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")}.${jenis}` };
  } finally {
    lembar.style.width = lebarAsli;
  }
}
