import { BookOpen, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bolehKelolaPricelist } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormPricelistBaru } from "./form-pricelist-baru";

export const metadata: Metadata = { title: "Pricelist baru" };
export const dynamic = "force-dynamic";

export default async function HalamanPricelistBaru() {
  const sesi = await wajibIzin("pricelist");
  if (!bolehKelolaPricelist(sesi.peran)) redirect("/pricelist?akses=ditolak");
  const segmen = await prisma.pricelists.findMany({ select: { segment: true }, distinct: ["segment"] });

  return (
    <Halaman>
      <Link href="/pricelist" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Pricelist
      </Link>
      <KepalaHalaman ikon={BookOpen} judul="Pricelist baru" keterangan="Isi namanya, pilih PDF-nya, simpan. Link /pl untuk klien langsung jadi." />
      <FormPricelistBaru saranSegmen={segmen.map((s) => s.segment ?? "").filter(Boolean)} />
    </Halaman>
  );
}
