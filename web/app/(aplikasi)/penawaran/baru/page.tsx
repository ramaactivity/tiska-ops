import { tebakJenisAcara } from "@/lib/hitung/acara";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { FormDokumen, SlotAksiDokumen } from "@/components/form-dokumen";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { tanggalKosong } from "@/lib/bentuk-form";
import { leadMiliknya } from "@/lib/lead-akses";
import { SUMBER_LEAD } from "@/lib/lead";
import { kopPratinjau } from "@/lib/isi-dokumen";
import { prisma } from "@/lib/prisma";
import { opsiSumberOrder } from "@/lib/rekanan";
import { wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";
import { aturanZona, pilihanMenu, pilihanPaket, pilihanSyarat, riwayatHargaBaris } from "@/lib/pilihan-builder";

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

  const [{ pelanggan, saran }, pengaturan] = await Promise.all([
    pilihanForm(),
    prisma.company_settings.findUnique({
      where: { id: BigInt(1) },
      select: { quotation_terms_default: true },
    }),
  ]);

  const [penandatangan, paket, zona, bisnis, menu, syarat, kop, sumber, hargaJual] = await Promise.all([
    penandatanganAktif(),
    pilihanPaket(),
    aturanZona(),
    bacaPengaturanBisnis(),
    pilihanMenu(),
    pilihanSyarat(),
    kopPratinjau("Quotation"),
    opsiSumberOrder(),
    riwayatHargaBaris(),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileText}
        judul="Quotation baru"
        keterangan="Nomor quotation dibuat otomatis setelah disimpan."
        aksi={<SlotAksiDokumen />}
      />

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
        syarat={syarat}
        aturanZona={zona}
        isiAwal={{
          customer_id: lead?.customer_id?.toString() ?? "",
          contact_person: lead?.name ?? "",
          contact_phone: lead?.phone ?? "",
          lead_id: lead?.id.toString(),
          // Sumber lead → sumber order (D-137): rekanan/repeat sama; kanal chat = langsung.
          ...(lead
            ? lead.source === "rekanan" || lead.source === "repeat"
              ? { order_source: lead.source }
              : { order_source: "langsung", order_source_note: SUMBER_LEAD[lead.source as keyof typeof SUMBER_LEAD] ?? "" }
            : {}),
          tanggal: hariIni(),
          tanggal_akhir: hariIni(14),
          event_dates: lead?.event_date ? [tanggalKosong(lead.event_date.toISOString().slice(0, 10))] : [],
          event_type: lead?.event_type ?? "",
          // Dari lead: jenisnya ditebak dari nama acara (D-163); sales bisa menggantinya.
          event_category: tebakJenisAcara(lead?.event_type) ?? "",
          event_time: "",
          guest_count: lead?.pax?.toString() ?? "",
          fnb_planner: "",
          venue: lead?.location ?? "",
          // Bentuk pesanan di lead → jenis pesanan (D-070): buffet/stall/set menu = event, box/tumpeng = retail.
          order_type: !lead?.service_form ? "" : /buffet|stall|set menu/i.test(lead.service_form) ? "event" : "retail",
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
