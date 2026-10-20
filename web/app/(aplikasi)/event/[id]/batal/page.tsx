import { Ban } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { eventMiliknya } from "@/lib/event-akses";
import { dibayarEvent } from "@/lib/pembatalan-event";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehKelolaUang, bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormBatalEvent } from "./form-batal";

export const metadata: Metadata = { title: "Batalkan event" };
export const dynamic = "force-dynamic";

/* Pembatalan event & hitungan refund S&K Bag. X (D-102). */
export default async function HalamanBatalEvent({ params }: PageProps<"/event/[id]/batal">) {
  const sesi = await wajibIzin("event");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const e = await prisma.events.findFirst({ where: { id: BigInt(id), ...eventMiliknya(sesi) }, include: { customers: { select: { name: true } } } });
  if (!e) notFound();
  if (!bolehUbahEvent(sesi.peran) || e.status === "batal") redirect(`/event/${id}`);
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <Halaman>
      <div className="mx-auto w-full max-w-[640px]">
        <KepalaHalaman ikon={Ban} judul="Batalkan event" keterangan={`${e.customers.name} · ${e.name}. Refund dihitung dari S&K Bag. X atas uang yang sudah dibayar.`} />
        <FormBatalEvent
          id={id}
          hariIni={hariIni}
          tanggalAcara={e.first_date ? e.first_date.toISOString().slice(0, 10) : null}
          dibayar={await dibayarEvent(e)}
          aturan={(await bacaPengaturanBisnis()).pembatalan}
          bolehUbahNominal={bolehKelolaUang(sesi.peran)}
        />
      </div>
    </Halaman>
  );
}
