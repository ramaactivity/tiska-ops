import { CalendarClock, ExternalLink, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { wajibIzin } from "@/lib/rbac";

import { bacaKontrol } from "./actions";
import { PanelKontrol } from "./panel-kontrol";

export const metadata: Metadata = { title: "Kontrol Dapur" };
export const dynamic = "force-dynamic";

const TOMBOL =
  "inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent";

/* Kontrol Dapur (docs/23, D-234): ruang kontrol TV — status layar, tayangan, pengumuman, running text.
   Jadwal masak per pesanan pindah ke Operasional → Jadwal Masak (docs/24). */
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
          <>
            <Link href="/jadwal-masak" className={TOMBOL}>
              <CalendarClock className="size-4" /> Jadwal Masak
            </Link>
            <a href="/layar-dapur" target="_blank" rel="noopener noreferrer" className={TOMBOL}>
              <ExternalLink className="size-4" /> Buka tampilan TV
            </a>
          </>
        }
      />
      <PanelKontrol awal={awal} />
    </Halaman>
  );
}
