"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tanggalSah } from "@/lib/hitung/ulang-tahun";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

const skema = z.object({
  id: z.string().regex(/^\d+$/).nullable(),
  nama: z.string().trim().min(2, "Tulis namanya.").max(120),
  hari: z.number().int(),
  bulan: z.number().int(),
  tahun: z.number().int().min(1930, "Tahun lahir tidak masuk akal.").max(2015, "Tahun lahir tidak masuk akal.").nullable(),
  akun: z.string().regex(/^\d+$/).nullable(),
  catatan: z.string().trim().max(255),
});

/** Tambah / ubah ulang tahun karyawan (D-109). Karyawan tanpa akun cukup nama; yang punya akun disambungkan. */
export async function simpanUlangTahun(isian: z.input<typeof skema>): Promise<void> {
  await pastikanIzin("ulang-tahun");
  const f = skema.parse(isian);
  if (!tanggalSah(f.hari, f.bulan)) throw new Error("Tanggal tidak ada di bulan itu.");
  const data = { name: f.nama, birth_day: f.hari, birth_month: f.bulan, birth_year: f.tahun, user_id: f.akun ? BigInt(f.akun) : null, notes: f.catatan || null, updated_at: new Date() };
  if (f.akun) {
    const dipakai = await prisma.employee_birthdays.findUnique({ where: { user_id: BigInt(f.akun) }, select: { id: true } });
    if (dipakai && dipakai.id.toString() !== f.id) throw new Error("Akun itu sudah punya data ulang tahun.");
  }
  if (f.id) await prisma.employee_birthdays.update({ where: { id: BigInt(f.id) }, data });
  else await prisma.employee_birthdays.create({ data });
  revalidatePath("/ulang-tahun");
  revalidatePath("/dasbor");
}

export async function hapusUlangTahun(id: string): Promise<void> {
  await pastikanIzin("ulang-tahun");
  await prisma.employee_birthdays.delete({ where: { id: BigInt(z.string().regex(/^\d+$/).parse(id)) } });
  revalidatePath("/ulang-tahun");
  revalidatePath("/dasbor");
}
