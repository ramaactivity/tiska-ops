import type { Metadata } from "next";

import { type Dapur, dapurMenu, saringIsiDapur } from "@/lib/dapur-layar";
import { porsiProgramTanggal } from "@/lib/ikut-menu-pesta";
import { prisma } from "@/lib/prisma";
import { uraiBarisIsi } from "@/lib/slot-paket";
import { teksJumlahBaris } from "@/lib/uang";
import { wajibIzin } from "@/lib/rbac";

import { LayarDapur, type OrderLayar } from "./layar";

export const metadata: Metadata = { title: { absolute: "Layar Dapur · Tiska" } };
export const dynamic = "force-dynamic";

/* Layar Dapur (08-TIM-PWA §7, D-055): order & kloter HARI INI, tanpa harga.
   ?dapur=masak|pastry → hanya isi yang menjadi tugas dapur itu (D-097); tiap TV bisa di-bookmark. */
export default async function HalamanLayarDapur({ searchParams }: PageProps<"/layar-dapur">) {
  await wajibIzin("layar-dapur");
  const { dapur: q } = await searchParams;
  const dapur: Dapur | null = q === "masak" || q === "pastry" ? q : null;
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

  // Dapur tiap baris isi: menu master (kolom dapur, atau tebakan dari kategori); buffet "Soup: …" diurai dulu.
  const [menu, opsi] = dapur
    ? await Promise.all([
        prisma.menus.findMany({ select: { name: true, kitchen: true, category: true } }),
        prisma.package_slot_options.findMany({ where: { menu_id: { not: null } }, select: { name: true, menus: { select: { name: true } } } }),
      ])
    : [[], []];
  const perNama = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
  const kamus = new Map(opsi.map((o) => [o.name.toLowerCase(), o.menus!.name]));
  const dapurBaris = (b: string) => new Set(uraiBarisIsi(b, kamus).map((n) => dapurMenu(perNama.get(n.replace(/^\[[^\]]*\]\s*/, "").toLowerCase()))));

  const tgl = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);
  const order: OrderLayar[] = event
    .map((e) => {
      const items = e.event_items.filter((i) => (tgl(i.session_date) ?? tgl(e.first_date)) === hariIni);
      return {
        id: e.id.toString(),
        nama: e.customers.name,
        tempat: e.venue,
        items: items.flatMap((i) => {
          const isi = i.contents ? i.contents.split("\n") : [];
          const milik = !dapur || (isi.length ? isi.some((b) => dapurBaris(b).has(dapur)) : dapurBaris(i.item_name).has(dapur));
          if (!milik) return [];
          return [
            {
              nama: i.item_name,
              jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
              jam: i.session_time,
              isi: dapur && isi.length ? saringIsiDapur(isi, dapurBaris, dapur) : isi,
            },
          ];
        }),
        kloter: e.event_kloters.map((k) => ({
          id: k.id.toString(),
          no: k.no,
          jam: k.depart_time,
          status: (["selesai", "tiba", "berangkat"].find((s) => k.kloter_tracking.some((t) => t.status === s)) ?? null) as OrderLayar["kloter"][number]["status"],
          dapur: k.kloter_tracking.map((t) => t.status).filter((s) => ["dimasak", "packing", "siap"].includes(s)),
        })),
      };
    })
    // Ikut Menu Pesta (D-116): total pax per paket hari ini, dimasak bersama acara induknya.
    .concat(
      (await porsiProgramTanggal(hariIni)).map((p) => ({
        id: `program-${p.id}`,
        nama: p.nama.replace(/ · .*/, ""),
        tempat: "Retail — dikirim ke pembeli",
        items: p.paket
          .filter((x) => x.pax > 0 && (!dapur || x.isi.some((m) => dapurBaris(m).has(dapur))))
          .map((x) => ({ nama: x.judul, jumlah: `${x.pax} PAX`, jam: null, isi: dapur ? saringIsiDapur(x.isi, dapurBaris, dapur) : x.isi })),
        kloter: [],
      })),
    )
    .filter((o) => o.items.length || (!dapur && o.kloter.length))
    .sort((a, b) => (a.kloter[0]?.jam ?? a.items[0]?.jam ?? "99").localeCompare(b.kloter[0]?.jam ?? b.items[0]?.jam ?? "99"));

  return <LayarDapur tanggal={hariIni} order={order} dapur={dapur} />;
}
