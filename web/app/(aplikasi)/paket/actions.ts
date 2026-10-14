"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bolehUbahPaket } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanPaket = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  line: z.preprocess(kosongNull, z.string().trim().max(50).nullable()),
  service_form_id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullable()),
  status: z.enum(["aktif", "arsip"]),
  notes: z.preprocess(kosongNull, z.string().trim().max(1000).nullable()),
});
const skemaIsi = z.array(z.object({ menuId: z.string(), note: z.string().max(255) })).max(40);

/**
 * Paket diubah utuh dalam satu transaksi. Isi paket ditulis ulang; HPP file
 * (hpp_snapshot) item lama dipertahankan berdasarkan menunya supaya angka
 * pembanding tidak hilang. Hanya owner/finance (keputusan harga).
 */
export async function simpanPaket(_s: KeadaanPaket, data: FormData): Promise<KeadaanPaket> {
  const sesi = await pastikanIzin("paket");
  if (!bolehUbahPaket(sesi.peran)) return { pesan: "Hanya owner atau finance yang bisa mengubah paket." };

  const hasil = skema.safeParse(Object.fromEntries(data));
  const harga = uraikanRupiah(data.get("price"));
  if (!hasil.success || !harga || harga.lte(0)) {
    const bidang = hasil.success ? {} : z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        ...Object.fromEntries(Object.entries(bidang).map(([k, v]) => [k, v?.[0]])),
        ...(!harga || harga.lte(0) ? { price: "Isi harga lebih dari 0, contoh: 48.500" } : {}),
      },
    };
  }
  let isi;
  try {
    isi = skemaIsi.parse(JSON.parse(String(data.get("isi") ?? "[]")));
  } catch {
    return { pesan: "Isi paket tidak terbaca. Muat ulang halaman lalu coba lagi." };
  }
  if (!isi.length) return { pesan: "Paket minimal punya satu menu." };
  for (const [i, x] of isi.entries()) if (!/^\d+$/.test(x.menuId)) return { pesan: `Baris ${i + 1}: menu belum dipilih.` };

  const { id, service_form_id, ...kolom } = hasil.data;
  const lama = await prisma.package_items.findMany({ where: { package_id: BigInt(id) }, select: { menu_id: true, hpp_snapshot: true } });
  const snapshot = new Map(lama.map((l) => [l.menu_id.toString(), l.hpp_snapshot]));
  const sekarang = new Date();

  try {
    await prisma.$transaction([
      prisma.packages.update({
        where: { id: BigInt(id) },
        data: { ...kolom, price: harga.toFixed(2), service_form_id: service_form_id ? BigInt(service_form_id) : null, updated_at: sekarang },
      }),
      prisma.package_items.deleteMany({ where: { package_id: BigInt(id) } }),
      prisma.package_items.createMany({
        data: isi.map((x, i) => ({
          package_id: BigInt(id),
          menu_id: BigInt(x.menuId),
          qty: 1,
          sort: i + 1,
          note: x.note.trim() || null,
          hpp_snapshot: snapshot.get(x.menuId) ?? null,
          created_at: sekarang,
          updated_at: sekarang,
        })),
      }),
    ]);
  } catch {
    return { pesan: "Paket gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/paket");
  revalidatePath(`/paket/${id}`);
  revalidatePath("/menu", "layout");
  return { sukses: true, pesan: "Paket disimpan." };
}
