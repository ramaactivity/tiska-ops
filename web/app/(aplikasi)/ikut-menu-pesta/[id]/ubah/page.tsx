import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { dataForm } from "../../data-form";
import { FormProgram } from "../../form-program";

export const metadata: Metadata = { title: "Ubah usulan Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
const tglWib = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

export default async function HalamanUbahProgram({ params }: PageProps<"/ikut-menu-pesta/[id]/ubah">) {
  await wajibIzin("ikut-menu-pesta");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const p = await prisma.retail_programs.findUnique({
    where: { id: BigInt(id) },
    include: {
      events: { select: { id: true, name: true, status: true, first_date: true, customers: { select: { name: true } } } },
      retail_program_sets: {
        orderBy: { sort: "asc" },
        include: { retail_program_set_items: { orderBy: { sort: "asc" }, include: { menus: { select: { category: true } } } } },
      },
    },
  });
  if (!p) notFound();
  if (p.status !== "diusulkan" && p.status !== "dikembalikan") redirect(`/ikut-menu-pesta/${id}`);
  const [data, angka] = await Promise.all([dataForm(p.events.id), bacaPengaturanBisnis()]);

  return (
    <Halaman>
      <div className="pb-5">
        <Link href={`/ikut-menu-pesta/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Kembali ke program
        </Link>
      </div>
      <KepalaHalaman ikon={UtensilsCrossed} judul="Ubah usulan" keterangan={p.decision_note ? `Catatan Finance: ${p.decision_note}` : p.name} />
      <FormProgram
        acara={{
          id: p.events.id.toString(),
          pelanggan: p.events.customers.name,
          nama: p.events.name,
          tanggal: p.events.first_date ? hari.format(p.events.first_date) : null,
          batal: p.events.status === "batal",
        }}
        menuAcara={data.menuAcara}
        menuLain={data.menuLain}
        harga={angka.ikut_menu_pesta.harga_per_pax}
        awal={{
          idProgram: id,
          tanggalKirim: p.delivery_date.toISOString().slice(0, 10),
          batasTanggal: tglWib.format(p.order_deadline),
          batasJam: jamWib.format(p.order_deadline).replace(":", "."),
          minPax: p.min_pax,
          maksPax: p.max_pax,
          area: p.area,
          kontak: p.contact ?? "",
          catatan: p.notes ?? "",
          paket: p.retail_program_sets.map((s) => ({
            judul: s.title,
            isi: s.retail_program_set_items.map((i) => ({ idMenu: i.menu_id?.toString() ?? null, nama: i.name, dariAcara: i.from_event, kategori: i.menus?.category ?? null })),
          })),
        }}
      />
    </Halaman>
  );
}
