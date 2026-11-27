import { ExternalLink, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { wajibIzin } from "@/lib/rbac";

import { bacaKontrol } from "./actions";
import { PanelKontrol } from "./panel-kontrol";

export const metadata: Metadata = { title: "Kontrol Dapur" };
export const dynamic = "force-dynamic";

/* Kontrol Dapur MVP (docs/23 §6 P1): ruang kontrol layar TV dapur — status layar, tayangan, pengumuman, running text. */
export default async function HalamanKontrolDapur() {
  await wajibIzin("kontrol-dapur");
  const awal = await bacaKontrol();
  return (
    <Halaman>
      <KepalaHalaman
        judul="Kontrol Dapur"
        ikon={SlidersHorizontal}
        keterangan="Atur apa yang tampil di TV dapur, umumkan sesuatu, dan pastikan layarnya menyala dan bersuara."
        aksi={
          <a
            href="/layar-dapur"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink className="size-4" /> Buka tampilan TV
          </a>
        }
      />
      <PanelKontrol awal={awal} />
    </Halaman>
  );
}
