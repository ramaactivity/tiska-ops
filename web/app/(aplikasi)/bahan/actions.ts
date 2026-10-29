"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AWALAN_KODE_BAHAN, KATEGORI_BAHAN } from "@/lib/bahan";
import { kodeBerikutnya } from "@/lib/kode-master";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

const teksOpsional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().max(255).nullable(),
);

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skemaBahan = z.object({
  /** Kosong = bahan baru. */
  id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullish()),
  /** Hanya untuk bahan baru; kosong = otomatis per kategori (Gcs-333). */
  code: z.preprocess(kosongNull, z.string().trim().max(30).regex(/^[A-Za-z0-9-]+$/, "Kode hanya huruf, angka, dan tanda -.").nullish()),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  category: z.enum(KATEGORI_BAHAN, { message: "Pilih kategori." }),
  brand: teksOpsional,
  variant: teksOpsional,
  purchase_unit: teksOpsional,
  usage_unit: teksOpsional,
  status: z.enum(["ok", "lengkapi", "cek_konversi"], { message: "Pilih status." }),
});

export type KeadaanForm = {
  sukses?: boolean;
  pesan?: string;
  galat?: Record<string, string | undefined>;
};

/** Angka opsional bergaya Indonesia ("33,25", "1.000"); kosong = null, salah = undefined. */
function angkaOpsional(v: FormDataEntryValue | null) {
  if (v === null || String(v).trim() === "") return null;
  const a = uraikanRupiah(v);
  return a && a.gt(0) ? a : undefined;
}

export async function simpanBahan(_s: KeadaanForm, data: FormData): Promise<KeadaanForm> {
  const sesi = await pastikanIzin("bahan");

  const hasil = skemaBahan.safeParse(Object.fromEntries(data));
  const isiKemasan = angkaOpsional(data.get("purchase_qty"));
  const isiSatuan = angkaOpsional(data.get("usage_qty_per_pack"));
  if (!hasil.success || isiKemasan === undefined || isiSatuan === undefined) {
    const bidang = hasil.success ? {} : z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        ...Object.fromEntries(Object.entries(bidang).map(([k, v]) => [k, v?.[0]])),
        ...(isiKemasan === undefined ? { purchase_qty: "Isi angka lebih dari 0, contoh: 25 atau 0,5" } : {}),
        ...(isiSatuan === undefined ? { usage_qty_per_pack: "Isi angka lebih dari 0, contoh: 33,25" } : {}),
      },
    };
  }
  const { id, code, ...isi } = hasil.data;
  // Bahan yang sudah digabung (D-123) tidak diubah lagi — perubahannya tidak akan terlihat di HPP.
  if (id && (await prisma.ingredients.findUnique({ where: { id: BigInt(id) }, select: { merged_into: true } }))?.merged_into) return { pesan: "Bahan ini sudah digabung ke bahan lain — ubah bahan induknya." };

  if (!id) {
    let idBaru: bigint;
    try {
      const awalan = AWALAN_KODE_BAHAN[isi.category];
      const lama = code ? [] : await prisma.ingredients.findMany({ where: { code: { startsWith: awalan } }, select: { code: true } });
      const sekarang = new Date();
      idBaru = (
        await prisma.ingredients.create({
          data: {
            ...isi,
            code: code ?? kodeBerikutnya(awalan, lama.map((b) => b.code)),
            purchase_qty: isiKemasan?.toString() ?? null,
            usage_qty_per_pack: isiSatuan?.toString() ?? null,
            created_by: BigInt(sesi.id),
            created_at: sekarang,
            updated_at: sekarang,
          },
          select: { id: true },
        })
      ).id;
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unique")) return { galat: { code: "Kode ini sudah dipakai bahan lain. Ganti atau kosongkan." } };
      return { pesan: "Data gagal disimpan. Coba lagi sebentar." };
    }
    revalidatePath("/bahan");
    redirect(`/bahan/${idBaru}`);
  }

  const lama = await prisma.ingredients.findUnique({
    where: { id: BigInt(id) },
    select: { usage_qty_per_pack: true },
  });
  if (!lama) return { pesan: "Bahan tidak ditemukan." };

  // Harga per satuan resep TERSIMPAN (harga kemasan ÷ isi per kemasan). Kalau
  // konversinya dibetulkan, harga per gram lama jadi basi dan HPP salah —
  // maka dibuat baris harga baru dari harga kemasan terakhir. Pengubahnya
  // (gudang/dapur) tidak pernah melihat angka itu.
  const konversiBerubah = isiSatuan && !(lama.usage_qty_per_pack && lama.usage_qty_per_pack.eq(isiSatuan.toString()));
  const hargaTerakhir = konversiBerubah
    ? await prisma.ingredient_prices.findFirst({
        where: { ingredient_id: BigInt(id) },
        orderBy: [{ effective_at: "desc" }, { id: "desc" }],
        select: { price_per_pack: true },
      })
    : null;

  try {
    await prisma.$transaction([
      prisma.ingredients.update({
        where: { id: BigInt(id) },
        data: {
          ...isi,
          purchase_qty: isiKemasan?.toString() ?? null,
          usage_qty_per_pack: isiSatuan?.toString() ?? null,
          // Disimpan oleh orang = sudah ditinjau; bukan lagi bahan pengganti
          // hasil impor (D-030).
          is_placeholder: false,
          updated_at: new Date(),
        },
      }),
      ...(isiSatuan && hargaTerakhir?.price_per_pack
        ? [
            prisma.ingredient_prices.create({
              data: {
                ingredient_id: BigInt(id),
                price_per_pack: hargaTerakhir.price_per_pack,
                price_per_usage_unit: hargaTerakhir.price_per_pack.div(isiSatuan.toString()).toFixed(10),
                source: "manual",
                source_note: `konversi diubah: isi per kemasan ${lama.usage_qty_per_pack?.toString() ?? "-"} → ${isiSatuan.toString()}`,
                effective_at: new Date(),
                created_by: BigInt(sesi.id),
                created_at: new Date(),
              },
            }),
          ]
        : []),
    ]);
  } catch {
    return { pesan: "Data gagal disimpan. Coba lagi sebentar." };
  }

  revalidatePath("/bahan");
  revalidatePath(`/bahan/${id}`);
  revalidatePath("/resep", "layout");
  return { sukses: true, pesan: "Data bahan disimpan." };
}

/**
 * Harga baru = baris BARU di ingredient_prices (riwayat tidak ditimpa).
 * Diisi per kemasan beli; harga per satuan resep dihitung dari konversi.
 */
export async function tambahHarga(_s: KeadaanForm, data: FormData): Promise<KeadaanForm> {
  const sesi = await pastikanIzin("bahan");
  // Gudang & kepala dapur boleh membuka halaman bahan, tetapi harga hanya
  // untuk owner/finance (D-006) — diperiksa di sini, bukan hanya di layar.
  if (!bolehLihatBiaya(sesi.peran)) return { pesan: "Anda tidak punya akses untuk mengubah harga." };

  const id = String(data.get("id") ?? "");
  if (!/^\d+$/.test(id)) return { pesan: "Bahan tidak dikenal." };
  const harga = uraikanRupiah(data.get("price_per_pack"));
  if (!harga || harga.lte(0)) return { galat: { price_per_pack: "Isi harga lebih dari 0, contoh: 475.000" } };
  const catatan = String(data.get("source_note") ?? "").trim().slice(0, 255) || null;

  const bahan = await prisma.ingredients.findUnique({
    where: { id: BigInt(id) },
    select: { usage_qty_per_pack: true, status: true, merged_into: true },
  });
  if (!bahan) return { pesan: "Bahan tidak ditemukan." };
  if (bahan.merged_into) return { pesan: "Bahan ini sudah digabung ke bahan lain — ubah bahan induknya." };
  if (!bahan.usage_qty_per_pack || bahan.usage_qty_per_pack.lte(0)) {
    return { pesan: "Isi dulu konversi (isi per kemasan dalam satuan resep), lalu simpan harga." };
  }

  try {
    await prisma.$transaction([
      prisma.ingredient_prices.create({
        data: {
          ingredient_id: BigInt(id),
          price_per_pack: harga.toFixed(2),
          price_per_usage_unit: harga.div(bahan.usage_qty_per_pack.toString()).toFixed(10),
          source: "manual",
          source_note: catatan,
          effective_at: new Date(),
          created_by: BigInt(sesi.id),
          created_at: new Date(),
        },
      }),
      // Bahan yang menunggu harga otomatis lengkap begitu harga & konversinya ada.
      ...(bahan.status === "lengkapi"
        ? [prisma.ingredients.update({ where: { id: BigInt(id) }, data: { status: "ok", updated_at: new Date() } })]
        : []),
    ]);
  } catch {
    return { pesan: "Harga gagal disimpan. Coba lagi sebentar." };
  }

  revalidatePath("/bahan");
  revalidatePath(`/bahan/${id}`);
  revalidatePath("/resep", "layout");
  return { sukses: true, pesan: "Harga baru disimpan. HPP resep yang memakai bahan ini ikut berubah." };
}
