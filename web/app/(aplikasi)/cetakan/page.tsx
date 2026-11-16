import { Printer } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { daftarCetakan, opsiPercetakan } from "@/lib/cetakan";
import { GRUP_CETAKAN } from "@/lib/hitung/cetakan";
import { bolehLihatBiaya } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";

import { KatalogCetakan } from "./katalog-cetakan";

export const metadata: Metadata = { title: "Cetakan" };
export const dynamic = "force-dynamic";

/* Cetakan (D-182, docs/19 tahap 1): katalog bergambar + susun pesan WhatsApp ke percetakan. */
export default async function HalamanCetakan({ searchParams }: PageProps<"/cetakan">) {
  const sesi = await wajibIzin("cetakan");
  const { grup } = await searchParams;
  const lihatHarga = bolehLihatBiaya(sesi.peran);
  const [semua, percetakan] = await Promise.all([daftarCetakan(lihatHarga), opsiPercetakan()]);
  const aktif = typeof grup === "string" && grup in GRUP_CETAKAN ? grup : "";

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Printer}
        judul="Cetakan"
        jumlah={semua.length}
        keterangan="Nama menu, kartu ucapan, stiker, dan label Tiska. Pilih cetakan, isi jumlah lembar A3, lalu kirim pesannya ke percetakan."
      />
      <KatalogCetakan semua={semua} grupAktif={aktif} lihatHarga={lihatHarga} percetakan={percetakan} />
    </Halaman>
  );
}
