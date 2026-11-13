import { Images, Inbox, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { Button } from "@/components/ui/button";
import { calonMirip, saringMirip } from "@/lib/cari-mirip";
import { prisma } from "@/lib/prisma";
import { alamatPublik } from "@/lib/r2";
import { wajibIzin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { TombolKeranjang } from "./link-galeri";

export const metadata: Metadata = { title: "Foto Menu" };
export const dynamic = "force-dynamic";

type Kartu = { href: string; nama: string; sub: string | null; jumlah: number; sampul: string | null; pakai: number };

/* Foto Menu (D-124): cari menu/paket seperti yang ditulis klien (toleran salah ketik, nama lain ikut), lalu kirim fotonya. TANPA harga. */
export default async function HalamanFotoMenu({ searchParams }: PageProps<"/foto-menu">) {
  await wajibIzin("foto-menu");
  const { cari, tab } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const aktif = tab === "belum" ? "belum" : "ada";

  const [menu, paket, belumDitandai] = await Promise.all([
    prisma.menus.findMany({
      where: { active: true, merged_into: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        menu_aliases: { select: { name: true } },
        menu_photos: { where: { hidden: false }, orderBy: [{ is_cover: "desc" }, { id: "asc" }], select: { thumb_key: true } },
        _count: { select: { package_items: true, quotation_items_quotation_items_menu_idTomenus: true } },
      },
    }),
    prisma.packages.findMany({
      where: { status: "aktif" },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, menu_photos: { where: { hidden: false }, orderBy: [{ is_cover: "desc" }, { id: "asc" }], select: { thumb_key: true } } },
    }),
    prisma.menu_photos.count({ where: { menu_id: null, package_id: null } }),
  ]);

  const kartuMenu: (Kartu & { cari: string[] })[] = menu.map((m) => ({
    href: `/foto-menu/m/${m.id}`,
    nama: m.name,
    sub: m.menu_aliases.length ? `juga: ${m.menu_aliases.map((a) => a.name).join(", ")}` : null,
    jumlah: m.menu_photos.length,
    sampul: m.menu_photos[0] ? alamatPublik(m.menu_photos[0].thumb_key) : null,
    pakai: m._count.package_items + m._count.quotation_items_quotation_items_menu_idTomenus,
    cari: [m.name, ...m.menu_aliases.map((a) => a.name)],
  }));
  const kartuPaket: (Kartu & { cari: string[] })[] = paket.map((p) => ({
    href: `/foto-menu/p/${p.id}`,
    nama: `${p.code} ${p.name}`,
    sub: "paket",
    jumlah: p.menu_photos.length,
    sampul: p.menu_photos[0] ? alamatPublik(p.menu_photos[0].thumb_key) : null,
    pakai: 0,
    cari: [p.name, p.code],
  }));

  const hasil = kunci ? saringMirip(kunci, [...kartuMenu, ...kartuPaket], (k) => k.cari, 60) : [];
  const saran = kunci && !hasil.length ? calonMirip(kunci, kartuMenu, (k) => k.nama, 0.34, 4).map((c) => c.x) : [];
  const bergambar = [...kartuMenu, ...kartuPaket].filter((k) => k.jumlah > 0).sort((a, b) => a.nama.localeCompare(b.nama));
  const tanpaFoto = kartuMenu.filter((k) => k.jumlah === 0).sort((a, b) => b.pakai - a.pakai).slice(0, 60);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Images}
        judul="Foto Menu"
        keterangan="Ketik nama menu seperti yang ditulis klien — salah ketik & nama lain tetap ketemu. Buka menunya, pilih foto, lalu Kirim ke WA."
        aksi={
          <>
            <TombolKeranjang />
            <Button variant="outline" className="rounded-full bg-card" render={<Link href="/foto-menu/link" />}>
              <Link2 className="size-4" />
              Link terkirim
            </Button>
            <Button variant="outline" className="rounded-full bg-card" render={<Link href="/foto-menu/belum-ditandai" />}>
              <Inbox className="size-4" />
              Unggah banyak / belum ditandai{belumDitandai ? ` (${belumDitandai})` : ""}
            </Button>
          </>
        }
      />
      <div className="mb-4 max-w-xl">
        <Pencarian placeholder="Cari menu atau paket, mis. ayam bakar madu" />
      </div>

      {kunci ? (
        hasil.length ? (
          <Grid kartu={hasil} />
        ) : (
          <p className="kartu px-4 py-6 text-center text-[0.9375rem] text-muted-foreground">
            Tidak ditemukan &quot;{kunci}&quot;.
            {saran.length ? (
              <>
                {" "}
                Mungkin maksudnya:{" "}
                {saran.map((s, i) => (
                  <span key={s.href}>
                    {i ? ", " : ""}
                    <Link href={s.href} className="font-medium text-primary underline-offset-4 hover:underline">
                      {s.nama}
                    </Link>
                  </span>
                ))}
              </>
            ) : null}
          </p>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(
              [
                ["ada", `Punya foto (${bergambar.length})`],
                ["belum", "Menu laris tanpa foto"],
              ] as const
            ).map(([t, label]) => (
              <Link
                key={t}
                href={t === "ada" ? "/foto-menu" : "/foto-menu?tab=belum"}
                className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", t === aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
              >
                {label}
              </Link>
            ))}
          </div>
          {aktif === "ada" ? (
            bergambar.length ? (
              <Grid kartu={bergambar} />
            ) : (
              <p className="kartu px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">
                Belum ada foto. Cari menunya lalu tekan Unggah foto, atau pakai <b>Unggah banyak</b> untuk memindah arsip Google Drive.
              </p>
            )
          ) : (
            <>
              <p className="mb-3 text-[0.9375rem] text-muted-foreground">Menu yang paling sering dipakai paket & quotation tapi belum punya foto — prioritas dokumentasi berikutnya.</p>
              <Grid kartu={tanpaFoto} />
            </>
          )}
        </>
      )}
    </Halaman>
  );
}

function Grid({ kartu }: { kartu: Kartu[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kartu.map((k) => (
        <li key={k.href}>
          <Link href={k.href} className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-primary/40">
            {k.sampul ? (
              // eslint-disable-next-line @next/next/no-img-element -- thumbnail R2
              <img src={k.sampul} alt={k.nama} loading="lazy" className="aspect-[4/3] w-full bg-muted object-cover" />
            ) : (
              <span className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">Belum ada foto</span>
            )}
            <span className="flex flex-1 flex-col gap-0.5 p-3">
              <span className="text-[0.9375rem] font-medium leading-snug">{k.nama}</span>
              {k.sub && k.sub !== "paket" ? <span className="line-clamp-1 text-xs text-muted-foreground">{k.sub}</span> : null}
              <span className="mt-auto pt-1 text-xs text-muted-foreground">{k.sub === "paket" ? "Paket · " : ""}{k.jumlah ? `${k.jumlah} foto` : "belum ada foto"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
