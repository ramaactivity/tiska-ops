import { FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { daftarAset, opsiAcara } from "@/lib/aset";
import { saringMirip } from "@/lib/cari-mirip";
import { KATEGORI_ASET, type KategoriAset } from "@/lib/hitung/aset";
import { wajibIzin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { DaftarAset } from "./daftar-aset";

export const metadata: Metadata = { title: "Aset Digital" };
export const dynamic = "force-dynamic";

/* Aset Digital (D-127): satu tempat untuk link Google Drive, desain Canva, dan dokumentasi acara. */
export default async function HalamanAset({ searchParams }: PageProps<"/aset">) {
  await wajibIzin("aset");
  const { cari, k } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const aktif = typeof k === "string" && k in KATEGORI_ASET ? (k as KategoriAset) : null;
  const [semua, acara] = await Promise.all([daftarAset(), opsiAcara()]);
  const jumlah = new Map<string, number>();
  for (const a of semua) jumlah.set(a.kategori, (jumlah.get(a.kategori) ?? 0) + 1);
  const sekategori = aktif ? semua.filter((a) => a.kategori === aktif) : semua;
  const tampil = kunci ? saringMirip(kunci, sekategori, (a) => [a.judul, a.catatan, a.acara?.nama, KATEGORI_ASET[a.kategori as KategoriAset]], 200) : sekategori;
  const href = (kat: string | null) => {
    const q = new URLSearchParams();
    if (kat) q.set("k", kat);
    if (kunci) q.set("cari", kunci);
    return `/aset${q.size ? `?${q}` : ""}`;
  };

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FolderOpen}
        judul="Aset Digital"
        jumlah={semua.length}
        keterangan="Link Google Drive, desain Canva (pricelist, brosur, kartu nama, label…) dan dokumentasi acara. Ketuk kartu untuk langsung membukanya."
      />
      <div className="mb-3 max-w-xl">
        <Pencarian placeholder="Cari judul, catatan, atau nama customer" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[[null, `Semua (${semua.length})`] as const, ...Object.entries(KATEGORI_ASET).filter(([kat]) => jumlah.has(kat)).map(([kat, label]) => [kat, `${label} (${jumlah.get(kat)})`] as const)].map(([kat, label]) => (
          <Link
            key={kat ?? "semua"}
            href={href(kat)}
            className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", kat === aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
          >
            {label}
          </Link>
        ))}
      </div>
      <DaftarAset
        aset={tampil}
        bolehUbah
        opsiAcara={acara}
        kosong={kunci ? `Tidak ada tautan yang cocok dengan "${kunci}".` : "Belum ada tautan. Tekan Tambah tautan, lalu tempel link dari Google Drive atau Canva."}
      />
    </Halaman>
  );
}
