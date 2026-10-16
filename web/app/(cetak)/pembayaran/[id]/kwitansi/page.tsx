import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KwitansiCetak } from "@/components/kwitansi-cetak";
import { isiKwitansi } from "@/lib/kwitansi";
import { namaBerkasCetak } from "@/lib/nomor-tiska";
import { wajibIzin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/pembayaran/[id]/kwitansi">): Promise<Metadata> {
  await wajibIzin("pembayaran");
  const isi = await isiKwitansi((await params).id);
  return { title: { absolute: isi ? namaBerkasCetak(isi.nomor) : "Kwitansi" } };
}

export default async function CetakKwitansi({ params }: PageProps<"/pembayaran/[id]/kwitansi">) {
  await wajibIzin("pembayaran");
  const { id } = await params;
  const isi = await isiKwitansi(id);
  if (!isi) notFound();
  return <KwitansiCetak isi={isi} />;
}
