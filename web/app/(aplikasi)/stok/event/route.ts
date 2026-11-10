import { NextResponse } from "next/server";

import { penggunaAktif } from "@/lib/auth";
import { bacaIzin } from "@/lib/izin";
import { hariIniWib } from "@/lib/kalender";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Event 30 hari terakhir & mendatang untuk tujuan "barang keluar" (D-148). */
export async function GET() {
  const sesi = await penggunaAktif();
  if (!sesi || !bolehBuka(sesi.peran, "stok", await bacaIzin())) return new NextResponse("Tidak ada akses.", { status: 403 });
  const sejak = new Date(Date.parse(`${hariIniWib()}T00:00:00Z`) - 30 * 86_400_000);
  const event = await prisma.events.findMany({
    where: { status: { not: "batal" }, OR: [{ first_date: null }, { first_date: { gte: sejak } }] },
    orderBy: [{ first_date: "desc" }, { id: "desc" }],
    take: 300,
    select: { id: true, name: true, first_date: true, customers: { select: { name: true } } },
  });
  return NextResponse.json(
    event.map((e) => ({ id: e.id.toString(), label: e.name, sub: [e.customers.name, e.first_date ? hari.format(e.first_date) : null].filter(Boolean).join(" · ") })),
  );
}
