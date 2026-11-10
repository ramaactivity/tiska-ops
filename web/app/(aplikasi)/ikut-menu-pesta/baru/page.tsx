import { ArrowLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { eventMiliknya } from "@/lib/event-akses";
import { batasOrderBawaan } from "@/lib/hitung/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormProgram } from "../form-program";
import { dataForm } from "../data-form";

export const metadata: Metadata = { title: "Usulkan Ikut Menu Pesta" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function HalamanUsulan({ searchParams }: PageProps<"/ikut-menu-pesta/baru">) {
  const sesi = await wajibIzin("ikut-menu-pesta");
  const { event } = await searchParams;
  const kembali = (
    <div className="pb-5">
      <Link href="/ikut-menu-pesta" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft className="size-3.5" />
        Semua program
      </Link>
    </div>
  );

  // Langkah 1: pilih acara besar yang akan "diikuti".
  if (typeof event !== "string" || !/^\d+$/.test(event)) {
    const hariIni = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())}T00:00:00Z`);
    const acara = await prisma.events.findMany({
      where: { ...eventMiliknya(sesi), status: { not: "batal" }, first_date: { gte: hariIni } },
      orderBy: { first_date: "asc" },
      take: 100,
      select: { id: true, name: true, first_date: true, guest_count: true, customers: { select: { name: true } }, _count: { select: { retail_programs: true } } },
    });
    return (
      <Halaman>
        {kembali}
        <KepalaHalaman ikon={UtensilsCrossed} judul="Usulkan Ikut Menu Pesta" keterangan="Langkah 1 dari 2 — pilih acara besar yang menunya akan dijual juga ke pembeli retail." />
        <div className="overflow-hidden rounded-[14px] border bg-card">
          {acara.length === 0 ? (
            <KeadaanKosong judul="Belum ada acara mendatang" keterangan="Program diusulkan dari event yang sudah dibuat (quotation disetujui → Buat event)." />
          ) : (
            <ul>
              {acara.map((a) => (
                <li key={a.id.toString()} className="border-b last:border-0">
                  <Link href={`/ikut-menu-pesta/baru?event=${a.id}`} className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.customers.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[a.first_date ? hari.format(a.first_date) : null, a.name, a.guest_count ? `${a.guest_count} tamu` : null].filter(Boolean).join(" · ")}
                        {a._count.retail_programs ? ` · sudah ${a._count.retail_programs} program` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Halaman>
    );
  }

  const e = await prisma.events.findFirst({
    where: { id: BigInt(event), ...eventMiliknya(sesi) },
    select: { id: true, name: true, status: true, first_date: true, customers: { select: { name: true } } },
  });
  if (!e) notFound();
  const [data, angka, terakhir] = await Promise.all([
    dataForm(e.id),
    bacaPengaturanBisnis(),
    prisma.retail_programs.findFirst({ where: { contact: { not: null } }, orderBy: { id: "desc" }, select: { contact: true } }),
  ]);
  // Acara yang sudah lewat tidak mengisi tanggal kirim — pengusul memilih sendiri (server menolak tanggal lampau).
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const tanggal = e.first_date && e.first_date.toISOString().slice(0, 10) >= hariIni ? e.first_date.toISOString().slice(0, 10) : "";
  const batas = tanggal ? batasOrderBawaan(tanggal) : { tanggal: "", jam: "14.00" };

  return (
    <Halaman>
      {kembali}
      <KepalaHalaman
        ikon={UtensilsCrossed}
        judul="Usulkan Ikut Menu Pesta"
        keterangan={`Langkah 2 dari 2 — susun paket retail dari menu acara ${e.customers.name}. Sesudah dikirim, Finance/owner mengecek HPP-nya.`}
      />
      <FormProgram
        acara={{ id: e.id.toString(), pelanggan: e.customers.name, nama: e.name, tanggal: e.first_date ? hari.format(e.first_date) : null, batal: e.status === "batal" }}
        menuAcara={data.menuAcara}
        menuLain={data.menuLain}
        harga={angka.ikut_menu_pesta.harga_per_pax}
        awal={{
          idProgram: null,
          tanggalKirim: tanggal,
          batasTanggal: batas.tanggal,
          batasJam: batas.jam,
          minPax: angka.ikut_menu_pesta.min_pax,
          maksPax: null,
          area: "Bogor",
          kontak: terakhir?.contact ?? "",
          catatan: "",
          paket: [
            { judul: "Menu 1", isi: [] },
            { judul: "Menu 2", isi: [] },
          ],
        }}
      />
    </Halaman>
  );
}
