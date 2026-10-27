import { Building2, DatabaseZap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BagianForm, Halaman, KepalaHalaman } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { ringkasanDataTes } from "@/lib/data-tes";
import { tautanTandaTangan } from "@/lib/penyimpanan";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/rbac";

import { type BarisPenandatangan, DaftarPenandatangan } from "./daftar-penandatangan";
import { FormPerusahaan } from "./form-perusahaan";
import { KartuDataTes } from "./kartu-data-tes";

export const metadata: Metadata = { title: "Pengaturan company" };
export const dynamic = "force-dynamic";

export default async function HalamanPerusahaan() {
  await wajibPeran();

  const [p, penandatangan, dataTes] = await Promise.all([
    prisma.company_settings.findUnique({ where: { id: BigInt(1) } }),
    prisma.signatories.findMany({
      orderBy: [{ is_active: "desc" }, { sort_order: "asc" }, { id: "asc" }],
      select: { id: true, name: true, signature_path: true, is_active: true },
    }),
    ringkasanDataTes(),
  ]);

  const barisPenandatangan: BarisPenandatangan[] = await Promise.all(
    penandatangan.map(async (s) => ({
      id: s.id.toString(),
      nama: s.name,
      tautanTtd: await tautanTandaTangan(s.signature_path),
      aktif: s.is_active,
    })),
  );

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Building2}
        judul="Pengaturan company"
        keterangan="Identitas, rekening, dan teks standar yang ikut tercetak di dokumen."
      />

      <FormPerusahaan
        isi={{
          company_name: p?.company_name ?? "",
          bank_name: p?.bank_name ?? "",
          bank_account_number: p?.bank_account_number ?? "",
          bank_account_holder: p?.bank_account_holder ?? "",
          bank_code: p?.bank_code ?? "",
          swift_code: p?.swift_code ?? "",
          payment_terms_default: p?.payment_terms_default ?? "",
          quotation_terms_default: p?.quotation_terms_default ?? "",
          logo_path: p?.logo_path ?? null,
        }}
      />

      {/* Penandatangan dikelola terpisah dari formulir di atas: tiap orang
          membawa berkas gambarnya sendiri, dan satu formulir yang
          menanggung beberapa unggahan sekaligus gagal seluruhnya kalau
          salah satunya bermasalah. */}
      <div className="mt-3.5">
        <BagianForm
          judul="Penandatangan"
          keterangan="Nama dan tanda tangan yang bisa dipilih saat membuat quotation atau invoice. Yang dinonaktifkan hilang dari pilihan dokumen baru, tetapi tetap tercetak di dokumen yang sudah memakainya."
        >
          <DaftarPenandatangan baris={barisPenandatangan} />
        </BagianForm>
      </div>

      <div id="data-tes" className="mt-3.5 scroll-mt-24">
        <BagianForm
          judul="Data tes"
          keterangan="Customer yang ditandai &quot;data tes&quot; (di form customer) beserta semua quotation, invoice, payment, dan event-nya. Hapus sekaligus setelah selesai mencoba aplikasi."
        >
          <KartuDataTes r={dataTes} />
        </BagianForm>
      </div>

      <div id="pindah-data" className="mt-3.5 scroll-mt-24">
        <BagianForm
          judul="Pindah data lama"
          keterangan="Hapus semua data uji coba, lalu lanjutkan dengan customer, quotation, invoice, dan payment asli dari Aplikasi Penjualan TC. Dipandu langkah demi langkah."
        >
          <div>
            <Button render={<Link href="/perusahaan/pindah-data" />} className="rounded-full">
              <DatabaseZap className="size-4" />
              Mulai pindah data lama
            </Button>
          </div>
        </BagianForm>
      </div>
    </Halaman>
  );
}
