"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { masuk, masukPin } from "@/lib/auth";
import { halamanAwalSesi } from "@/lib/rbac";

const skema = z.object({
  username: z.string().trim().min(1, "Nama user belum diisi."),
  sandi: z.string().min(1, "Kata sandi belum diisi."),
});

export type KeadaanForm = {
  pesan?: string;
  galat?: { username?: string; sandi?: string };
};

export async function aksiMasuk(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const hasil = skema.safeParse({
    username: data.get("username"),
    sandi: data.get("sandi"),
  });

  if (!hasil.success) {
    const bidang = z.flattenError(hasil.error).fieldErrors;
    return {
      galat: {
        username: bidang.username?.[0],
        sandi: bidang.sandi?.[0],
      },
    };
  }

  const percobaan = await masuk(hasil.data.username, hasil.data.sandi);

  if (!percobaan.berhasil) {
    return { pesan: percobaan.pesan };
  }

  // Tiap peran mendarat di halaman yang memang boleh ia buka. Bagian Cost
  // hanya punya laporan Margin, jadi /dasbor bukan tujuan yang benar.
  const tujuan = await halamanAwalSesi(percobaan.sesi);

  // redirect() bekerja dengan melempar sinyal khusus Next.js, jadi harus
  // dipanggil di luar blok try/catch mana pun.
  redirect(tujuan);
}

/** Masuk HP tim: wajah (akun yang dipasangkan di HP ini) + PIN (D-101). Panggil di dalam transition. */
export async function aksiMasukPin(idAkun: string, pin: string): Promise<{ pesan: string }> {
  const percobaan = await masukPin(idAkun, pin);
  if (!percobaan.berhasil) return { pesan: percobaan.pesan };
  redirect(await halamanAwalSesi(percobaan.sesi));
}
