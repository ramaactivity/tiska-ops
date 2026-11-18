"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BATAS_KETERANGAN } from "@/lib/batas";
import { kodePelangganBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

const kosongJadiNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const skema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(255),
  address: z.preprocess(kosongJadiNull, z.string().trim().max(BATAS_KETERANGAN).nullable()),
  phone: z.preprocess(kosongJadiNull, z.string().trim().max(20, "Maksimal 20 karakter.").nullable()),
  email: z.preprocess(kosongJadiNull, z.email("Format email belum benar.").nullable()),
  // NPWP disimpan polos (angka saja) supaya bisa langsung disalin ke Coretax DJP, yang memakai 16 digit tanpa titik
  // (perorangan = NIK, badan = 0 + NPWP lama). Tempelan bertitik/strip dibersihkan; format lama 15 digit masih diterima.
  npwp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") || null : v),
    z.string().regex(/^\d{15,16}$/, "NPWP berisi 16 digit (perorangan = NIK). Format lama 15 digit juga bisa.").nullable(),
  ),
  pic_name: z.preprocess(kosongJadiNull, z.string().trim().max(100).nullable()),
  is_test: z.preprocess((v) => v === "ya", z.boolean()),
  // Jenis klien & rekanan pembawa (D-132).
  client_type: z.preprocess(kosongJadiNull, z.enum(["perorangan", "kelompok", "perusahaan", "organisasi", "instansi"]).nullable()),
  partner_id: z.preprocess(kosongJadiNull, z.string().regex(/^\d+$/).nullable()),
});

export type KeadaanPelanggan = {
  sukses?: boolean;
  pesan?: string;
  galat?: Partial<Record<"name" | "address" | "phone" | "email" | "npwp" | "pic_name", string>>;
};

export async function simpanPelanggan(
  _sebelumnya: KeadaanPelanggan,
  data: FormData,
): Promise<KeadaanPelanggan> {
  const sesi = await pastikanIzin("pelanggan");

  const hasil = skema.safeParse(Object.fromEntries(data));

  if (!hasil.success) {
    const bidang = z.flattenError(hasil.error).fieldErrors;
    return {
      galat: Object.fromEntries(
        Object.entries(bidang).map(([k, v]) => [k, v?.[0]]),
      ) as KeadaanPelanggan["galat"],
    };
  }

  const { id, partner_id, ...sisa } = hasil.data;
  const isi = { ...sisa, partner_id: partner_id ? BigInt(partner_id) : null };

  try {
    if (id) {
      await prisma.customers.update({
        where: { id: BigInt(id) },
        data: { ...isi, updated_at: new Date() },
      });
    } else {
      await simpanDenganKodeUnik(kodePelangganBerikutnya, (kode) =>
        prisma.customers.create({
          data: {
            ...isi,
            customer_code: kode,
            status: "active",
            created_by: BigInt(sesi.id),
            created_at: new Date(),
            updated_at: new Date(),
          },
        }),
      );
    }
  } catch {
    return { pesan: "Data gagal disimpan. Coba lagi sebentar." };
  }

  revalidatePath("/pelanggan");
  return {
    sukses: true,
    pesan: id ? "Data customer diperbarui." : "Customer baru ditambahkan.",
  };
}

export async function ubahStatusPelanggan(id: string): Promise<void> {
  await pastikanIzin("pelanggan");

  const pelanggan = await prisma.customers.findUnique({
    where: { id: BigInt(id) },
    select: { status: true },
  });
  if (!pelanggan) return;

  await prisma.customers.update({
    where: { id: BigInt(id) },
    data: {
      status: pelanggan.status === "active" ? "inactive" : "active",
      updated_at: new Date(),
    },
  });

  revalidatePath("/pelanggan");
}

/* ==========================================================================
   GABUNGKAN CUSTOMER KEMBAR (D-201)

   Satu klien terdaftar dua kali (mis. "PT. Amerta…" & "PT Amerta…") membuat
   riwayat & piutangnya terpecah. Semua data milik customer SUMBER pindah ke
   customer TUJUAN dalam satu transaksi; isian yang kosong di tujuan diisi dari
   sumber; sumber dinonaktifkan, tidak dihapus (data lama disembunyikan).
   ========================================================================== */

/** Jumlah data milik satu customer — ditampilkan sebelum menggabungkan. */
export async function ringkasPelanggan(id: string): Promise<Record<"quotation" | "invoice" | "payment" | "lainnya", number>> {
  await pastikanIzin("pelanggan");
  const w = { where: { customer_id: BigInt(id) } };
  const [quotation, invoice, payment, events, leads, tagih, retail, loyalti] = await Promise.all([
    prisma.quotations.count(w),
    prisma.invoices.count(w),
    prisma.payments.count(w),
    prisma.events.count(w),
    prisma.leads.count(w),
    prisma.collection_activities.count(w),
    prisma.retail_orders.count(w),
    prisma.loyalty_redemptions.count(w),
  ]);
  return { quotation, invoice, payment, lainnya: events + leads + tagih + retail + loyalti };
}

export async function gabungkanPelanggan(sumber: string, tujuan: string): Promise<{ ok: true; pindah: number } | { ok: false; pesan: string }> {
  await pastikanIzin("pelanggan");
  if (!/^\d+$/.test(sumber) || !/^\d+$/.test(tujuan) || sumber === tujuan) return { ok: false, pesan: "Pilih customer tujuan yang berbeda." };
  const [S, T] = [BigInt(sumber), BigInt(tujuan)];
  const kolom = { name: true, address: true, phone: true, email: true, npwp: true, pic_name: true, client_type: true, partner_id: true } as const;
  const [a, b] = await Promise.all([prisma.customers.findUnique({ where: { id: S }, select: kolom }), prisma.customers.findUnique({ where: { id: T }, select: kolom })]);
  if (!a || !b) return { ok: false, pesan: "Customer tidak ditemukan. Muat ulang halaman." };

  const isi = (x: string | null, y: string | null) => (x?.trim() ? x : y);
  const pindah = await prisma.$transaction(async (tx) => {
    // Berurutan, bukan Promise.all: satu transaksi = satu koneksi (lihat catatan di lib/nomor.ts).
    // Semua tabel yang menyimpan customer_id (prisma/schema.prisma) — tambahkan di sini bila ada tabel baru.
    const w = { where: { customer_id: S }, data: { customer_id: T } };
    const hasil = [
      await tx.quotations.updateMany(w),
      await tx.invoices.updateMany(w),
      await tx.payments.updateMany(w),
      await tx.events.updateMany(w),
      await tx.leads.updateMany(w),
      await tx.collection_activities.updateMany(w),
      await tx.retail_orders.updateMany(w),
      await tx.loyalty_redemptions.updateMany(w),
    ];
    const n = hasil.reduce((j, r) => j + r.count, 0);
    await tx.customers.update({
      where: { id: T },
      data: {
        address: isi(b.address, a.address),
        phone: isi(b.phone, a.phone),
        email: isi(b.email, a.email),
        npwp: isi(b.npwp, a.npwp),
        pic_name: isi(b.pic_name, a.pic_name),
        client_type: b.client_type ?? a.client_type,
        partner_id: b.partner_id ?? a.partner_id,
        updated_at: new Date(),
      },
    });
    await tx.customers.update({ where: { id: S }, data: { status: "inactive", updated_at: new Date() } });
    return n;
  });

  revalidatePath("/pelanggan");
  revalidatePath(`/pelanggan/${tujuan}`);
  return { ok: true, pindah };
}
