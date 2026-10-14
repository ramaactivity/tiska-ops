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
import { SaringStatus } from "@/components/saring-status";
import { biayaPaket } from "@/lib/biaya-paket";
import { hitungHppPaket, LABEL_PITA, nilaiUntung, type Pita } from "@/lib/hitung/paket";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

const NADA_PITA: Record<Pita, "baik" | "perhatian" | "netral"> = { aman: "baik", mepet: "perhatian", rendah: "perhatian" };

export default async function HalamanPaket({ searchParams }: PageProps<"/paket">) {
  const sesi = await wajibIzin("paket");
  const { cari, lini, akses } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saringLini = typeof lini === "string" ? lini : "";
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  const daftar = await prisma.packages.findMany({
    where: {
      status: "aktif",
      ...(kunci
        ? {
            OR: [
              { name: { contains: kunci, mode: "insensitive" } },
              { code: { contains: kunci, mode: "insensitive" } },
              { package_items: { some: { menus: { name: { contains: kunci, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ line: "asc" }, { id: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      line: true,
      price: true,
      notes: true,
      service_forms: { select: { name: true } },
      package_items: { select: { id: true } },
    },
  });
  // Biaya dibaca terpisah dan hanya untuk owner/finance (lib/biaya-paket.ts).
  const biaya = lihatBiaya ? await biayaPaket(sesi, daftar.map((p) => p.id)) : null;
  const atur = lihatBiaya ? await bacaPengaturanBisnis() : null;
  const semuaLini = [...new Set(daftar.map((p) => p.line ?? "Lainnya"))];

  const baris = daftar
    .filter((p) => !saringLini || (p.line ?? "Lainnya") === saringLini)
    .map((p) => {
      const b = biaya?.get(p.id);
      const hpp = b ? hitungHppPaket([...b.item.values()].map((x) => x.hpp), b.kemasan) : null;
      const tanpaHpp = b ? [...b.item.values()].filter((x) => !x.hpp).length : 0;
      const untung =
        hpp && atur && tanpaHpp === 0
          ? nilaiUntung({ harga: p.price, hpp, untungAmanPct: atur.untung_aman_pct, untungMinPct: atur.untung_min_pct })
          : null;
      return { p, hpp, untung, tanpaHpp };
    });

  return (
    <Halaman>
      <KepalaHalaman
        judul="Paket"
        keterangan={
          lihatBiaya
            ? `Isi paket, harga jual, HPP per porsi, dan untung (aman ≥ ${atur?.untung_aman_pct}% · minimum ${atur?.untung_min_pct}%).`
            : "Isi paket dan harga jual per porsi."
        }
      />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />

      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari kode, nama paket, atau isi menu…" />
        <SaringStatus
          parameter="lini"
          pilihan={[
            { nilai: "", label: "Semua", jumlah: daftar.length },
            ...semuaLini.map((l) => ({ nilai: l, label: l, jumlah: daftar.filter((p) => (p.line ?? "Lainnya") === l).length })),
          ]}
        />
      </div>

      <BingkaiTabel>
        {baris.length === 0 ? (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Belum ada paket"}
            keterangan={kunci ? `Tidak ditemukan paket untuk "${kunci}".` : "Paket muncul setelah diimpor dari file HPP paket."}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <Th className="w-20">Kode</Th>
                <Th>Paket</Th>
                <Th className="hidden w-32 md:table-cell">Penyajian</Th>
                <Th className="w-32 text-right">Harga / porsi</Th>
                {lihatBiaya ? <Th className="hidden w-32 text-right sm:table-cell">HPP / porsi</Th> : null}
                {lihatBiaya ? <Th className="w-40">Untung</Th> : null}
              </tr>
            </thead>
            <tbody>
              {baris.map(({ p, hpp, untung, tanpaHpp }) => (
                <tr key={p.id.toString()} className="border-b last:border-0 hover:bg-muted/25">
                  <Td className="nomor-dokumen text-muted-foreground">{p.code}</Td>
                  <Td>
                    <Link href={`/paket/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {p.line} · {p.package_items.length} item
                    </span>
                    {p.notes ? <span className="block text-xs text-amber-700 dark:text-amber-400">{p.notes}</span> : null}
                  </Td>
                  <Td className="hidden text-muted-foreground md:table-cell">{p.service_forms?.name ?? "—"}</Td>
                  <Td className="angka text-right font-medium tabular-nums">{p.price ? rupiah(p.price) : "—"}</Td>
                  {lihatBiaya ? (
                    <Td className="angka hidden text-right text-muted-foreground tabular-nums sm:table-cell">{hpp ? rupiah(hpp) : "—"}</Td>
                  ) : null}
                  {lihatBiaya ? (
                    <Td>
                      {tanpaHpp ? (
                        <Pil nada="perhatian">HPP belum lengkap</Pil>
                      ) : untung ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="angka tabular-nums">{untung.pct.toFixed(1).replace(".", ",")}%</span>
                          <Pil nada={NADA_PITA[untung.pita]}>{LABEL_PITA[untung.pita]}</Pil>
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>
      {baris.length > 0 ? <RingkasanTabel>{baris.length} paket aktif</RingkasanTabel> : null}
    </Halaman>
  );
}
