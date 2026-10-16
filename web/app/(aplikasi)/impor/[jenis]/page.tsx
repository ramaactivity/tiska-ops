import { ChevronLeft, FileUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { DEFINISI_IMPOR } from "@/lib/impor/definisi";
import { wajibIzin } from "@/lib/rbac";

import { FormImpor } from "./form-impor";

export const metadata: Metadata = { title: "Impor Excel / CSV" };
export const dynamic = "force-dynamic";

export default async function HalamanImpor({ params }: PageProps<"/impor/[jenis]">) {
  const def = DEFINISI_IMPOR[(await params).jenis];
  if (!def) notFound();
  await wajibIzin(def.izin);

  return (
    <Halaman>
      <Link href={def.kembali} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {def.judul}
      </Link>
      <KepalaHalaman ikon={FileUp} judul={`Impor ${def.judul.toLowerCase()} dari Excel / CSV`} keterangan="Tambah banyak data sekaligus. Data diperiksa dulu — tidak ada yang tersimpan sebelum Anda menekan Impor." />
      <FormImpor jenis={def.jenis} judul={def.judul} kembali={def.kembali} duplikat={def.duplikat} kolom={def.kolom} />
    </Halaman>
  );
}
