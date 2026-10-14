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
import { hargaBahanTerkini } from "@/lib/harga-bahan";
import { hitungHpp } from "@/lib/hitung/hpp";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { alasanPerluDicek, LABEL_STATUS_RESEP } from "@/lib/resep";
import { angka, rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Resep" };
export const dynamic = "force-dynamic";

export default async function HalamanResep({ searchParams }: PageProps<"/resep">) {
  const sesi = await wajibIzin("resep");
  const { cari, status, akses } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saring = typeof status === "string" ? status : "";
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  const daftar = await prisma.recipes.findMany({
    where: kunci
      ? {
          OR: [
            { name: { contains: kunci, mode: "insensitive" } },
            { code: { contains: kunci, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      portions_per_batch: true,
      status: true,
      recipe_lines: {
        select: { qty_per_batch: true, ingredient_id: true, ingredients: { select: { is_placeholder: true } } },
      },
    },
  });

  // Harga hanya diambil untuk peran yang boleh melihat biaya: untuk dapur,
  // angka itu tidak pernah sampai ke server komponen, apalagi ke browser.
  const harga = lihatBiaya ? await hargaBahanTerkini(sesi) : null;
  const atur = lihatBiaya ? await bacaPengaturanBisnis() : null;

  const baris = daftar.map((r) => {
    const alasan = alasanPerluDicek({
      porsi: r.portions_per_batch,
      baris: r.recipe_lines.map((l) => ({ qty: l.qty_per_batch, bahanPengganti: l.ingredients.is_placeholder })),
    });
    const hpp =
      harga && atur
        ? hitungHpp({
            baris: r.recipe_lines.map((l) => ({
              qty: l.qty_per_batch,
              harga: harga.get(l.ingredient_id)?.perSatuan ?? null,
            })),
            porsi: r.portions_per_batch,
            overheadPct: atur.overhead_pct,
            targetFoodCostPct: atur.target_food_cost_pct,
          })
        : null;
    const perluDicek = alasan.length > 0 || (hpp?.hargaKosong ?? 0) > 0;
    return { r, alasan, hpp, perluDicek };
  });

  const tampil = baris.filter(({ r, perluDicek }) =>
    saring === "perlu_dicek" ? perluDicek : saring ? r.status === saring : true,
  );

  return (
    <Halaman>
      <KepalaHalaman
        judul="Resep"
        keterangan={
          lihatBiaya
            ? "Takaran bahan per resep dan HPP per porsi (overhead & target food cost dari pengaturan)."
            : "Takaran bahan per resep."
        }
      />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />

      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari nama atau kode resep…" />
        <SaringStatus
          pilihan={[
            { nilai: "", label: "Semua", jumlah: baris.length },
            { nilai: "perlu_dicek", label: "Perlu dicek", jumlah: baris.filter((b) => b.perluDicek).length },
            ...Object.entries(LABEL_STATUS_RESEP).map(([nilai, label]) => ({
              nilai,
              label,
              jumlah: baris.filter((b) => b.r.status === nilai).length,
            })),
          ]}
        />
      </div>

      <BingkaiTabel>
        {tampil.length === 0 ? (
          <KeadaanKosong
            judul="Tidak ada resep"
            keterangan={kunci ? `Tidak ditemukan resep untuk "${kunci}".` : "Tidak ada resep di penyaring ini."}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <Th className="w-24">Kode</Th>
                <Th>Nama</Th>
                <Th className="hidden w-24 text-right sm:table-cell">Porsi</Th>
                <Th className="hidden w-20 text-right md:table-cell">Bahan</Th>
                <Th className="w-28">Status</Th>
                {lihatBiaya ? <Th className="w-32 text-right">HPP / porsi</Th> : null}
                {lihatBiaya ? <Th className="hidden w-32 text-right lg:table-cell">Saran harga</Th> : null}
              </tr>
            </thead>
            <tbody>
              {tampil.map(({ r, alasan, hpp, perluDicek }) => (
                <tr key={r.id.toString()} className="border-b last:border-0 hover:bg-muted/25">
                  <Td className="nomor-dokumen text-muted-foreground">{r.code}</Td>
                  <Td>
                    <Link href={`/resep/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    {perluDicek ? (
                      <span className="block text-xs text-amber-700 dark:text-amber-400">
                        {[...alasan, ...(hpp?.hargaKosong ? [`${hpp.hargaKosong} bahan belum berharga`] : [])].join(" · ")}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="angka hidden text-right tabular-nums sm:table-cell">
                    {r.portions_per_batch ? angka(r.portions_per_batch) : "—"}
                  </Td>
                  <Td className="angka hidden text-right text-muted-foreground tabular-nums md:table-cell">
                    {r.recipe_lines.length}
                  </Td>
                  <Td>
                    <Pil nada={r.status === "standar" ? "baik" : r.status === "belum_ada" ? "perhatian" : "netral"}>
                      {LABEL_STATUS_RESEP[r.status] ?? r.status}
                    </Pil>
                  </Td>
                  {lihatBiaya ? (
                    <Td className="angka text-right font-medium tabular-nums">
                      {hpp?.hppPerPorsi ? rupiah(hpp.hppPerPorsi) : "—"}
                    </Td>
                  ) : null}
                  {lihatBiaya ? (
                    <Td className="angka hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                      {hpp?.saranHarga ? rupiah(hpp.saranHarga) : "—"}
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
          {tampil.length} resep{kunci || saring ? " cocok" : ""} · {baris.filter((b) => b.perluDicek).length} perlu
          dicek
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
