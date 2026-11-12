import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KwitansiCetak } from "@/components/kwitansi-cetak";
import { isiKwitansi } from "@/lib/kwitansi";
import { prisma } from "@/lib/prisma";
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
  // Arahan meterai (D-130) — tidak ikut tercetak.
  const m = await prisma.payments.findUnique({ where: { id: BigInt(id) }, select: { receipt_stamp_mode: true } });
  const pesan =
    m?.receipt_stamp_mode === "digital"
      ? { teks: "Kwitansi ini sudah punya versi ber-e-meterai. Kirim PDF ber-e-meterai ke klien, bukan halaman ini.", tautan: `/pembayaran/${id}/kwitansi-meterai`, label: "Unduh PDF ber-e-meterai" }
      : isi.perlu_materai && !m?.receipt_stamp_mode
        ? { teks: "Kwitansi ini wajib meterai. e-Meterai: Cetak → Save as PDF → bubuhkan di situs e-meterai → unggah PDF hasilnya. Meterai tempel: cetak → tempel → kirim aslinya → tandai.", tautan: `/pembayaran/${id}`, label: "Buka langkah lengkap" }
        : null;
  return (
    <>
      {pesan ? (
        <div className="mx-auto mt-4 flex max-w-[210mm] flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm print:hidden">
          <span>⚠️ {pesan.teks}</span>
          <a href={pesan.tautan} className="font-medium text-primary underline-offset-4 hover:underline">
            {pesan.label}
          </a>
        </div>
      ) : null}
      {/* Kertas kwitansi fisik Tiska = A5 landscape (210 × 148 mm), bukan A4 — tidak perlu dipotong.
          Tepi 0: lembarnya sudah punya ruang tepi sendiri, dan tepi 0 juga membuang tanggal/URL bawaan browser.
          Style ini menimpa @page A4 di globals.css hanya di halaman ini. */}
      <style>{`
        :root { --tinggi-isi-cetak: 148mm; }
        .lembar-cetak { padding: 0; overflow-x: auto; }
        @media print { @page { size: A5 landscape; margin: 0; } }
      `}</style>
      <KwitansiCetak isi={isi} />
    </>
  );
}
