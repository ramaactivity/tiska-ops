import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormDokumen, SlotAksiDokumen } from "@/components/form-dokumen";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { kopPratinjau } from "@/lib/isi-dokumen";
import { pilihanAlat, pilihanMenu, pilihanPaket, riwayatHargaBaris } from "@/lib/pilihan-builder";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";

import { isiAwalTagihan, ISTILAH_TAGIHAN, pilihanForm, SERTA_FORM_TAGIHAN } from "../../data";
import { simpanTagihan } from "../../simpan";

export const metadata: Metadata = { title: "Ubah invoice" };
export const dynamic = "force-dynamic";

export default async function HalamanUbahTagihan({ params }: PageProps<"/tagihan/[id]/ubah">) {
  const sesi = await wajibIzin("tagihan");

  const { id } = await params;

  const [tagihan, { pelanggan, saran }] = await Promise.all([
    prisma.invoices.findFirst({
      where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
      include: SERTA_FORM_TAGIHAN,
    }),
    pilihanForm(),
  ]);

  if (!tagihan) notFound();

  // Mengubah rincian tagihan yang sudah dibayar akan membuat catatan
  // pembayaran tidak lagi cocok dengan nilainya.
  if (tagihan.status === "cancelled") {
    redirect(`/tagihan/${id}`);
  }

  const [penandatangan, bisnis, kop, paket, menu, hargaJual, alat] = await Promise.all([
    penandatanganAktif(),
    bacaPengaturanBisnis(),
    kopPratinjau("Invoice", tagihan.invoice_number),
    pilihanPaket(),
    pilihanMenu(),
    riwayatHargaBaris(),
    pilihanAlat(),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ReceiptText}
        judul={`Ubah ${tagihan.invoice_number}`}
        keterangan="Nomor invoice tidak berubah setelah disimpan ulang."
        aksi={<SlotAksiDokumen />}
      />

      <FormDokumen
        kop={kop}
        paket={paket}
        menu={menu}
        hargaJual={hargaJual}
        alat={alat}
        pakaiReferensiPo
        aksi={simpanTagihan}
        istilah={ISTILAH_TAGIHAN}
        pelanggan={pelanggan}
        saran={saran}
        penandatangan={penandatangan}
        isiAwal={isiAwalTagihan(tagihan, bisnis.ppn_pct, penandatangan[0]?.id)}
      />
    </Halaman>
  );
}
