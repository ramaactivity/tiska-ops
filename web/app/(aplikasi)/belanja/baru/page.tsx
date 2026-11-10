import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormPrBaru } from "./form-pr-baru";

export const metadata: Metadata = { title: "PR baru" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* PR manual / RAB (D-146): untuk event tertentu atau stok gudang. */
export default async function HalamanPrBaru() {
  await wajibIzin("belanja");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const sejak = new Date(`${hariIni}T00:00:00Z`);
  sejak.setUTCDate(sejak.getUTCDate() - 14);
  const event = await prisma.events.findMany({
    where: { status: { not: "batal" }, OR: [{ first_date: null }, { first_date: { gte: sejak } }] },
    orderBy: [{ first_date: "asc" }, { id: "asc" }],
    take: 300,
    select: { id: true, name: true, first_date: true, customers: { select: { name: true } } },
  });
  return (
    <Halaman>
      <KepalaHalaman ikon={ClipboardList} judul="PR baru" keterangan="Susun RAB belanja: pilih tujuannya, lalu isi barang & biaya di halaman berikutnya." />
      <FormPrBaru
        hariIni={hariIni}
        event={event.map((e) => ({
          id: e.id.toString(),
          label: e.name,
          sub: [e.customers.name, e.first_date ? hari.format(e.first_date) : null].filter(Boolean).join(" · "),
          tanggal: e.first_date ? e.first_date.toISOString().slice(0, 10) : null,
        }))}
      />
    </Halaman>
  );
}
