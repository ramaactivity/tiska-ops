import { BellRing, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { opsiAcara } from "@/lib/aset";
import { hariIniWib } from "@/lib/kalender";
import { opsiPic } from "@/lib/pengingat-bayar";
import { wajibIzin } from "@/lib/rbac";

import { FormTagihan } from "../form-tagihan";

export const metadata: Metadata = { title: "Tagihan baru" };
export const dynamic = "force-dynamic";

export default async function HalamanTagihanBaru() {
  await wajibIzin("pengingat-bayar");
  const [pic, acara] = await Promise.all([opsiPic(), opsiAcara()]);
  return (
    <Halaman>
      <Link href="/pengingat-bayar" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Pengingat Bayar
      </Link>
      <KepalaHalaman ikon={BellRing} judul="Tagihan baru" keterangan="Yang rutin cukup dimasukkan sekali — jatuh temponya maju sendiri setiap kali dicatat dibayar." />
      <FormTagihan
        awal={{ id: null, nama: "", kategori: "lainnya", nominal: "", ulangi: "1", jatuhTempo: hariIniWib(), ingatkan: 3, kodeBayar: "", tujuanBayar: "", catatan: "", foto: [], pic: null, acara: null }}
        opsiPic={pic}
        opsiAcara={acara}
      />
    </Halaman>
  );
}
