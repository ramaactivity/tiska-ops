import { ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { hitungKebutuhan, type PesananMenu } from "@/lib/hitung/kebutuhan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const metadata: Metadata = { title: "Kebutuhan Bahan" };
export const dynamic = "force-dynamic";

const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/* Kebutuhan bahan per tanggal dari event (D-057): isi menu → resep → takaran × porsi. TANPA harga. */
export default async function HalamanKebutuhan({ searchParams }: PageProps<"/kebutuhan-bahan">) {
  await wajibIzin("kebutuhan-bahan");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const geser = (n: number) => new Date(Date.parse(`${hariIni}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const { tanggal: q } = await searchParams;
  const tanggal = typeof q === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : geser(1);
  const tgl = new Date(`${tanggal}T00:00:00Z`);

  const event = await prisma.events.findMany({
    where: { status: { not: "batal" }, OR: [{ first_date: tgl }, { event_items: { some: { session_date: tgl } } }] },
    include: { customers: { select: { name: true } }, event_items: { orderBy: { sort: "asc" } } },
  });
  const iso = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);

  // Porsi per nama menu (isi paket, atau nama baris itu sendiri bila tanpa rincian).
  const porsiMenu = new Map<string, number>();
  for (const e of event) {
    for (const i of e.event_items.filter((x) => (iso(x.session_date) ?? iso(e.first_date)) === tanggal)) {
      const porsi = Math.round(Number(i.qty) * (i.pax && i.pax > 1 ? i.pax : 1));
      const isi = i.contents ? i.contents.split("\n") : [i.item_name];
      for (const m of isi) porsiMenu.set(m, (porsiMenu.get(m) ?? 0) + porsi);
    }
  }
  const menu = await prisma.menus.findMany({
    where: { name: { in: [...porsiMenu.keys()] } },
    select: {
      name: true,
      portion_factor: true,
      recipes: {
        select: {
          portions_per_batch: true,
          recipe_lines: {
            select: {
              qty_per_batch: true,
              usage_unit: true,
              ingredients: { select: { id: true, name: true, usage_unit: true, usage_qty_per_pack: true, purchase_unit: true, is_placeholder: true } },
            },
          },
        },
      },
    },
  });
  const perNama = new Map(menu.map((m) => [m.name, m]));
  const pesanan: PesananMenu[] = [...porsiMenu.entries()].map(([nama, porsi]) => {
    const m = perNama.get(nama);
    return {
      menu: nama,
      porsi,
      faktor: m?.portion_factor.toString() ?? "1",
      resep: m?.recipes
        ? {
            porsiPerBatch: m.recipes.portions_per_batch?.toString() ?? null,
            baris: m.recipes.recipe_lines.map((l) => ({
              idBahan: l.ingredients.id.toString(),
              nama: l.ingredients.name,
              satuan: l.usage_unit ?? l.ingredients.usage_unit,
              qtyPerBatch: l.qty_per_batch.toString(),
              perKemasan: l.ingredients.usage_qty_per_pack?.toString() ?? null,
              satuanBeli: l.ingredients.purchase_unit,
              pengganti: l.ingredients.is_placeholder,
            })),
          }
        : null,
    };
  });
  // Nama yang tidak ada di master menu (diketik manual / baris tanpa rincian) — jangan hilang diam-diam.
  const tidakDikenal = [...porsiMenu.entries()].filter(([n]) => !perNama.has(n));
  const { bahan, tanpaResep } = hitungKebutuhan(pesanan.filter((p) => perNama.has(p.menu)));
  const totalPorsi = [...porsiMenu.values()].reduce((a, b) => a + b, 0);

  const pilihan: [string, string][] = [
    [geser(0), "Hari ini"],
    [geser(1), "Besok"],
    [geser(2), "Lusa"],
  ];

  return (
    <Halaman>
      <KepalaHalaman ikon={ShoppingBasket} judul="Kebutuhan Bahan" keterangan="Dihitung dari isi menu event × takaran resep × porsi. Tanpa harga — dasar daftar belanja." />
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {pilihan.map(([t, label]) => (
          <Link
            key={t}
            href={`/kebutuhan-bahan?tanggal=${t}`}
            className={`min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors ${t === tanggal ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <p className="pb-4 text-sm text-muted-foreground">
        {hariPanjang(tanggal)} · {event.length} event · {totalPorsi.toLocaleString("id-ID")} porsi menu
      </p>

      {event.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <KeadaanKosong judul="Tidak ada event di tanggal ini." />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {bahan.length ? (
            <BingkaiTabel>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <Th>Bahan</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="text-right">≈ Kemasan beli</Th>
                    <Th>Untuk menu</Th>
                  </tr>
                </thead>
                <tbody>
                  {bahan.map((b) => (
                    <tr key={b.idBahan} className="border-b last:border-b-0">
                      <Td>
                        <Link href={`/bahan/${b.idBahan}`} className="font-medium underline-offset-4 hover:underline">
                          {b.nama}
                        </Link>
                        {b.pengganti ? (
                          <span className="ml-2">
                            <Pil nada="perhatian">bahan pengganti</Pil>
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular-nums">
                        {angka(b.qty)} {b.satuan ?? ""}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {b.kemasan ? `${angka(b.kemasan)} ${b.satuanBeli ?? "kemasan"}` : "—"}
                      </Td>
                      <Td className="text-muted-foreground">{b.menu.join(", ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </BingkaiTabel>
          ) : null}
          {tanpaResep.length || tidakDikenal.length ? (
            <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
              <p className="font-medium">Belum bisa dihitung — lengkapi supaya daftar belanja utuh:</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                {tanpaResep.map((t) => (
                  <li key={t.menu}>
                    {t.menu} ({t.porsi.toLocaleString("id-ID")} porsi) — menu belum terhubung resep / porsi resep kosong
                  </li>
                ))}
                {tidakDikenal.map(([n, porsi]) => (
                  <li key={n}>
                    {n} ({porsi.toLocaleString("id-ID")} porsi) — tidak ada di master menu
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Halaman>
  );
}
