import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { bacaIzin } from "@/lib/izin";
import { KATEGORI_MENU, type KategoriMenu, LABEL_DAPUR } from "@/lib/menu";
import { bolehBuka } from "@/lib/navigasi";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormMenu } from "./form-menu";

export const metadata: Metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function HalamanDetailMenu({ params }: PageProps<"/menu/[id]">) {
  const sesi = await wajibIzin("menu");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const m = await prisma.menus.findUnique({
    where: { id: BigInt(id) },
    select: {
      name: true,
      category: true,
      kitchen: true,
      recipe_id: true,
      portion_factor: true,
      active: true,
      recipes: { select: { id: true, code: true, name: true } },
      package_items: { select: { packages: { select: { id: true, code: true, name: true } } } },
    },
  });
  if (!m) notFound();
  const bolehUbah = bolehUbahResep(sesi.peran);
  const resep = bolehUbah
    ? await prisma.recipes.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } })
    : [];
  const izin = await bacaIzin();
  const bukaPaket = bolehBuka(sesi.peran, "paket", izin);
  const bukaResep = bolehBuka(sesi.peran, "resep", izin);
  const paket = [...new Map(m.package_items.map((i) => [i.packages.id, i.packages])).values()];

  return (
    <Halaman>
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Menu
      </Link>
      <KepalaHalaman
        judul={m.name}
        keterangan={[
          m.category ? KATEGORI_MENU[m.category as KategoriMenu] ?? m.category : "kategori belum diisi",
          m.kitchen ? LABEL_DAPUR[m.kitchen as keyof typeof LABEL_DAPUR] : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        aksi={m.recipes ? <Pil nada="baik">Terhubung resep</Pil> : <Pil nada="perhatian">Belum ada resep</Pil>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <section className="rounded-2xl border bg-card p-5">
          {bolehUbah ? (
            <FormMenu
              menu={{
                id,
                name: m.name,
                category: m.category,
                kitchen: m.kitchen,
                recipeId: m.recipe_id?.toString() ?? null,
                faktor: m.portion_factor.toString(),
                active: m.active,
              }}
              resep={resep.map((r) => ({ id: r.id.toString(), label: r.name, sub: r.code }))}
            />
          ) : (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Resep</dt>
                <dd>
                  {m.recipes ? (
                    bukaResep ? (
                      <Link href={`/resep/${m.recipes.id}`} className="hover:underline">
                        {m.recipes.name} · {m.recipes.code}
                      </Link>
                    ) : (
                      `${m.recipes.name} · ${m.recipes.code}`
                    )
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Faktor porsi</dt>
                <dd className="tabular-nums">{Number(m.portion_factor).toLocaleString("id-ID")}</dd>
              </div>
            </dl>
          )}
        </section>

        <section>
          <h2 className="pb-2.5 text-sm font-semibold">Dipakai di paket</h2>
          {paket.length ? (
            <ul className="flex flex-col divide-y rounded-2xl border bg-card text-sm">
              {paket.map((p) => (
                <li key={p.id.toString()} className="px-4 py-2.5">
                  {bukaPaket ? (
                    <Link href={`/paket/${p.id}`} className="hover:underline">
                      [{p.code}] {p.name}
                    </Link>
                  ) : (
                    `[${p.code}] ${p.name}`
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum dipakai paket mana pun.</p>
          )}
        </section>
      </div>
    </Halaman>
  );
}
