import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { asalSitus } from "@/lib/asal-situs";
import { LABEL_WILAYAH, ukuranBerkas } from "@/lib/pricelist";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { TombolBagikan } from "./tombol-bagikan";

export const metadata: Metadata = { title: "Pricelist" };
export const dynamic = "force-dynamic";

export default async function HalamanPricelist({ searchParams }: PageProps<"/pricelist">) {
  await wajibIzin("pricelist");
  const { cari, status, akses } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = status === "arsip" ? "arsip" : "aktif";

  const semua = await prisma.pricelists.findMany({
    where: kunci
      ? {
          OR: [
            { name: { contains: kunci, mode: "insensitive" } },
            { code: { contains: kunci } },
            { segment: { contains: kunci, mode: "insensitive" } },
            { venue: { contains: kunci, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      segment: true,
      region: true,
      price_basis: true,
      seasonal: true,
      status: true,
      notes: true,
      pricelist_files: {
        where: { is_active: true },
        select: { version: true, file_size: true, light_size: true, pages: true },
      },
    },
  });
  const tampil = semua.filter((p) => p.status === saring);
  const asal = await asalSitus();

  return (
    <Halaman>
      <KepalaHalaman
        judul="Pricelist"
        keterangan="Link /pl selalu membuka versi terbaru — link yang sudah terkirim ke klien tidak perlu diganti."
      />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />
      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari wedding, Bogor, hampers, corporate…" />
        <SaringStatus
          pilihan={[
            { nilai: "", label: "Aktif", jumlah: semua.filter((p) => p.status === "aktif").length },
            { nilai: "arsip", label: "Arsip / musiman", jumlah: semua.filter((p) => p.status === "arsip").length },
          ]}
        />
      </div>

      {tampil.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <KeadaanKosong judul="Tidak ada pricelist" keterangan={kunci ? `Tidak ditemukan untuk "${kunci}".` : undefined} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tampil.map((p) => {
            const f = p.pricelist_files[0];
            const tautan = `${asal}/pl/${p.slug}`;
            return (
              <li key={p.id.toString()} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/pricelist/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.code} · {p.segment}
                      {p.region ? ` · ${LABEL_WILAYAH[p.region] ?? p.region}` : ""}
                    </p>
                  </div>
                  {p.price_basis ? <Pil>{p.price_basis === "nett" ? "Nett" : "++"}</Pil> : null}
                </div>
                {f ? (
                  <p className="text-xs text-muted-foreground">
                    Versi {f.version} · {f.pages ? `${f.pages} hlm · ` : ""}
                    {ukuranBerkas(f.light_size ?? f.file_size)}
                    {f.light_size ? " (versi ringan)" : ""}
                  </p>
                ) : null}
                {p.notes ? <p className="text-xs text-amber-700 dark:text-amber-400">{p.notes}</p> : null}
                {p.status === "aktif" ? (
                  <TombolBagikan id={p.id.toString()} nama={p.name} tautan={tautan} />
                ) : (
                  <Link href={`/pricelist/${p.id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                    Arsip — link klien dimatikan. Lihat / aktifkan lagi
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Halaman>
  );
}
