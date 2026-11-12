import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KwitansiBlanko } from "@/components/kwitansi-blanko";
import { KwitansiCetak } from "@/components/kwitansi-cetak";
import { PengaturKwitansi } from "@/components/pengatur-kwitansi";
import { type IsiKwitansi, isiKwitansi } from "@/lib/kwitansi";
import { prisma } from "@/lib/prisma";
import { namaBerkasCetak } from "@/lib/nomor-tiska";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/pembayaran/[id]/kwitansi">): Promise<Metadata> {
  await wajibIzin("pembayaran");
  const isi = await isiKwitansi((await params).id);
  return { title: { absolute: isi ? namaBerkasCetak(isi.nomor) : "Kwitansi" } };
}

/**
 * Ukuran kertas per pilihan. Tepi 0 di semua pilihan: lembarnya sudah punya ruang tepi sendiri, dan tepi 0 juga
 * membuang tanggal/URL bawaan browser. Menimpa @page A4 di globals.css hanya di halaman ini.
 */
const HALAMAN = {
  a5: { page: "A5 landscape", tinggi: "148mm" },
  blanko: { page: "A5 landscape", tinggi: "148mm" },
  a4: { page: "A4 portrait", tinggi: "297mm" },
} as const;

/** Tanda tangan basah: gambar tanda tangan tidak dicetak, nama tetap. */
const tanpaGambarTtd = (x: IsiKwitansi): IsiKwitansi => ({ ...x, penandatangan: { ...x.penandatangan, tautan: null } });

export default async function CetakKwitansi({ params, searchParams }: PageProps<"/pembayaran/[id]/kwitansi">) {
  await wajibIzin("pembayaran");
  const { id } = await params;
  const sp = await searchParams;
  const kertas = sp.kertas === "blanko" || sp.kertas === "a4" ? sp.kertas : "a5";
  const ttd = sp.ttd === "basah" ? "basah" : "digital";
  const idBawah = typeof sp.bawah === "string" && /^\d+$/.test(sp.bawah) ? sp.bawah : id;
  const isiAsli = await isiKwitansi(id);
  if (!isiAsli) notFound();
  const isi = ttd === "basah" ? tanpaGambarTtd(isiAsli) : isiAsli;
  // A4 isi 2: bagian bawah bawaannya kwitansi yang sama; bisa diganti kwitansi lain.
  const [bawahAsli, daftar] =
    kertas === "a4"
      ? await Promise.all([
          idBawah === id ? isiAsli : isiKwitansi(idBawah),
          prisma.payments.findMany({
            orderBy: { payment_date: "desc" },
            take: 300,
            select: { id: true, payment_number: true, receipt_number: true, total_amount: true, pph23_amount: true, customers: { select: { name: true } } },
          }),
        ])
      : [null, []];
  const bawah = bawahAsli && ttd === "basah" ? tanpaGambarTtd(bawahAsli) : bawahAsli;
  const pilihanBawah = daftar.map((p) => ({
    id: p.id.toString(),
    label: `${p.receipt_number ?? p.payment_number} · ${p.customers.name}`,
    sub: rupiah(Number(p.total_amount) + Number(p.pph23_amount)),
  }));
  const opsiBawah = pilihanBawah.find((p) => p.id === (bawah ? idBawah : id)) ?? { id, label: isi.nomor };
  const h = HALAMAN[kertas];
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
      <PengaturKwitansi kertas={kertas} ttd={ttd} bawah={opsiBawah} pilihanBawah={pilihanBawah} />
      <style>{`
        :root { --tinggi-isi-cetak: ${h.tinggi}; }
        .lembar-cetak { padding: 0; overflow-x: auto; }
        @media print { @page { size: ${h.page}; margin: 0; } }
      `}</style>
      {kertas === "blanko" ? (
        <KwitansiBlanko isi={isiAsli} ttdDigital={ttd === "digital"} />
      ) : kertas === "a4" ? (
        <>
          {/* Kertas A4 masuk berdiri: ujung yang tidak tercetak (±14,5 mm) jatuh di bawah kwitansi kedua.
              Garis putus-putus = garis potong; di dalam tinggi lembar supaya tetap pas satu A4. */}
          <KwitansiCetak isi={isi} rapat tinggi="h-[148.5mm]" tepi="px-[13mm] pt-[10mm] pb-[8mm]" />
          {bawah ? <KwitansiCetak isi={bawah} rapat tinggi="h-[148.5mm]" tepi="border-t border-dashed border-[#b9bccb] px-[13mm] pt-[8mm] pb-[17mm]" /> : null}
        </>
      ) : (
        <KwitansiCetak isi={isi} />
      )}
    </>
  );
}
