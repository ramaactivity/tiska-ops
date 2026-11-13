import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { labelPeriode } from "@/lib/hitung/opname";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { BannerOpname } from "../banner-opname";
import { TombolMulaiOpname } from "./tombol-mulai";

export const metadata: Metadata = { title: "Stock opname" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { berjalan: "Sedang dihitung", diajukan: "Menunggu Finance", final: "Final" };
const iso = (t: Date) => t.toISOString().slice(0, 10);

/* Stock opname bulanan (D-088). */
export default async function HalamanOpname() {
  await wajibIzin("stok");
  const daftar = await prisma.stock_counts.findMany({
    orderBy: { period: "desc" },
    take: 24,
    include: { _count: { select: { stock_count_lines: true } }, users_stock_counts_started_byTousers: { select: { name: true } } },
  });
  const terhitung = new Map(
    (await prisma.stock_count_lines.groupBy({ by: ["count_id"], where: { counted_qty: { not: null } }, _count: true })).map((g) => [g.count_id.toString(), g._count]),
  );
  return (
    <Halaman>
      <KepalaHalaman ikon={ClipboardCheck} judul="Stock opname" keterangan="Hitung fisik bahan & packaging sebulan sekali. Selisih > 5% wajib alasan; Finance memfinalkan, stok lalu disesuaikan." aksi={<TombolMulaiOpname />} />
      <BannerOpname />
      {!daftar.length ? (
        <div className="kartu">
          <KeadaanKosong judul="Belum pernah opname." keterangan="Tekan “Mulai opname bulan ini” — daftar bahan yang punya stok terisi otomatis." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {daftar.map((o) => (
            <li key={o.id.toString()}>
              <Link href={`/stok/opname/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 kartu p-4 hover:bg-accent/40">
                <span>
                  <span className="font-medium">{labelPeriode(iso(o.period))}</span>
                  <span className="block text-sm text-muted-foreground">
                    {terhitung.get(o.id.toString()) ?? 0} dari {o._count.stock_count_lines} bahan dihitung · dimulai {o.users_stock_counts_started_byTousers?.name ?? ""}
                  </span>
                </span>
                <Pil nada={o.status === "final" ? "baik" : "perhatian"}>{LABEL[o.status] ?? o.status}</Pil>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}
