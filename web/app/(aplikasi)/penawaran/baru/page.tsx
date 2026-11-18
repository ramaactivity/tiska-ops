import { tebakJenisAcara } from "@/lib/hitung/acara";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { FormDokumen, SlotAksiDokumen } from "@/components/form-dokumen";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { pakaiLagi, tanggalKosong } from "@/lib/bentuk-form";
import { leadMiliknya } from "@/lib/lead-akses";
import { SUMBER_LEAD } from "@/lib/lead";
import { kopPratinjau } from "@/lib/isi-dokumen";
import { prisma } from "@/lib/prisma";
import { opsiSumberOrder } from "@/lib/rekanan";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";
import { aturanZona, pilihanAlat, pilihanMenu, pilihanPaket, pilihanSyarat, riwayatHargaBaris } from "@/lib/pilihan-builder";

import { hariIni, isiAwalPenawaran, ISTILAH_PENAWARAN, pilihanForm, SERTA_FORM_PENAWARAN } from "../data";
import { simpanPenawaran } from "../simpan";

export const metadata: Metadata = { title: "Quotation baru" };
export const dynamic = "force-dynamic";

export default async function HalamanPenawaranBaru({ searchParams }: PageProps<"/penawaran/baru">) {
  const sesi = await wajibIzin("penawaran");

  // Dari "Buat quotation" di lead (D-047): isian awal diambil dari lead-nya.
  const { lead: idLead, salin } = await searchParams;
  // "Pakai lagi" (D-202): quotation lama sebagai titik awal.
  const asalSalin =
    typeof salin === "string" && /^\d+$/.test(salin)
      ? await prisma.quotations.findFirst({ where: { id: BigInt(salin), ...hanyaMiliknya(sesi) }, include: SERTA_FORM_PENAWARAN })
      : null;
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

  const [penandatangan, paket, zona, bisnis, menu, syarat, kop, sumber, hargaJual, alat] = await Promise.all([
    penandatanganAktif(),
    pilihanPaket(),
    aturanZona(),
    bacaPengaturanBisnis(),
    pilihanMenu(),
    pilihanSyarat(),
    kopPratinjau("Quotation"),
    opsiSumberOrder(),
    riwayatHargaBaris(),
    pilihanAlat(),
  ]);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileText}
        judul="Quotation baru"
        keterangan={
          asalSalin
            ? `Isi disalin dari ${asalSalin.quotation_number} — tanggal & tanggal acara dikosongkan. Periksa jumlah & harganya.`
            : "Nomor quotation dibuat otomatis setelah disimpan."
        }
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
        alat={alat}
        syarat={syarat}
        aturanZona={zona}
        isiAwal={asalSalin ? pakaiLagi(isiAwalPenawaran(asalSalin, bisnis.ppn_pct, penandatangan[0]?.id), hariIni(), hariIni(14)) : {
          customer_id: lead?.customer_id?.toString() ?? "",
          contact_person: lead?.name ?? "",
          contact_phone: lead?.phone ?? "",
          contact_cc_name: "",
          contact_cc_phone: "",
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
          catatan_dapur: "",
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
