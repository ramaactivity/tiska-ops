import type { Prisma } from "@prisma/client";
import { ChevronLeft, Images } from "lucide-react";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { daftarFoto, opsiTujuan } from "@/lib/foto-menu";
import { aksesPenuh } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";

import { Galeri } from "./galeri";
import { TombolKeranjang } from "./link-galeri";

/** Kerangka halaman galeri satu menu / paket / "Belum ditandai" (D-124). */
export async function HalamanGaleri({
  where,
  judul,
  keterangan,
  tujuan,
}: {
  where: Prisma.menu_photosWhereInput;
  judul: string;
  keterangan: string;
  tujuan: { idMenu?: string; idPaket?: string } | null;
}) {
  const sesi = await wajibIzin("foto-menu");
  const [foto, opsi] = await Promise.all([daftarFoto(where), opsiTujuan()]);
  return (
    <Halaman>
      <Link href="/foto-menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Foto Menu
      </Link>
      <KepalaHalaman ikon={Images} judul={judul} jumlah={foto.filter((f) => !f.sembunyi).length} keterangan={keterangan} aksi={<TombolKeranjang />} />
      <Galeri foto={foto} judul={judul} tujuan={tujuan} opsiMenu={opsi.menu} opsiPaket={opsi.paket} bolehHapus={aksesPenuh(sesi.peran)} />
    </Halaman>
  );
}
