import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { HalamanGaleri } from "../../halaman-galeri";

export const metadata: Metadata = { title: "Foto Paket" };
export const dynamic = "force-dynamic";

export default async function HalamanFotoPaket({ params }: PageProps<"/foto-menu/p/[id]">) {
  await wajibIzin("foto-menu");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const p = await prisma.packages.findUnique({ where: { id: BigInt(id) }, select: { code: true, name: true } });
  if (!p) notFound();
  return (
    <HalamanGaleri
      where={{ package_id: BigInt(id) }}
      judul={`${p.code} ${p.name}`}
      keterangan="Foto satu paket utuh (satu box lengkap, satu meja buffet). Ketuk foto untuk memilih, lalu Kirim ke WA atau Unduh."
      tujuan={{ idPaket: id }}
    />
  );
}
