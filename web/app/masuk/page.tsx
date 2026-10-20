import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoTiska } from "@/components/logo-tiska";
import { akunDiHpIni, penggunaAktif } from "@/lib/auth";
import { uraiAvatar } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { halamanAwalSesi } from "@/lib/rbac";

import { FormMasuk } from "./form-masuk";
import { MasukWajah } from "./masuk-wajah";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function HalamanMasuk() {
  const sesi = await penggunaAktif();
  if (sesi) {
    redirect(await halamanAwalSesi(sesi));
  }

  // HP yang sudah dipasangkan (D-101): pilih wajah + PIN.
  const ids = (await akunDiHpIni()).filter((i) => /^\d+$/.test(i));
  const wajah = ids.length
    ? await prisma.users.findMany({ where: { id: { in: ids.map(BigInt) }, is_active: true, pin_hash: { not: null } }, select: { id: true, name: true, username: true, avatar: true } })
    : [];
  const akun = ids.flatMap((i) => wajah.filter((w) => w.id.toString() === i)).map((w) => ({ id: w.id.toString(), nama: w.name, avatar: uraiAvatar(w.avatar, w.username) }));

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-[22rem]">
        <LogoTiska varian="portrait" tinggi={104} />

        <h1 className="mt-7 text-[1.375rem] font-semibold tracking-[-0.02em] text-balance">
          Masuk ke Tiska Ops
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Penjualan, operasional, dan keuangan Tiska Catering.
        </p>

        <div className="mt-8">
          {akun.length ? <MasukWajah akun={akun} formBiasa={<FormMasuk />} /> : <FormMasuk />}
        </div>

        <p className="mt-8 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
          Akun hanya dibuat oleh admin lewat menu User. Kalau Anda lupa
          kata sandi atau belum punya akses, hubungi admin.
        </p>
      </div>
    </main>
  );
}
