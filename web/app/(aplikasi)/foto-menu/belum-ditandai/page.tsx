import type { Metadata } from "next";

import { HalamanGaleri } from "../halaman-galeri";

export const metadata: Metadata = { title: "Foto belum ditandai" };
export const dynamic = "force-dynamic";

/* Kotak masuk unggahan massal (arsip Google Drive): unggah dulu, tandai menu belakangan (D-124). */
export default async function HalamanBelumDitandai() {
  return (
    <HalamanGaleri
      where={{ menu_id: null, package_id: null }}
      judul="Belum ditandai"
      keterangan="Unggah banyak foto sekaligus (mis. satu folder dokumentasi dari Google Drive), lalu pilih beberapa foto → Tandai ke menu. Foto yang sudah ditandai pindah ke galeri menunya."
      tujuan={null}
    />
  );
}
