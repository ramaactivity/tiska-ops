import { Carrot, PencilLine, Plus } from "lucide-react";
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
import { LABEL_STATUS_BAHAN as LABEL_STATUS } from "@/lib/bahan";
import { hargaBahanTerkini } from "@/lib/harga-bahan";
import { bolehLihatBiaya } from "@/lib/peran";
import { calonMirip, saringMirip } from "@/lib/cari-mirip";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { HargaDariNota } from "./harga-dari-nota";

export const metadata: Metadata = { title: "Bahan" };
export const dynamic = "force-dynamic";

const angkaKemasan = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const hargaSatuan = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export default async function HalamanBahan({ searchParams }: PageProps<"/bahan">) {
  const sesi = await wajibIzin("bahan");
  const { cari, status, kategori, akses } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const saringStatus = typeof status === "string" ? status : "";
  const saringKategori = typeof kategori === "string" ? kategori : "";
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  // Pencarian toleran salah ketik & urutan kata (D-122).
  const seluruh = await prisma.ingredients.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      category: true,
      name: true,
      brand: true,
      variant: true,
      purchase_qty: true,
      purchase_unit: true,
      usage_unit: true,
      usage_qty_per_pack: true,
      status: true,
      is_placeholder: true,
      _count: { select: { recipe_lines: true } },
    },
  });
  const semua = saringMirip(kunci, seluruh, (b) => [b.name, b.code, b.brand]);
  const saran = kunci && !semua.length ? calonMirip(kunci, seluruh, (b) => b.name, 0.34, 3).map((c) => c.x.name) : [];
  const harga = lihatBiaya ? await hargaBahanTerkini(sesi) : null;

  const perluDilengkapi = (b: (typeof semua)[number]) => b.status !== "ok" || b.is_placeholder;
  const sesuaiKategori = semua.filter((b) => !saringKategori || b.category === saringKategori);
  const tampil = sesuaiKategori
    .filter((b) => (saringStatus === "lengkapi" ? perluDilengkapi(b) : saringStatus === "ok" ? !perluDilengkapi(b) : true))
    // Antrian dikerjakan dari bahan yang paling banyak dipakai resep.
    .sort((a, b) => (saringStatus === "lengkapi" ? b._count.recipe_lines - a._count.recipe_lines : 0));
  const daftarKategori = [...new Set(semua.map((b) => b.category))].sort();

  return (
    <Halaman>
      <KepalaHalaman ikon={Carrot}
        judul="Bahan"
        keterangan={
          lihatBiaya
            ? "Daftar bahan, kemasan beli, konversi ke satuan resep, dan harga terkini."
            : "Daftar bahan, kemasan beli, dan konversi ke satuan resep."
        }
        // Semua yang boleh membuka halaman bahan boleh mengubah datanya
        // (simpanBahan hanya memeriksa izin "bahan"); harga tetap khusus biaya.
        aksi={
          <div className="flex flex-wrap gap-2">
            <TombolImpor jenis="bahan" />
            <Button render={<Link href="/bahan/baru" />} className="rounded-full">
              <Plus className="size-4" />
              Tambah bahan
            </Button>
          </div>
        }
      />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />
      {lihatBiaya ? <HargaDariNota /> : null}

      <div className="flex flex-col gap-3 pb-4">
        <Pencarian placeholder="Cari nama, kode, atau merk…" />
        <SaringStatus
          pilihan={[
            { nilai: "", label: "Semua", jumlah: sesuaiKategori.length },
            { nilai: "lengkapi", label: "Perlu dilengkapi", jumlah: sesuaiKategori.filter(perluDilengkapi).length },
            { nilai: "ok", label: "Lengkap", jumlah: sesuaiKategori.filter((b) => !perluDilengkapi(b)).length },
          ]}
        />
        <SaringStatus
          parameter="kategori"
          pilihan={[
            { nilai: "", label: "Semua kategori" },
            ...daftarKategori.map((k) => ({ nilai: k, label: k, jumlah: semua.filter((b) => b.category === k).length })),
          ]}
        />
      </div>

      <BingkaiTabel>
        {tampil.length === 0 ? (
          <KeadaanKosong
            judul="Tidak ada bahan"
            keterangan={kunci ? `Tidak ditemukan bahan untuk "${kunci}".${saran.length ? ` Mungkin maksudnya: ${saran.join(", ")}.` : ""}` : "Tidak ada bahan di penyaring ini."}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th className="w-24">Kode</Th>
                <Th>Nama</Th>
                <Th className="hidden lg:table-cell">Kemasan beli</Th>
                <Th className="hidden w-24 text-right md:table-cell">Dipakai</Th>
                <Th className="w-40">Status</Th>
                {lihatBiaya ? <Th className="w-36 text-right">Harga</Th> : null}
                <Th className="w-px"><span className="sr-only">Aksi</span></Th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((b) => {
                const h = harga?.get(b.id);
                return (
                  <tr key={b.id.toString()} className="relative cursor-pointer border-b border-border-row last:border-0 hover:bg-muted/40">
                    <Td className="nomor-dokumen whitespace-nowrap text-muted-foreground">{b.code}</Td>
                    <Td>
                      <Link href={`/bahan/${b.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {b.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {[b.category, b.brand, b.variant].filter(Boolean).join(" · ")}
                      </span>
                    </Td>
                    <Td className="hidden text-muted-foreground lg:table-cell">
                      {b.purchase_qty && b.purchase_unit ? (
                        <>
                          {angkaKemasan.format(b.purchase_qty.toNumber())} {b.purchase_unit}
                          {b.usage_qty_per_pack && b.usage_unit ? (
                            <span className="block text-xs">
                              = {angkaKemasan.format(b.usage_qty_per_pack.toNumber())} {b.usage_unit}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="angka hidden text-right text-muted-foreground tabular-nums md:table-cell">
                      {b._count.recipe_lines ? `${b._count.recipe_lines} resep` : "—"}
                    </Td>
                    <Td>
                      {b.is_placeholder ? (
                        <Pil nada="perhatian">Tidak ada di daftar</Pil>
                      ) : (
                        <Pil nada={b.status === "ok" ? "netral" : "perhatian"}>{LABEL_STATUS[b.status] ?? b.status}</Pil>
                      )}
                    </Td>
                    {lihatBiaya ? (
                      <Td className="angka text-right tabular-nums">
                        {h ? (
                          <>
                            Rp {hargaSatuan.format(h.perSatuan.toNumber())}
                            <span className="text-muted-foreground"> /{b.usage_unit ?? "satuan"}</span>
                            {h.perKemasan ? (
                              <span className="block text-xs text-muted-foreground">
                                {rupiah(h.perKemasan)} /{b.purchase_unit ? "kemasan" : "beli"}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">belum ada</span>
                        )}
                      </Td>
                    ) : null}
                    <Td className="w-px text-right">
                      <Button render={<Link href={`/bahan/${b.id}`} />} variant="outline" size="sm" className="relative z-10 rounded-full" aria-label={`Ubah ${b.name}`}>
                        <PencilLine className="size-4" />
                        <span className="hidden sm:inline">Ubah</span>
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </BingkaiTabel>

      {tampil.length > 0 ? (
        <RingkasanTabel>
          {tampil.length} bahan{kunci || saringStatus || saringKategori ? " cocok" : ""} ·{" "}
          {semua.filter(perluDilengkapi).length} perlu dilengkapi
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}
