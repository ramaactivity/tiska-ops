import type { Metadata } from "next";

import { FormDokumen } from "@/components/form-dokumen";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { tanggalKosong } from "@/lib/bentuk-form";
import { leadMiliknya } from "@/lib/lead-akses";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";
import { aturanZona, pilihanMenu, pilihanPaket, pilihanSyarat } from "@/lib/pilihan-builder";

import { hariIni, ISTILAH_PENAWARAN, pilihanForm } from "../data";
import { simpanPenawaran } from "../simpan";

export const metadata: Metadata = { title: "Quotation baru" };
export const dynamic = "force-dynamic";

export default async function HalamanPenawaranBaru({ searchParams }: PageProps<"/penawaran/baru">) {
  const sesi = await wajibIzin("penawaran");

  // Dari "Buat quotation" di lead (D-047): isian awal diambil dari lead-nya.
  const { lead: idLead } = await searchParams;
  const lead =
    typeof idLead === "string" && /^\d+$/.test(idLead)
      ? await prisma.leads.findFirst({ where: { id: BigInt(idLead), ...leadMiliknya(sesi) } })
      : null;

  const [{ pelanggan, produk }, pengaturan] = await Promise.all([
    pilihanForm(),
    prisma.company_settings.findUnique({
      where: { id: BigInt(1) },
      select: { quotation_terms_default: true },
    }),
  ]);

  const [penandatangan, paket, zona, bisnis, menu, syarat] = await Promise.all([
    penandatanganAktif(),
    pilihanPaket(),
    aturanZona(),
    bacaPengaturanBisnis(),
    pilihanMenu(),
    pilihanSyarat(),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        judul="Quotation baru"
        keterangan="Nomor quotation dibuat otomatis setelah disimpan."
      />

      <FormDokumen
        aksi={simpanPenawaran}
        istilah={ISTILAH_PENAWARAN}
        pelanggan={pelanggan}
        produk={produk}
        penandatangan={penandatangan}
        paket={paket}
        menu={menu}
        syarat={syarat}
        aturanZona={zona}
        isiAwal={{
          customer_id: lead?.customer_id?.toString() ?? "",
          contact_person: lead?.name ?? "",
          contact_phone: lead?.phone ?? "",
          lead_id: lead?.id.toString(),
          tanggal: hariIni(),
          tanggal_akhir: hariIni(14),
          event_dates: lead?.event_date ? [tanggalKosong(lead.event_date.toISOString().slice(0, 10))] : [],
          event_type: lead?.event_type ?? "",
          event_time: "",
          guest_count: lead?.pax?.toString() ?? "",
          fnb_planner: "",
          venue: lead?.location ?? "",
          notes: "",
          service_charge_percent: "",
          service_charge_minimum: "",
          delivery_amount: "",
          biaya_tambahan: [],
          // PBJT selalu kena; dimatikan manual hanya bila klien nego (D-022).
          pb1_enabled: true,
          pb1_percent: String(bisnis.pbjt_pct),
          ppn_percent: String(bisnis.ppn_pct),
          signatory_id: penandatangan[0]?.id ?? "",
          // Quotation MENDAHULUI PO customer, jadi selalu kosong.
          po_reference: "",
          show_payment_terms: Boolean(pengaturan?.quotation_terms_default),
          payment_terms: pengaturan?.quotation_terms_default ?? "",
          items: [],
        }}
      />
    </Halaman>
  );
}
