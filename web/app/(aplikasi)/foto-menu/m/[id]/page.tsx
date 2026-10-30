import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { HalamanGaleri } from "../../halaman-galeri";

export const metadata: Metadata = { title: "Foto Menu" };
export const dynamic = "force-dynamic";

export default async function HalamanFotoMenu({ params }: PageProps<"/foto-menu/m/[id]">) {
  await wajibIzin("foto-menu");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const m = await prisma.menus.findUnique({ where: { id: BigInt(id) }, select: { name: true, merged_into: true, menu_aliases: { select: { name: true } } } });
  if (!m) notFound();
  // Menu yang sudah digabung → galeri induknya (fotonya sudah pindah ke sana).
  if (m.merged_into) redirect(`/foto-menu/m/${m.merged_into}`);
  return (
    <HalamanGaleri
      where={{ menu_id: BigInt(id) }}
      judul={m.name}
      keterangan={`Ketuk foto untuk memilih, lalu Kirim ke WA atau Unduh.${m.menu_aliases.length ? ` Juga dikenal sebagai: ${m.menu_aliases.map((a) => a.name).join(", ")}.` : ""}`}
      tujuan={{ idMenu: id }}
    />
  );
}
