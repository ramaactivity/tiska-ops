import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { akunDiHpIni } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";

import { BuatPin } from "./buat-pin";

export const metadata: Metadata = { title: "PIN masuk HP" };
export const dynamic = "force-dynamic";

/* PIN masuk HP (D-101): sesudah ini, masuk di HP ini cukup pilih wajah + PIN. */
export default async function HalamanPin() {
  const sesi = await wajibSesi();
  const [u, hp] = await Promise.all([prisma.users.findUnique({ where: { id: BigInt(sesi.id) }, select: { pin_hash: true } }), akunDiHpIni()]);
  return (
    <Halaman>
      <div className="mx-auto w-full max-w-[480px]">
        <KepalaHalaman ikon={KeyRound} judul="PIN masuk HP" keterangan="Sesudah ini, masuk di HP ini cukup pilih wajahmu lalu tekan PIN — tanpa nama user & sandi." />
        <BuatPin sudahAda={Boolean(u?.pin_hash) && hp.includes(sesi.id)} />
      </div>
    </Halaman>
  );
}
