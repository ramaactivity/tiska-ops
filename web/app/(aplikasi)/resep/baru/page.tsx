import { ChefHat, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { kodeBerikutnya } from "@/lib/kode-master";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { AWALAN_KODE_RESEP } from "@/lib/resep";

import { FormResep } from "../[id]/form-resep";

export const metadata: Metadata = { title: "Resep baru" };
export const dynamic = "force-dynamic";

export default async function HalamanResepBaru() {
  const sesi = await wajibIzin("resep");
  if (!bolehUbahResep(sesi.peran)) redirect("/resep?akses=ditolak");
  const kode = await prisma.recipes.findMany({ where: { code: { startsWith: AWALAN_KODE_RESEP } }, select: { code: true } });

  return (
    <Halaman>
      <Link href="/resep" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Resep
      </Link>
      <KepalaHalaman
        ikon={ChefHat}
        judul="Resep baru"
        keterangan="Langkah 1: nama, status, dan porsi. Setelah disimpan, langsung lanjut mengisi bahan & takarannya."
      />
      <section className="max-w-2xl rounded-[14px] border bg-card p-5">
        <FormResep id="" nama="" saranKode={kodeBerikutnya(AWALAN_KODE_RESEP, kode.map((k) => k.code))} status="perkiraan" porsi={null} catatan={null} />
      </section>
    </Halaman>
  );
}
