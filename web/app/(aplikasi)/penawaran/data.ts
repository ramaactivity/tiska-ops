import type { Prisma } from "@prisma/client";

import type { IsiAwal, IstilahDokumen } from "@/components/form-dokumen";
import { tanggalKosong } from "@/lib/bentuk-form";
import { tanggalAcaraUntukFormulir, tanggalUntukInput } from "@/lib/pilihan";

export { hariIni, pilihanForm, tanggalUntukInput } from "@/lib/pilihan";

export const ISTILAH_PENAWARAN: IstilahDokumen = {
  kata: "quotation",
  labelTanggal: "Tanggal quotation",
  labelTanggalAkhir: "Berlaku sampai",
  tombolSimpan: "Simpan quotation",
  batalHref: "/penawaran",
};

/** Isi relasi yang dibutuhkan form (halaman Ubah & "Pakai lagi", D-202) — satu tempat supaya keduanya sama. */
export const SERTA_FORM_PENAWARAN = {
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
} satisfies Prisma.quotationsInclude;

/** Dokumen tersimpan → isian form. Dipakai halaman Ubah apa adanya; "Pakai lagi" mengosongkan tanggal & nomornya. */
export function isiAwalPenawaran(
  penawaran: Prisma.quotationsGetPayload<{ include: typeof SERTA_FORM_PENAWARAN }>,
  ppnPct: number,
  penandatanganPertama: string | undefined,
): IsiAwal {
  return {
    id: penawaran.id.toString(),
    // Dokumen lama yang rekanannya ditetapkan di detail (D-132) terbaca sebagai sumber "rekanan".
    order_source: penawaran.order_source ?? (penawaran.partner_id ? "rekanan" : ""),
    order_source_note: penawaran.order_source_note ?? "",
    partner_id: penawaran.partner_id?.toString() ?? "",
    partner_fee_pct: penawaran.partner_fee_pct?.toString().replace(".", ",") ?? "",
    customer_id: penawaran.customer_id.toString(),
    contact_person: penawaran.contact_person ?? "",
    contact_phone: penawaran.contact_phone ?? "",
    contact_cc_name: penawaran.contact_cc_name ?? "",
    contact_cc_phone: penawaran.contact_cc_phone ?? "",
    tanggal: tanggalUntukInput(penawaran.quotation_date),
    tanggal_akhir: tanggalUntukInput(penawaran.valid_until),
    event_dates: tanggalAcaraUntukFormulir(
      penawaran.quotation_event_dates,
      penawaran.event_date,
      penawaran.event_days,
    ).map((s) => tanggalKosong(s)),
    event_type: penawaran.event_type ?? "",
    event_category: penawaran.event_category ?? "",
    event_time: penawaran.event_time ?? "",
    guest_count: penawaran.guest_count?.toString() ?? "",
    fnb_planner: penawaran.fnb_planner ?? "",
    venue: penawaran.venue ?? "",
    order_type: (penawaran.order_type ?? "") as "" | "event" | "retail",
    notes: penawaran.notes ?? "",
    delivery_amount: Number(penawaran.delivery_amount) > 0 ? Number(penawaran.delivery_amount).toString() : "",
    biaya_tambahan: penawaran.quotation_charges.map((b) => ({
      kunci: `c${b.id}`,
      label: b.label,
      amount: Number(b.amount).toLocaleString("id-ID"),
    })),
    service_charge_percent: penawaran.service_charge_percent
      ? Number(penawaran.service_charge_percent).toString()
      : "",
    service_charge_minimum: penawaran.service_charge_minimum
      ? Number(penawaran.service_charge_minimum).toLocaleString("id-ID")
      : "",
    pb1_enabled: penawaran.pb1_enabled,
    pb1_percent: penawaran.pb1_percent
      ? Number(penawaran.pb1_percent).toString()
      : "10",
    ppn_percent: penawaran.ppn_percent ? Number(penawaran.ppn_percent).toString() : String(ppnPct),
    signatory_id:
      penawaran.signatory_id?.toString() ?? penandatanganPertama ?? "",
    // Quotation MENDAHULUI PO customer, jadi selalu kosong.
    po_reference: "",
    show_payment_terms: penawaran.show_payment_terms,
    payment_terms: penawaran.payment_terms ?? "",
    items: penawaran.quotation_items.map((b) => ({
      kunci: b.id.toString(),
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
        kunci: `${b.id}-${i}`,
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
