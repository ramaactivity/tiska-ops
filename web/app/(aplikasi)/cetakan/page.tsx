import { Printer } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { daftarCetakan, daftarPermintaan, opsiPercetakan } from "@/lib/cetakan";
import { GRUP_CETAKAN } from "@/lib/hitung/cetakan";
import { aksesPenuh, bolehLihatBiaya } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";

import { KatalogCetakan } from "./katalog-cetakan";

export const metadata: Metadata = { title: "Cetakan" };
export const dynamic = "force-dynamic";

/* Cetakan (D-182 katalog & pesan WA, D-183 stok & minta cetak, docs/19). */
export default async function HalamanCetakan({ searchParams }: PageProps<"/cetakan">) {
  const sesi = await wajibIzin("cetakan");
  const { grup, tab } = await searchParams;
  const lihatHarga = bolehLihatBiaya(sesi.peran);
  const bolehUbah = aksesPenuh(sesi.peran);
  const [semua, permintaan, percetakan] = await Promise.all([daftarCetakan(lihatHarga), daftarPermintaan(bolehUbah, BigInt(sesi.id)), bolehUbah ? opsiPercetakan() : []]);
  const aktif = typeof grup === "string" && grup in GRUP_CETAKAN ? grup : "";

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Printer}
        judul="Cetakan"
        jumlah={semua.length}
        keterangan={
          bolehUbah
            ? "Nama menu, kartu ucapan, stiker, dan label Tiska. Pilih cetakan & lembar A3, lalu kirim pesannya ke percetakan."
            : "Stiker, label, dan cetakan Tiska. Catat stok di rak, dan minta cetak kalau sudah mau habis."
        }
      />
      <KatalogCetakan
        semua={semua}
        permintaan={permintaan}
        tab={tab === "permintaan" ? "permintaan" : "katalog"}
        grupAktif={aktif}
        lihatHarga={lihatHarga}
        bolehUbah={bolehUbah}
        idSaya={sesi.id.toString()}
        percetakan={percetakan}
      />
    </Halaman>
  );
}
