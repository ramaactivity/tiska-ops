import { ChevronLeft, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormMenu } from "../[id]/form-menu";

export const metadata: Metadata = { title: "Menu baru" };
export const dynamic = "force-dynamic";

export default async function HalamanMenuBaru() {
  const sesi = await wajibIzin("menu");
  if (!bolehUbahResep(sesi.peran)) redirect("/menu?akses=ditolak");
  const resep = await prisma.recipes.findMany({ where: { merged_into: null }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } });

  return (
    <Halaman>
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Menu
      </Link>
      <KepalaHalaman ikon={UtensilsCrossed} judul="Menu baru" keterangan="Isi nama menu, hubungkan ke resep kalau sudah ada, lalu simpan." />
      <section className="max-w-2xl rounded-[14px] border bg-card p-5">
        <FormMenu
          menu={{ id: "", name: "", category: null, kitchen: null, recipeId: null, faktor: "1", active: true }}
          resep={resep.map((r) => ({ id: r.id.toString(), label: r.name, sub: r.code }))}
        />
      </section>
    </Halaman>
  );
}
