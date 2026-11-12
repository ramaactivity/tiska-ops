import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormDokumen, SlotAksiDokumen, type IsiAwal } from "@/components/form-dokumen";
import { tanggalKosong } from "@/lib/bentuk-form";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { kopPratinjau } from "@/lib/isi-dokumen";
import { pilihanMenu, pilihanPaket, riwayatHargaBaris } from "@/lib/pilihan-builder";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";

import { hariIni, ISTILAH_TAGIHAN, pilihanForm } from "../data";
import { tanggalAcaraUntukFormulir, tanggalUntukInput } from "@/lib/pilihan";
import { simpanTagihan } from "../simpan";

export const metadata: Metadata = { title: "Invoice baru" };
export const dynamic = "force-dynamic";

export default async function HalamanTagihanBaru({ searchParams }: PageProps<"/tagihan/baru">) {
  const sesi = await wajibIzin("tagihan");

  const { dari } = await searchParams;
  const idPenawaran = typeof dari === "string" ? dari : "";

  const [{ pelanggan, saran }, pengaturan] = await Promise.all([
    pilihanForm(),
    prisma.company_settings.findUnique({
      where: { id: BigInt(1) },
      select: { payment_terms_default: true },
    }),
  ]);

  const [penandatangan, bisnis, kop, paket, menu, hargaJual] = await Promise.all([
    penandatanganAktif(),
    bacaPengaturanBisnis(),
    kopPratinjau("Invoice"),
    pilihanPaket(),
    pilihanMenu(),
    riwayatHargaBaris(),
  ]);

  const kosong: IsiAwal = {
    customer_id: "",
    contact_person: "",
    contact_phone: "",
    tanggal: hariIni(),
    tanggal_akhir: hariIni(14),
    event_dates: [],
    event_type: "",
    event_time: "",
    guest_count: "",
    fnb_planner: "",
    venue: "",
    order_type: "",
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
    po_reference: "",
    show_payment_terms: Boolean(pengaturan?.payment_terms_default),
    payment_terms: pengaturan?.payment_terms_default ?? "",
    items: [],
  };

  let isiAwal = kosong;
  let asal: { nomor: string } | null = null;

  if (idPenawaran) {
    const p = await prisma.quotations.findFirst({
      where: { id: BigInt(idPenawaran), ...hanyaMiliknya(sesi) },
      include: {
        invoices: { take: 1, select: { id: true } },
        quotation_charges: { orderBy: { id: "asc" } },
        quotation_event_dates: { orderBy: { event_date: "asc" } },
        quotation_items: {
          where: { parent_id: null },
          orderBy: { id: "asc" },
          include: {
            other_quotation_items: { orderBy: { id: "asc" },
              select: { item_name: true, unit: true, day: true, qty: true, pax: true, price: true, menu_id: true, swapped_from_menu_id: true },
             },
          },
        },
      },
    });

    if (!p) redirect("/tagihan/baru");

    // Satu penawaran hanya boleh menurunkan satu tagihan. Tanpa penjagaan ini,
    // menekan tombol dua kali menghasilkan tagihan ganda ke pelanggan yang sama.
    if (p.invoices[0]) redirect(`/tagihan/${p.invoices[0].id}?sudah_ada=1`);

    asal = { nomor: p.quotation_number };

    isiAwal = {
      ...kosong,
      customer_id: p.customer_id.toString(),
      contact_person: p.contact_person ?? "",
      contact_phone: p.contact_phone ?? "",
      event_dates: tanggalAcaraUntukFormulir(
        p.quotation_event_dates,
        p.event_date,
        p.event_days,
      ).map((s) => tanggalKosong(s)),
      event_type: p.event_type ?? "",
      event_category: p.event_category ?? "",
      event_time: p.event_time ?? "",
      guest_count: p.guest_count?.toString() ?? "",
      fnb_planner: p.fnb_planner ?? "",
      venue: p.venue ?? "",
      order_type: (p.order_type ?? "") as "" | "event" | "retail",
      notes: `Dikonversi dari Penawaran ${p.quotation_number}`,
      // Acuan AWAL, bukan nomor PO yang sebenarnya: sampai customer
      // menerbitkan PO-nya, nomor quotation inilah yang mereka pegang.
      // Tinggal diganti begitu nomor PO-nya datang.
      po_reference: p.quotation_number,
      delivery_amount: Number(p.delivery_amount) > 0 ? Number(p.delivery_amount).toString() : "",
      // Biaya tambahan ikut pindah. Tagihan yang kehilangan baris ini akan
      // menagih lebih kecil dari penawaran yang sudah disetujui customer.
      biaya_tambahan: p.quotation_charges.map((b) => ({
        kunci: `qc${b.id}`,
        label: b.label,
        amount: Number(b.amount).toLocaleString("id-ID"),
      })),
      service_charge_percent: p.service_charge_percent
        ? Number(p.service_charge_percent).toString()
        : "",
      service_charge_minimum: p.service_charge_minimum ? Number(p.service_charge_minimum).toLocaleString("id-ID") : "",
      pb1_enabled: p.pb1_enabled,
      pb1_percent: p.pb1_percent ? Number(p.pb1_percent).toString() : "10",
      ppn_percent: p.ppn_percent ? Number(p.ppn_percent).toString() : String(bisnis.ppn_pct),
      signatory_id: p.signatory_id?.toString() ?? penandatangan[0]?.id ?? "",
      show_payment_terms: p.show_payment_terms,
      payment_terms: pengaturan?.payment_terms_default ?? p.payment_terms ?? "",
      items: p.quotation_items.map((b) => ({
        kunci: `q${b.id}`,
        product_id: b.product_id?.toString() ?? "",
        package_id: b.package_id?.toString() ?? "",
        menu_id: b.menu_id?.toString() ?? "",
        day: Number(b.day).toString(),
        item_name: b.item_name,
        unit: b.unit ?? "",
        qty: Number(b.qty).toLocaleString("id-ID"),
        pax: b.pax === null ? "" : String(b.pax),
        price: Number(b.price).toLocaleString("id-ID"),
        is_compliment: b.is_compliment,
        charge_service: b.charge_service,
            charge_pb1: b.charge_pb1,
            charge_ppn: b.charge_ppn,
            sesi_tanggal: b.session_date ? tanggalUntukInput(b.session_date) : undefined,
            sesi_jenis: b.session_label ?? undefined,
            sesi_jam: b.session_time ?? undefined,
        children: b.other_quotation_items.map((a, i) => ({
          kunci: `q${b.id}-${i}`,
          item_name: a.item_name,
          unit: a.unit ?? "",
          // Sama dengan induknya berarti DIBIARKAN KOSONG, supaya tetap
          // mewarisi. Menampilkannya sebagai angka membuat orang mengira
          // ia terpisah dari induknya.
          day: Number(a.day) === Number(b.day) ? "" : Number(a.day).toString(),
          qty: a.qty && Number(a.qty) > 0 ? Number(a.qty).toString() : "",
          pax: a.pax === null ? "" : String(a.pax),
          price: a.price && Number(a.price) > 0 ? Number(a.price).toString() : "",
          menu_id: a.menu_id?.toString(),
          swapped_from_menu_id: a.swapped_from_menu_id?.toString(),
        })),
      })),
    };
  }


  return (
    <Halaman>
      <KepalaHalaman
        ikon={ReceiptText}
        judul="Invoice baru"
        keterangan={
          asal
            ? `Seluruh rincian disalin dari penawaran ${asal.nomor}. Periksa tanggal jatuh temponya sebelum menyimpan.`
            : "Nomor invoice dibuat otomatis setelah disimpan."
        }
        aksi={<SlotAksiDokumen />}
      />

      <FormDokumen
        kop={kop}
        paket={paket}
        menu={menu}
        hargaJual={hargaJual}
        pakaiReferensiPo
        aksi={simpanTagihan}
        istilah={ISTILAH_TAGIHAN}
        pelanggan={pelanggan}
        saran={saran}
        penandatangan={penandatangan}
        isiAwal={isiAwal}
        medanTambahan={idPenawaran ? { dari_penawaran: idPenawaran } : undefined}
      />
    </Halaman>
  );
}
