import { ChevronLeft, UtensilsCrossed } from "lucide-react";
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
import { NamaLain } from "./nama-lain";

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
      merged_into: true,
      menus: { select: { id: true, name: true } },
      menu_aliases: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      other_menus: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!m) notFound();
  // Menu yang sudah digabung (D-122) tidak bisa diubah — server juga menolak.
  const bolehUbah = bolehUbahResep(sesi.peran) && !m.merged_into;
  const resep = bolehUbah
    ? await prisma.recipes.findMany({ where: { merged_into: null }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } })
    : [];
  const izin = await bacaIzin();
  const bukaPaket = bolehBuka(sesi.peran, "paket", izin);
  const bukaResep = bolehBuka(sesi.peran, "resep", izin);
  const paket = [...new Map(m.package_items.map((i) => [i.packages.id, i.packages])).values()];
  const menuLain = bolehUbah && !m.merged_into
    ? (await prisma.menus.findMany({ where: { active: true, NOT: { id: BigInt(id) } }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((x) => ({ id: x.id.toString(), label: x.name }))
    : [];

  return (
    <Halaman>
      <Link href="/menu" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Menu
      </Link>
      <KepalaHalaman ikon={UtensilsCrossed}
        judul={m.name}
        keterangan={[
          m.category ? KATEGORI_MENU[m.category as KategoriMenu] ?? m.category : "kategori belum diisi",
          m.kitchen ? LABEL_DAPUR[m.kitchen as keyof typeof LABEL_DAPUR] : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        aksi={m.recipes ? <Pil nada="baik">Terhubung resep</Pil> : <Pil nada="perhatian">Belum ada resep</Pil>}
      />

      {m.menus ? (
        <p className="mb-5 rounded-2xl border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          Menu ini sudah digabung ke{" "}
          <Link href={`/menu/${m.menus.id}`} className="font-medium underline underline-offset-4">
            {m.menus.name}
          </Link>{" "}
          — namanya dihitung sebagai menu itu. Tidak dihapus supaya dokumen lama tetap terbaca.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <section className="rounded-[14px] border bg-card p-5">
          <h2 className="pb-4 text-sm font-semibold">{bolehUbah ? "Ubah data menu" : "Data menu"}</h2>
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

        <div className="flex min-w-0 flex-col gap-6">
        {!m.merged_into ? (
          <section className="rounded-[14px] border bg-card p-5">
            <h2 className="pb-1 text-sm font-semibold">Nama lain</h2>
            <p className="pb-3 text-sm text-muted-foreground">Nama di pricelist, paket, atau dokumen yang sebenarnya menu ini. Semua dihitung memakai resep menu ini.</p>
            {bolehUbah ? (
              <NamaLain idMenu={id} nama={m.name} namaLain={m.menu_aliases.map((a) => ({ id: a.id.toString(), name: a.name }))} menuLain={menuLain} />
            ) : m.menu_aliases.length ? (
              <p className="text-sm">{m.menu_aliases.map((a) => a.name).join(" · ")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada nama lain.</p>
            )}
            {m.other_menus.length ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                Menu yang sudah digabung ke sini:{" "}
                {m.other_menus.map((x, i) => (
                  <span key={x.id.toString()}>
                    {i ? ", " : ""}
                    <Link href={`/menu/${x.id}`} className="underline-offset-4 hover:underline">
                      {x.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        ) : null}
        <section>
          <h2 className="pb-2.5 text-sm font-semibold">Dipakai di paket</h2>
          {paket.length ? (
            <ul className="flex flex-col divide-y rounded-[14px] border bg-card text-sm">
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
      </div>
    </Halaman>
  );
}
