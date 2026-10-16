import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormDokumen } from "@/components/form-dokumen";
import { tanggalKosong } from "@/lib/bentuk-form";
import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { nomorRevisi } from "@/lib/nomor-tiska";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { penandatanganAktif } from "@/lib/penandatangan";
import { aturanZona, pilihanMenu, pilihanPaket, pilihanSyarat } from "@/lib/pilihan-builder";

import { ISTILAH_PENAWARAN, pilihanForm, tanggalUntukInput } from "../../data";
import { tanggalAcaraUntukFormulir } from "@/lib/pilihan";
import { simpanPenawaran } from "../../simpan";

export const metadata: Metadata = { title: "Ubah quotation" };
export const dynamic = "force-dynamic";

export default async function HalamanUbahPenawaran({
  params,
}: PageProps<"/penawaran/[id]/ubah">) {
  const sesi = await wajibIzin("penawaran");

  const { id } = await params;

  const [penawaran, { pelanggan, produk }] = await Promise.all([
    prisma.quotations.findFirst({
      where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
      include: {
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
    }),
    pilihanForm(),
  ]);

  if (!penawaran) notFound();

  // Penawaran yang sudah disetujui adalah kesepakatan dengan pelanggan.
  // Mengubahnya diam-diam membuat dokumen yang sudah dikirim tidak cocok lagi.
  if (penawaran.status === "approved") {
    redirect(`/penawaran/${id}`);
  }

  const [penandatangan, paket, zona, bisnis, menu, syarat] = await Promise.all([
    penandatanganAktif(),
    pilihanPaket(),
    aturanZona(),
    bacaPengaturanBisnis(),
    pilihanMenu(),
    pilihanSyarat(),
  ]);

  const akanRevisi = ["sent", "rejected", "expired"].includes(penawaran.status);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileText}
        judul={`Ubah ${penawaran.quotation_number}`}
        keterangan={
          akanRevisi ? undefined : "Nomor quotation tidak berubah selama masih draft."
        }
      />

      {akanRevisi ? (
        <p className="mb-6 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-[0.9375rem] text-perhatian">
          Quotation ini sudah sampai ke customer. Menyimpan perubahan membuat <b>revisi baru</b> —
          nomornya menjadi <b>{nomorRevisi(penawaran.quotation_number, penawaran.revision + 1)}</b>, versi
          sekarang tersimpan di riwayat, dan statusnya kembali draft untuk dikirim ulang.
        </p>
      ) : null}

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
          id: penawaran.id.toString(),
          customer_id: penawaran.customer_id.toString(),
          contact_person: penawaran.contact_person ?? "",
          contact_phone: penawaran.contact_phone ?? "",
          tanggal: tanggalUntukInput(penawaran.quotation_date),
          tanggal_akhir: tanggalUntukInput(penawaran.valid_until),
          event_dates: tanggalAcaraUntukFormulir(
            penawaran.quotation_event_dates,
            penawaran.event_date,
            penawaran.event_days,
          ).map((s) => tanggalKosong(s)),
          event_type: penawaran.event_type ?? "",
          event_time: penawaran.event_time ?? "",
          guest_count: penawaran.guest_count?.toString() ?? "",
          fnb_planner: penawaran.fnb_planner ?? "",
          venue: penawaran.venue ?? "",
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
          ppn_percent: penawaran.ppn_percent ? Number(penawaran.ppn_percent).toString() : String(bisnis.ppn_pct),
          signatory_id:
            penawaran.signatory_id?.toString() ?? penandatangan[0]?.id ?? "",
          // Quotation MENDAHULUI PO customer, jadi selalu kosong.
          po_reference: "",
          show_payment_terms: penawaran.show_payment_terms,
          payment_terms: penawaran.payment_terms ?? "",
          items: penawaran.quotation_items.map((b) => ({
            kunci: b.id.toString(),
            product_id: b.product_id?.toString() ?? "",
            package_id: b.package_id?.toString() ?? "",
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
        }}
      />
    </Halaman>
  );
}
