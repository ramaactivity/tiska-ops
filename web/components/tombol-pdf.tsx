"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Unduh PDF langsung, tanpa dialog cetak (Rama, 16 Nov 2026). PDF dibuat di server oleh Chrome dari halaman yang
 * sama (app/api/pdf), jadi hasilnya sama dengan "Save as PDF". Ukuran isi (Muat 1 halaman / %) dan geser blanko
 * kwitansi hidup di browser ini, jadi ikut dikirim supaya PDF-nya sama persis dengan yang terlihat.
 */
/**
 * PDF dokumen halaman ini, dibuat di server (app/api/pdf) dengan ukuran isi & geser yang sedang dipakai — dipakai
 * "Unduh PDF" dan "Kirim ke WA" untuk dokumen klien (D-203), supaya keduanya berkas yang sama.
 */
export async function buatPdf(): Promise<{ berkas: Blob; nama: string }> {
  const gaya = getComputedStyle(document.documentElement);
  const q = new URLSearchParams({ jalur: location.pathname + location.search });
  const isi = (nama: string, kunci: string) => {
    const v = Number.parseFloat(gaya.getPropertyValue(nama));
    if (Number.isFinite(v)) q.set(kunci, String(v));
  };
  isi("--skala-cetak", "skala");
  isi("--geser-x", "gx");
  isi("--geser-y", "gy");
  const r = await fetch(`/api/pdf?${q}`);
  if (!r.ok) throw new Error((await r.text()) || `PDF gagal dibuat (${r.status}).`);
  const nama = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "dokumen.pdf";
  return { berkas: await r.blob(), nama };
}

export function TombolPdf() {
  const [sedang, setSedang] = useState(false);

  async function unduh() {
    setSedang(true);
    try {
      const { berkas, nama } = await buatPdf();
      const url = URL.createObjectURL(berkas);
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success(`${nama} tersimpan di folder Unduhan.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF gagal dibuat. Coba lagi, atau pakai Cetak → Save as PDF.");
    } finally {
      setSedang(false);
    }
  }

  return (
    <Button size="lg" className="h-12 w-full justify-start gap-2.5 rounded-[12px] text-base" disabled={sedang} onClick={unduh}>
      {sedang ? <LoaderCircle className="size-5 animate-spin" /> : <FileDown className="size-5" strokeWidth={1.75} />}
      {sedang ? "Menyiapkan PDF…" : "Unduh PDF"}
    </Button>
  );
}
