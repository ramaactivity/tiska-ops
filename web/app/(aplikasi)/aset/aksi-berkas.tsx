"use client";

import { Download } from "lucide-react";

import { KirimWa } from "@/components/kirim-wa";
import { Button } from "@/components/ui/button";
import { FOLDER_UNDUH } from "@/lib/kit-brand";

/** Unduh + Kirim ke WA (D-228) untuk satu file kit brand — Kirim ke WA memakai alur yang sama dengan halaman cetak (D-206). */
export function AksiBerkas({ file }: { file: string }) {
  const alamat = `${FOLDER_UNDUH}/${file}`;
  return (
    <div className="mt-auto flex flex-wrap gap-2">
      <Button variant="outline" size="sm" render={<a href={alamat} download />} className="rounded-full">
        <Download className="size-4" />
        Unduh PNG
      </Button>
      <KirimWa
        label="Kirim ke WA"
        className="rounded-full"
        siapkan={async () => {
          const r = await fetch(alamat);
          if (!r.ok) throw new Error("File logo gagal diambil. Periksa koneksi, lalu coba lagi.");
          return new File([await r.blob()], file, { type: "image/png" });
        }}
      />
    </div>
  );
}
