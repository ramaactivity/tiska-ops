"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { awalanKode, kodeBerikutnya } from "@/lib/kode-master";
import { bolehUbahPaket } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { uraikanRupiah } from "@/lib/uang";

export type KeadaanPaket = { sukses?: boolean; pesan?: string; galat?: Record<string, string | undefined> };

const kosongNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const skema = z.object({
  /** Kosong = paket baru. */
  id: z.preprocess(kosongNull, z.string().regex(/^\d+$/).nullish()),
  /** Hanya untuk paket baru; kosong = otomatis mengikuti lini (BS-25, PR-21). */
  code: z.preprocess(kosongNull, z.string().trim().max(30).regex(/^[A-Za-z0-9-]+$/, "Kode hanya huruf, angka, dan tanda -.").nullish()),
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
 * pembanding tidak hilang. Tanpa id = paket baru (header + isi sekaligus).
 * Hanya owner/finance (keputusan harga).
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
  // Paket pilihan per kategori (D-082) boleh tanpa isi tetap.
  const adaSlot = hasil.success && hasil.data.id ? (await prisma.package_slots.count({ where: { package_id: BigInt(hasil.data.id) } })) > 0 : false;
  if (!isi.length && !adaSlot) return { pesan: "Paket minimal punya satu menu." };
  for (const [i, x] of isi.entries()) if (!/^\d+$/.test(x.menuId)) return { pesan: `Baris ${i + 1}: menu belum dipilih.` };

  const { id, code, service_form_id, ...isiKolom } = hasil.data;
  const sekarang = new Date();
  const kolom = {
    ...isiKolom,
    price: harga.toFixed(2),
    service_form_id: service_form_id ? BigInt(service_form_id) : null,
    updated_at: sekarang,
  };
  const lama = id ? await prisma.package_items.findMany({ where: { package_id: BigInt(id) }, select: { menu_id: true, hpp_snapshot: true } }) : [];
  const snapshot = new Map(lama.map((l) => [l.menu_id.toString(), l.hpp_snapshot]));
  const barisIsi = isi.map((x, i) => ({
    menu_id: BigInt(x.menuId),
    qty: 1,
    sort: i + 1,
    note: x.note.trim() || null,
    hpp_snapshot: snapshot.get(x.menuId) ?? null,
    created_at: sekarang,
    updated_at: sekarang,
  }));

  let idBaru: bigint | null = null;
  try {
    if (id) {
      await prisma.$transaction([
        prisma.packages.update({ where: { id: BigInt(id) }, data: kolom }),
        prisma.package_items.deleteMany({ where: { package_id: BigInt(id) } }),
        prisma.package_items.createMany({ data: barisIsi.map((b) => ({ ...b, package_id: BigInt(id) })) }),
      ]);
    } else {
      idBaru = (
        await prisma.packages.create({
          data: { ...kolom, code: code ?? (await kodePaketBaru(kolom.line)), created_at: sekarang, package_items: { create: barisIsi } },
          select: { id: true },
        })
      ).id;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return { galat: { code: "Kode ini sudah dipakai paket lain. Ganti atau kosongkan." } };
    return { pesan: "Paket gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath("/paket");
  revalidatePath("/menu", "layout");
  if (idBaru) redirect(`/paket/${idBaru}`);
  revalidatePath(`/paket/${id}`);
  return { sukses: true, pesan: "Paket disimpan." };
}

/** Awalan diambil dari paket lain di lini yang sama (BS-, PR-); lini baru memakai PK-. */
async function kodePaketBaru(lini: string | null): Promise<string> {
  const contoh = lini ? await prisma.packages.findFirst({ where: { line: lini }, orderBy: { id: "desc" }, select: { code: true } }) : null;
  const awalan = contoh ? awalanKode(contoh.code) : "PK-";
  const lama = await prisma.packages.findMany({ where: { code: { startsWith: awalan } }, select: { code: true } });
  return kodeBerikutnya(awalan, lama.map((p) => p.code));
}

const skemaKategori = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Nama kategori wajib diisi.").max(100).refine((s) => !s.includes(":"), "Nama kategori tidak boleh memakai titik dua."),
      pilih: z.number().int().min(0).max(20),
      tambahan: z.boolean(),
      opsi: z
        .array(z.object({ nama: z.string().trim().min(1).max(255), hargaTambahan: z.number().int().min(0).nullable() }))
        .min(1, "Tiap kategori minimal punya satu pilihan menu.")
        .max(80),
    }),
  )
  .max(40)
  .refine((d) => new Set(d.map((s) => s.label.toLowerCase())).size === d.length, "Nama kategori tidak boleh kembar.");

/**
 * Kategori & pilihan menu paket pilihan (D-084): ditulis ulang utuh dalam satu
 * transaksi; pilihan disambungkan ke master Menu lewat nama (untuk HPP).
 * Quotation lama tidak berubah — isinya tersimpan sebagai teks.
 */
export async function simpanKategori(id: string, isian: unknown): Promise<{ sukses?: boolean; pesan: string }> {
  const sesi = await pastikanIzin("paket");
  if (!bolehUbahPaket(sesi.peran)) return { pesan: "Hanya owner atau finance yang bisa mengubah paket." };
  if (!/^\d+$/.test(id)) return { pesan: "Paket tidak dikenal." };
  const hasil = skemaKategori.safeParse(isian);
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian kategori belum benar." };

  const kunci = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const menu = new Map((await prisma.menus.findMany({ select: { id: true, name: true } })).map((m) => [kunci(m.name), m.id]));
  const adaIsi = (await prisma.package_items.count({ where: { package_id: BigInt(id) } })) > 0;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.package_slots.deleteMany({ where: { package_id: BigInt(id) } });
      for (const [i, s] of hasil.data.entries()) {
        await tx.package_slots.create({
          data: {
            package_id: BigInt(id),
            label: s.label,
            pick: s.tambahan ? 0 : s.pilih,
            extra: s.tambahan,
            sort: i + 1,
            package_slot_options: {
              create: s.opsi.map((o, j) => ({ name: o.nama, menu_id: menu.get(kunci(o.nama)) ?? null, extra_price: o.hargaTambahan, sort: j + 1 })),
            },
          },
        });
      }
      await tx.packages.update({
        where: { id: BigInt(id) },
        data: { kind: !adaIsi && hasil.data.some((s) => s.pilih > 0 && !s.tambahan) ? "choice" : "fixed", updated_at: new Date() },
      });
    });
  } catch {
    return { pesan: "Kategori gagal disimpan. Coba lagi sebentar." };
  }
  revalidatePath(`/paket/${id}`);
  revalidatePath("/paket");
  return { sukses: true, pesan: "Kategori & pilihan menu disimpan." };
}
