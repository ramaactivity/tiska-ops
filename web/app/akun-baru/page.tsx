import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoTiska } from "@/components/logo-tiska";
import { penggunaAktif } from "@/lib/auth";
import { halamanAwalSesi } from "@/lib/rbac";

import { aksiKeluar } from "../aksi-sesi";
import { lewatiGantiSandi } from "./actions";
import { FormAkunBaru } from "./form-akun-baru";

export const metadata: Metadata = { title: "Atur akun" };

/**
 * Login pertama dengan sandi sementara (D-034). Sengaja di luar kelompok
 * (aplikasi): layout di sana melempar ke sini, jadi halaman ini tidak boleh
 * memakai wajibSesi() atau akan berputar.
 */
export default async function HalamanAkunBaru() {
  const sesi = await penggunaAktif();
  if (!sesi) redirect("/masuk");
  if (!sesi.wajibGantiSandi) redirect(await halamanAwalSesi(sesi));

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-[22rem]">
        <LogoTiska varian="portrait" tinggi={88} />
        <h1 className="mt-7 text-[1.375rem] font-semibold tracking-[-0.02em] text-balance">Halo, {sesi.nama}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ini pertama kali Anda masuk. Boleh ganti kata sandi sementara dari admin dengan milik Anda sendiri, atau lewati dulu.
        </p>
        <div className="mt-8">
          <FormAkunBaru username={sesi.username} />
        </div>
        <form action={lewatiGantiSandi} className="mt-4">
          <button type="submit" className="min-h-11 w-full rounded-full border bg-card text-sm font-medium hover:bg-accent">
            Lewati, pakai sandi sekarang
          </button>
        </form>
        <form action={aksiKeluar} className="mt-6 border-t pt-4">
          <button type="submit" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Bukan akun Anda? Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
