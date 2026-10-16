import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { teksJumlahBaris } from "@/lib/uang";
import { wajibIzin } from "@/lib/rbac";

import { LayarDapur, type OrderLayar } from "./layar";

export const metadata: Metadata = { title: { absolute: "Layar Dapur · Tiska" } };
export const dynamic = "force-dynamic";

/* Layar Dapur (08-TIM-PWA §7, D-055): order & kloter HARI INI, tanpa harga. */
export default async function HalamanLayarDapur() {
  await wajibIzin("layar-dapur");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const tanggal = new Date(`${hariIni}T00:00:00Z`);

  const event = await prisma.events.findMany({
    where: {
      status: { not: "batal" },
      OR: [{ first_date: tanggal }, { event_items: { some: { session_date: tanggal } } }, { event_kloters: { some: { date: tanggal } } }],
    },
    include: {
      customers: { select: { name: true } },
      event_items: { orderBy: { sort: "asc" } },
      event_kloters: { where: { date: tanggal }, orderBy: { no: "asc" }, include: { kloter_tracking: { select: { status: true } } } },
    },
  });

  const tgl = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);
  const order: OrderLayar[] = event
    .map((e) => {
      const items = e.event_items.filter((i) => (tgl(i.session_date) ?? tgl(e.first_date)) === hariIni);
      return {
        id: e.id.toString(),
        nama: e.customers.name,
        tempat: e.venue,
        items: items.map((i) => ({
          nama: i.item_name,
          jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
          jam: i.session_time,
          isi: i.contents ? i.contents.split("\n") : [],
        })),
        kloter: e.event_kloters.map((k) => ({
          id: k.id.toString(),
          no: k.no,
          jam: k.depart_time,
          status: (["selesai", "tiba", "berangkat"].find((s) => k.kloter_tracking.some((t) => t.status === s)) ?? null) as OrderLayar["kloter"][number]["status"],
          dapur: k.kloter_tracking.map((t) => t.status).filter((s) => ["dimasak", "packing", "siap"].includes(s)),
        })),
      };
    })
    .filter((o) => o.items.length || o.kloter.length)
    .sort((a, b) => (a.kloter[0]?.jam ?? a.items[0]?.jam ?? "99").localeCompare(b.kloter[0]?.jam ?? b.items[0]?.jam ?? "99"));

  return <LayarDapur tanggal={hariIni} order={order} />;
}
