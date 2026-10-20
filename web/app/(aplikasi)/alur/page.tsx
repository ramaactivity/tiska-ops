import { Workflow } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { LANGKAH } from "@/lib/peta-alur";
import { wajibIzin } from "@/lib/rbac";

import { PetaAlur } from "./peta-alur";

export const metadata: Metadata = { title: "Peta Alur" };

/* Peta alur Tiska Ops (D-104): seluruh alur kerja dalam satu kanvas, klik kartu → penjelasan + buka menunya. */
export default async function HalamanAlur() {
  const sesi = await wajibIzin("alur");
  const izin = await bacaIzin();
  const boleh = Object.fromEntries(LANGKAH.map((l) => [l.id, l.kunci === null || bolehBuka(sesi.peran, l.kunci, izin)]));
  return (
    <Halaman>
      <KepalaHalaman ikon={Workflow} judul="Peta Alur" keterangan="Alur kerja Tiska Ops dari chat pertama sampai untung per acara. Pilih alur di kiri atau klik kartu untuk penjelasan dan langsung membuka menunya." />
      <PetaAlur boleh={boleh} />
    </Halaman>
  );
}
