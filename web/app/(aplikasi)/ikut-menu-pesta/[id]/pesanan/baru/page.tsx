import { ArrowLeft, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormPesanan } from "./form-pesanan";

export const metadata: Metadata = { title: "Catat pesanan Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function HalamanCatatPesanan({ params }: PageProps<"/ikut-menu-pesta/[id]/pesanan/baru">) {
  await wajibIzin("ikut-menu-pesta");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [p, angka] = await Promise.all([
    prisma.retail_programs.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        name: true,
        status: true,
        price_per_pax: true,
        min_pax: true,
        area: true,
        order_deadline: true,
        retail_program_sets: { orderBy: { sort: "asc" }, select: { id: true, title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } },
      },
    }),
    bacaPengaturanBisnis(),
  ]);
  if (!p) notFound();
  if (p.status !== "disetujui") redirect(`/ikut-menu-pesta/${id}`);

  return (
    <Halaman>
      <div className="pb-5">
        <Link href={`/ikut-menu-pesta/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Kembali ke program
        </Link>
      </div>
      <KepalaHalaman ikon={ShoppingBag} judul="Catat pesanan" keterangan={p.name} />
      <FormPesanan
        idProgram={id}
        paket={p.retail_program_sets.map((s) => ({ id: s.id.toString(), judul: s.title, isi: s.retail_program_set_items.map((i) => i.name) }))}
        harga={Number(p.price_per_pax)}
        minPax={p.min_pax}
        area={p.area}
        pbjtPct={angka.pbjt_pct}
        ongkirLuar={angka.delivery_fee.jabodetabek}
        telat={p.order_deadline < new Date() ? waktu.format(p.order_deadline) : null}
      />
    </Halaman>
  );
}
