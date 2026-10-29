import { PencilLine, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BingkaiTabel,
  Halaman,
  KeadaanKosong,
  KepalaHalaman,
  Pil,
  RingkasanTabel,
  Td,
  Th,
} from "@/components/halaman";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { Pencarian } from "@/components/pencarian";
import { TombolImpor } from "@/components/tombol-impor";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { calonMirip, saringMirip } from "@/lib/cari-mirip";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";
import { bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

export const metadata: Metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function HalamanMenu({ searchParams }: PageProps<"/menu">) {
  const sesi = await wajibIzin("menu");
  const bolehUbah = bolehUbahResep(sesi.peran);
  const { cari, status, akses } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = typeof status === "string" ? status : "";

  // Pencarian toleran salah ketik & ikut mencari lewat nama lain (D-122); menu yang sudah digabung disembunyikan.
  const seluruh = await prisma.menus.findMany({
    where: { merged_into: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      active: true,
      portion_factor: true,
      recipes: { select: { code: true } },
      menu_aliases: { select: { name: true } },
      _count: { select: { package_items: true } },
    },
  });
  const semua = saringMirip(kunci, seluruh, (m) => [m.name, ...m.menu_aliases.map((a) => a.name)]);
  const saran = kunci && semua.length === 0 ? calonMirip(kunci, seluruh, (m) => m.name, 0.34, 3).map((c) => c.x) : [];
  const tampil = semua
    .filter((m) =>
      saring === "belum_resep" ? !m.recipes : saring === "terhubung" ? Boolean(m.recipes) : saring === "tanpa_kategori" ? !m.category : true,
    )
    // Antrian dikerjakan dari menu yang paling banyak dipakai paket.
    .sort((a, b) => (saring ? b._count.package_items - a._count.package_items : 0));

  return (
    <Halaman>
      <KepalaHalaman ikon={UtensilsCrossed}
        judul="Menu"
        keterangan="Hidangan yang dijual di paket. Hubungkan ke resep supaya HPP paket mengikuti harga bahan terbaru."
        aksi={
          bolehUbah ? (
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/menu/rapikan" />} variant="outline" className="rounded-full bg-card">
                <Sparkles className="size-4" />
                Rapikan Menu
              </Button>
              <TombolImpor jenis="menu" />
              <Button render={<Link href="/menu/baru" />} className="rounded-full">
                <Plus className="size-4" />
                Tambah menu
              </Button>
            </div>
          ) : null
        }
      />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />
      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari nama menu…" />
        <SaringStatus
          pilihan={[
            { nilai: "", label: "Semua", jumlah: semua.length },
            { nilai: "belum_resep", label: "Belum ada resep", jumlah: semua.filter((m) => !m.recipes).length },
            { nilai: "terhubung", label: "Terhubung resep", jumlah: semua.filter((m) => m.recipes).length },
            { nilai: "tanpa_kategori", label: "Tanpa kategori", jumlah: semua.filter((m) => !m.category).length },
          ]}
        />
      </div>

      <BingkaiTabel>
        {tampil.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pb-6">
            <KeadaanKosong judul="Tidak ada menu" keterangan={kunci ? `Tidak ditemukan menu untuk "${kunci}".` : "Tidak ada menu di penyaring ini."} />
            {saran.length ? (
              <p className="px-4 text-center text-[0.9375rem]">
                Mungkin maksudnya:{" "}
                {saran.map((m, i) => (
                  <span key={m.id.toString()}>
                    {i ? ", " : ""}
                    <Link href={`/menu/${m.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {m.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Menu</Th>
                <Th className="hidden w-44 md:table-cell">Kategori</Th>
                <Th className="w-36">Resep</Th>
                <Th className="hidden w-24 text-right sm:table-cell">Paket</Th>
                {bolehUbah ? <Th className="w-px"><span className="sr-only">Aksi</span></Th> : null}
              </tr>
            </thead>
            <tbody>
              {tampil.map((m) => (
                <tr key={m.id.toString()} className="relative cursor-pointer border-b border-border-row last:border-0 hover:bg-muted/40">
                  <Td>
                    <Link href={`/menu/${m.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                      {m.name}
                    </Link>
                    {!m.active ? <span className="block text-xs text-muted-foreground">tidak dijual</span> : null}
                    {m.menu_aliases.length ? <span className="block text-xs text-muted-foreground">juga: {m.menu_aliases.map((a) => a.name).join(" · ")}</span> : null}
                  </Td>
                  <Td className="hidden text-muted-foreground md:table-cell">
                    {m.category ? KATEGORI_MENU[m.category as KategoriMenu] ?? m.category : "—"}
                  </Td>
                  <Td>
                    {m.recipes ? (
                      <span className="nomor-dokumen text-muted-foreground">
                        {m.recipes.code}
                        {!m.portion_factor.eq(1) ? ` ×${Number(m.portion_factor).toLocaleString("id-ID")}` : ""}
                      </span>
                    ) : (
                      <Pil nada="perhatian">Belum ada</Pil>
                    )}
                  </Td>
                  <Td className="angka hidden text-right text-muted-foreground tabular-nums sm:table-cell">{m._count.package_items}</Td>
                  {bolehUbah ? (
                    <Td className="w-px text-right">
                      <Button render={<Link href={`/menu/${m.id}`} />} variant="outline" size="sm" className="relative z-10 rounded-full" aria-label={`Ubah ${m.name}`}>
                        <PencilLine className="size-4" />
                        <span className="hidden sm:inline">Ubah</span>
                      </Button>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>
      {tampil.length > 0 ? (
        <RingkasanTabel>
          {tampil.length} menu · {semua.filter((m) => !m.recipes).length} belum ada resep
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
