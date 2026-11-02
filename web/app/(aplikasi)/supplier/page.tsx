import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Td, Th } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { saringMirip } from "@/lib/cari-mirip";
import { KATEGORI_VENDOR, type KategoriVendor } from "@/lib/hitung/rekanan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { opsiRekanan } from "@/lib/rekanan";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { TombolVendor } from "./form-supplier";

export const metadata: Metadata = { title: "Vendor & Supplier" };
export const dynamic = "force-dynamic";

/* Vendor & Supplier (D-083, D-133): bahan baku, roti, sewa mobil, sewa alat, venue… — dipilih saat membuat PO. */
export default async function HalamanSupplier({ searchParams }: PageProps<"/supplier">) {
  await wajibIzin("supplier");
  const { cari, k } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const aktifKat = typeof k === "string" && k in KATEGORI_VENDOR ? (k as KategoriVendor) : null;
  const [daftar, po, beli, hutang, rekanan] = await Promise.all([
    prisma.suppliers.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.purchase_orders.groupBy({ by: ["supplier_id"], where: { status: { not: "batal" } }, _count: true }),
    prisma.purchases.groupBy({ by: ["supplier_id"], where: { status: "posted", supplier_id: { not: null } }, _count: true }),
    prisma.supplier_payables.groupBy({ by: ["supplier_id"], where: { status: "belum" }, _sum: { amount: true } }),
    opsiRekanan(),
  ]);
  const nPo = new Map(po.map((x) => [x.supplier_id.toString(), x._count]));
  const nBeli = new Map(beli.map((x) => [x.supplier_id!.toString(), x._count]));
  const sisa = new Map(hutang.map((x) => [x.supplier_id.toString(), Number(x._sum.amount ?? 0)]));
  const per = new Map<string, number>();
  for (const s of daftar) per.set(s.category ?? "lainnya", (per.get(s.category ?? "lainnya") ?? 0) + 1);
  const sekat = aktifKat ? daftar.filter((s) => (s.category ?? "lainnya") === aktifKat) : daftar;
  const tampil = kunci ? saringMirip(kunci, sekat, (s) => [s.name, s.contact_name, s.notes, KATEGORI_VENDOR[(s.category ?? "lainnya") as KategoriVendor]], 300) : sekat;

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Store}
        judul="Vendor & Supplier"
        jumlah={daftar.length}
        keterangan="Supplier bahan dan vendor kebutuhan acara. Tempo bayar menentukan jatuh tempo hutang setiap barang PO diterima."
        aksi={<TombolVendor opsiRekanan={rekanan} />}
      />
      <div className="mb-3 sm:w-96">
        <Pencarian placeholder="Cari nama vendor, kontak, atau catatan" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[[null, `Semua (${daftar.length})`] as const, ...Object.entries(KATEGORI_VENDOR).filter(([kat]) => per.has(kat)).map(([kat, l]) => [kat, `${l} (${per.get(kat)})`] as const)].map(([kat, l]) => (
          <Link
            key={kat ?? "semua"}
            href={kat ? `/supplier?k=${kat}` : "/supplier"}
            className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", kat === aktifKat ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
          >
            {l}
          </Link>
        ))}
      </div>
      <BingkaiTabel>
        {tampil.length ? (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Vendor</Th>
                <Th className="hidden md:table-cell">Kontak</Th>
                <Th className="text-right">Tempo</Th>
                <Th className="hidden text-right sm:table-cell">PO · nota</Th>
                <Th className="text-right">Hutang belum dibayar</Th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((s) => (
                <tr key={s.id.toString()} className={cn("border-b border-border-row last:border-0 hover:bg-muted/40", !s.active && "opacity-60")}>
                  <Td>
                    <Link href={`/supplier/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {KATEGORI_VENDOR[(s.category ?? "lainnya") as KategoriVendor] ?? s.category}
                      {s.rating ? ` · ${"★".repeat(s.rating)}` : ""}
                      {!s.active ? " · nonaktif" : ""}
                    </span>
                  </Td>
                  <Td className="hidden text-sm text-muted-foreground md:table-cell">{[s.contact_name, s.phone].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td className="text-right font-mono text-sm tabular-nums">{s.payment_term_days ? `${s.payment_term_days} hari` : "tunai"}</Td>
                  <Td className="hidden text-right font-mono text-sm tabular-nums sm:table-cell">
                    {nPo.get(s.id.toString()) ?? 0} · {nBeli.get(s.id.toString()) ?? 0}
                  </Td>
                  <Td className={cn("text-right font-mono tabular-nums", sisa.get(s.id.toString()) && "font-semibold text-perhatian")}>{sisa.get(s.id.toString()) ? rupiah(sisa.get(s.id.toString())!) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Belum ada vendor"}
            keterangan={kunci ? `Tidak ditemukan vendor untuk "${kunci}".` : "Tambahkan supplier bahan, toko roti, sewa mobil, sewa alat makan, venue, dan vendor lain yang biasa dipakai."}
          />
        )}
      </BingkaiTabel>
    </Halaman>
  );
}
