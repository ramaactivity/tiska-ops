"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  bacaMuatan,
  barisUntukDisimpan,
  type KeadaanDokumen,
  pesanGagal,
  siapkanDokumen,
} from "@/lib/dokumen";
import { tulisBiayaTambahanPenawaran } from "@/lib/biaya-tambahan";
import { tulisTanggalAcaraPenawaran } from "@/lib/tanggal-acara";
import { nomorPenawaranBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { nomorRevisi } from "@/lib/nomor-tiska";
import { leadMiliknya } from "@/lib/lead-akses";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { tulisPerkiraanPartnerFee } from "@/lib/rekanan";
import { salinanPenawaran } from "@/lib/revisi-penawaran";
import { nilaiPersetujuanOwner } from "@/lib/untung-penawaran";
import { hanyaMiliknya, pastikanIzin } from "@/lib/rbac";

export async function simpanPenawaran(
  _sebelumnya: KeadaanDokumen,
  data: FormData,
): Promise<KeadaanDokumen> {
  const sesi = await pastikanIzin("penawaran");

  const mentah = bacaMuatan(data);
  if (mentah === null) {
    return { pesan: "Data formulir rusak. Muat ulang halaman lalu coba lagi." };
  }

  const siap = siapkanDokumen(mentah, { labelTanggalAkhir: "Tanggal berlaku" });
  if (!siap.ok) return siap.keadaan;

  const { f, items, tambahan, tanggalAcara, kolom } = siap;
  if (f.order_source === "rekanan" && !f.partner_id) {
    return { pesan: "Pilih rekanan yang membawa order ini, atau ganti sumber ordernya.", galat: { order_source: "Pilih rekanannya." } };
  }
  // Sumber order & Partner Fee (D-137) — kolom quotation saja, tidak ikut KolomDokumen bersama invoice.
  const sumber = {
    order_source: f.order_source ?? null,
    order_source_note: f.order_source_note || null,
    partner_id: f.partner_id ? BigInt(f.partner_id) : null,
    partner_fee_pct: f.partner_fee_pct ?? null,
  };

  const feeBawaan = (await bacaPengaturanBisnis()).partner_fee_pct;
  let idHasil: string;

  try {
    // Seluruh penyimpanan dalam satu transaksi. Gagal di tengah berarti tidak
    // ada yang berubah sama sekali — bukan penawaran bertotal terisi tanpa
    // satu baris item pun, seperti yang bisa terjadi di versi Laravel.
    idHasil = await prisma.$transaction(async (tx) => {
      let idPenawaran: bigint;

      if (f.id) {
        // Penyaring kepemilikan ikut ke dalam pencarian: formulir mengirim
        // nomor dokumennya, dan nomor bisa diganti sendiri sebelum dikirim.
        const ada = await tx.quotations.findFirst({
          where: { id: BigInt(f.id), ...hanyaMiliknya(sesi) },
          select: { status: true, revision: true, quotation_number: true },
        });
        if (!ada) throw new Error("Quotation tidak ditemukan.");
        if (ada.status === "approved") {
          throw new Error("Quotation yang sudah disetujui tidak bisa diubah lagi.");
        }

        // Quotation yang sudah sampai ke customer (terkirim/ditolak/
        // kadaluarsa) diubah = REVISI (D-042): versi lama disalin utuh,
        // nomornya mendapat akhiran -R2, -R3, dan statusnya kembali draft
        // supaya dikirim ulang. Draft yang belum dikirim diubah biasa.
        const revisi = ["sent", "rejected", "expired"].includes(ada.status);
        if (revisi) {
          await tx.quotation_versions.create({
            data: {
              quotation_id: BigInt(f.id),
              revision: ada.revision,
              quotation_number: ada.quotation_number,
              snapshot: await salinanPenawaran(tx, BigInt(f.id)),
              created_by: BigInt(sesi.id),
            },
          });
        }

        await tx.quotations.update({
          where: { id: BigInt(f.id) },
          data: {
            ...kolom,
            // Dokumen lama tanpa isian sumber: rekanan yang sudah ditetapkan di detail tidak dihapus.
            ...(f.order_source ? sumber : {}),
            quotation_date: new Date(f.tanggal),
            valid_until: new Date(f.tanggal_akhir),
            ...(revisi
              ? {
                  revision: ada.revision + 1,
                  quotation_number: nomorRevisi(ada.quotation_number, ada.revision + 1),
                  status: "draft",
                }
              : {}),
          },
        });
        await tx.quotation_items.deleteMany({ where: { quotation_id: BigInt(f.id) } });
        idPenawaran = BigInt(f.id);
      } else {
        const baru = await simpanDenganKodeUnik(() => nomorPenawaranBerikutnya(tx, new Date(f.tanggal)), (nomor) =>
          tx.quotations.create({
            data: {
              ...kolom,
              ...sumber,
              quotation_date: new Date(f.tanggal),
              valid_until: new Date(f.tanggal_akhir),
              quotation_number: nomor,
              status: "draft",
              created_by: BigInt(sesi.id),
              created_at: new Date(),
            },
            select: { id: true },
          }),
        );
        idPenawaran = baru.id;

        // Dari lead: tautkan & majukan tahapnya (hanya lead miliknya).
        if (f.lead_id) {
          const lead = await tx.leads.findFirst({ where: { id: BigInt(f.lead_id), ...leadMiliknya(sesi) }, select: { id: true, stage: true } });
          if (lead) {
            await tx.leads.update({
              where: { id: lead.id },
              data: { quotation_id: idPenawaran, stage: lead.stage === "tanya" ? "quotation" : lead.stage, updated_at: new Date() },
            });
            await tx.lead_activities.create({
              data: { lead_id: lead.id, kind: "tahap", body: "Quotation dibuat dari lead ini", created_by: BigInt(sesi.id) },
            });
          }
        }
      }

      for (const { induk, anak } of barisUntukDisimpan(items)) {
        const barisInduk = await tx.quotation_items.create({
          data: { ...induk, quotation_id: idPenawaran },
          select: { id: true },
        });

        if (anak.length > 0) {
          await tx.quotation_items.createMany({
            // Sub-item kini membawa qty dan harganya sendiri. Penanda
            // pungutan TIDAK disimpan di sini: ia diwarisi dari induknya saat
            // menghitung, dan menyimpan salinannya hanya membuka peluang
            // keduanya menyimpang.
            data: anak.map((a) => ({
              quotation_id: idPenawaran,
              parent_id: barisInduk.id,
              item_name: a.item_name,
              unit: a.unit,
              day: a.day,
              qty: a.qty,
              price: a.price,
              subtotal: a.subtotal,
              menu_id: a.menu_id,
              swapped_from_menu_id: a.swapped_from_menu_id,
              is_compliment: false,
              charge_service: false,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          });
        }
      }

      // Biaya tambahan ditulis dalam transaksi yang sama. Grand total sudah
      // memuat jumlahnya; kalau barisnya gagal masuk, dokumennya menagih
      // angka yang tidak bisa dijelaskan rinciannya sendiri.
      await tulisBiayaTambahanPenawaran(idPenawaran, tambahan, tx);
      await tulisTanggalAcaraPenawaran(idPenawaran, tanggalAcara, tx);
      await tulisPerkiraanPartnerFee(tx, idPenawaran, sesi.id, feeBawaan);

      return idPenawaran.toString();
    });
  } catch (galat) {
    return pesanGagal(galat, "Quotation gagal disimpan. Tidak ada data yang berubah.");
  }

  // Penanda untung & persetujuan owner dinilai SETELAH tersimpan. Gagal
  // menilai tidak membatalkan simpan — dokumennya sah — hanya dicatat.
  try {
    await nilaiPersetujuanOwner(BigInt(idHasil));
  } catch (galat) {
    console.error("Gagal menilai persetujuan owner quotation", idHasil, galat);
  }

  revalidatePath("/penawaran");
  revalidatePath(`/penawaran/${idHasil}`);
  redirect(`/penawaran/${idHasil}?tersimpan=1`);
}
