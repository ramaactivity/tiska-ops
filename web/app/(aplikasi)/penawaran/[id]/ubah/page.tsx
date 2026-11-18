import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormDokumen, SlotAksiDokumen } from "@/components/form-dokumen";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { nomorRevisi } from "@/lib/nomor-tiska";
import { kopPratinjau } from "@/lib/isi-dokumen";
import { prisma } from "@/lib/prisma";
import { opsiSumberOrder } from "@/lib/rekanan";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";
import { aturanZona, pilihanAlat, pilihanMenu, pilihanPaket, pilihanSyarat, riwayatHargaBaris } from "@/lib/pilihan-builder";

import { isiAwalPenawaran, ISTILAH_PENAWARAN, pilihanForm, SERTA_FORM_PENAWARAN } from "../../data";
import { simpanPenawaran } from "../../simpan";

export const metadata: Metadata = { title: "Ubah quotation" };
export const dynamic = "force-dynamic";

export default async function HalamanUbahPenawaran({
  params,
}: PageProps<"/penawaran/[id]/ubah">) {
  const sesi = await wajibIzin("penawaran");

  const { id } = await params;

  const [penawaran, { pelanggan, saran }] = await Promise.all([
    prisma.quotations.findFirst({
      where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
      include: SERTA_FORM_PENAWARAN,
    }),
    pilihanForm(),
  ]);

  if (!penawaran) notFound();

  // Penawaran yang sudah disetujui adalah kesepakatan dengan pelanggan.
  // Mengubahnya diam-diam membuat dokumen yang sudah dikirim tidak cocok lagi.
  if (penawaran.status === "approved") {
    redirect(`/penawaran/${id}`);
  }

  const akanRevisi = ["sent", "rejected", "expired"].includes(penawaran.status);
  const [penandatangan, paket, zona, bisnis, menu, syarat, kop, sumber, hargaJual, alat] = await Promise.all([
    penandatanganAktif(),
    pilihanPaket(),
    aturanZona(),
    bacaPengaturanBisnis(),
    pilihanMenu(),
    pilihanSyarat(),
    // Nomor yang akan dipakai sesudah disimpan: quotation terkirim menjadi revisi (D-042).
    kopPratinjau("Quotation", akanRevisi ? nomorRevisi(penawaran.quotation_number, penawaran.revision + 1) : penawaran.quotation_number),
    opsiSumberOrder(),
    riwayatHargaBaris(),
    pilihanAlat(),
  ]);


  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileText}
        judul={`Ubah ${penawaran.quotation_number}`}
        keterangan={
          akanRevisi ? undefined : "Nomor quotation tidak berubah selama masih draft."
        }
        aksi={<SlotAksiDokumen />}
      />

      {akanRevisi ? (
        <p className="mb-6 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-[0.9375rem] text-perhatian">
          Quotation ini sudah sampai ke customer. Menyimpan perubahan membuat <b>revisi baru</b> —
          nomornya menjadi <b>{nomorRevisi(penawaran.quotation_number, penawaran.revision + 1)}</b>, versi
          sekarang tersimpan di riwayat, dan statusnya kembali draft untuk dikirim ulang.
        </p>
      ) : null}

      <FormDokumen
        kop={kop}
        sumber={sumber}
        aksi={simpanPenawaran}
        istilah={ISTILAH_PENAWARAN}
        pelanggan={pelanggan}
        saran={saran}
        penandatangan={penandatangan}
        paket={paket}
        menu={menu}
        hargaJual={hargaJual}
        alat={alat}
        syarat={syarat}
        aturanZona={zona}
        isiAwal={isiAwalPenawaran(penawaran, bisnis.ppn_pct, penandatangan[0]?.id)}
      />
    </Halaman>
  );
}
