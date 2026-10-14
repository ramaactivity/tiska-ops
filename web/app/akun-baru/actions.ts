"use server";

import { redirect } from "next/navigation";

import { buatHashSandi, cocokkanSandi, MIN_SANDI, penggunaAktif, rapikanUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { halamanAwalSesi } from "@/lib/rbac";

export type KeadaanAkunBaru = { pesan?: string; galat?: Record<string, string> };

/**
 * Login pertama dengan sandi sementara: pemilik akun menetapkan username
 * (boleh tetap) dan sandi miliknya sendiri, lalu baru bisa masuk (D-034).
 * Sesi dibaca ulang dari database berdasarkan id, jadi mengganti username
 * tidak membuatnya keluar.
 */
export async function simpanAkunBaru(_s: KeadaanAkunBaru, data: FormData): Promise<KeadaanAkunBaru> {
  const sesi = await penggunaAktif();
  if (!sesi) redirect("/masuk");

  const username = rapikanUsername(String(data.get("username") ?? ""));
  const sandi = String(data.get("sandi") ?? "");
  const ulang = String(data.get("ulang") ?? "");
  const galat: Record<string, string> = {};
  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) {
    galat.username = "3–50 karakter: huruf kecil, angka, titik, garis bawah, atau strip.";
  }
  if (sandi.length < MIN_SANDI) galat.sandi = `Minimal ${MIN_SANDI} karakter.`;
  else if (sandi !== ulang) galat.ulang = "Tidak sama dengan sandi di atas.";
  if (Object.keys(galat).length) return { galat };

  const pengguna = await prisma.users.findUnique({ where: { id: BigInt(sesi.id) }, select: { password: true } });
  if (!pengguna) redirect("/masuk");
  if (await cocokkanSandi(sandi, pengguna.password)) {
    return { galat: { sandi: "Pakai sandi baru, jangan sandi sementara dari admin." } };
  }
  const bentrok = await prisma.users.findFirst({
    where: { username, NOT: { id: BigInt(sesi.id) } },
    select: { id: true },
  });
  if (bentrok) return { galat: { username: "Username ini sudah dipakai orang lain." } };

  try {
    await prisma.users.update({
      where: { id: BigInt(sesi.id) },
      data: { username, password: await buatHashSandi(sandi), wajib_ganti_sandi: false, updated_at: new Date() },
    });
  } catch {
    return { pesan: "Gagal disimpan. Coba lagi sebentar." };
  }
  redirect(await halamanAwalSesi({ ...sesi, username, wajibGantiSandi: false }));
}
