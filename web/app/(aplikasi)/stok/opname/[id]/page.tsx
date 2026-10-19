import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { labelPeriode } from "@/lib/hitung/opname";
import { satuanStok } from "@/lib/hitung/stok";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { saldoStok } from "@/lib/stok";

import { HitungOpname, PanelFinanceOpname } from "./hitung-opname";

export const metadata: Metadata = { title: "Hitung opname" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { berjalan: "Sedang dihitung", diajukan: "Menunggu Finance", final: "Final" };
const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/* Satu sesi opname (D-088): hitung per kategori dari HP, tersimpan per baris. */
export default async function HalamanHitungOpname({ params }: PageProps<"/stok/opname/[id]">) {
  const sesi = await wajibIzin("stok");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const o = await prisma.stock_counts.findUnique({
    where: { id: BigInt(id) },
    include: {
      stock_count_lines: {
        include: { ingredients: { select: { name: true, code: true, category: true, usage_unit: true, purchase_unit: true } }, users: { select: { name: true } } },
      },
      users_stock_counts_started_byTousers: { select: { name: true } },
      users_stock_counts_submitted_byTousers: { select: { name: true } },
      users_stock_counts_finalized_byTousers: { select: { name: true } },
    },
  });
  if (!o) notFound();
  const saldo = await saldoStok(o.stock_count_lines.map((b) => b.ingredient_id));
  const baris = o.stock_count_lines
    .map((b) => ({
      id: b.id.toString(),
      nama: b.ingredients.name,
      kode: b.ingredients.code,
      kategori: b.ingredients.category,
      satuan: satuanStok(b.ingredients),
      sistemSekarang: saldo.get(b.ingredient_id.toString())?.toString() ?? "0",
      sistem: b.system_qty?.toString() ?? null,
      hitung: b.counted_qty?.toString() ?? null,
      alasan: b.reason ?? "",
      oleh: b.users?.name ?? null,
    }))
    .sort((a, b) => a.kategori.localeCompare(b.kategori, "id") || a.nama.localeCompare(b.nama, "id"));
  const jejak = [
    o.users_stock_counts_started_byTousers ? `Dimulai ${o.users_stock_counts_started_byTousers.name} · ${waktu.format(o.created_at)}` : null,
    o.submitted_at ? `Diajukan ${o.users_stock_counts_submitted_byTousers?.name ?? ""} · ${waktu.format(o.submitted_at)}` : null,
    o.finalized_at ? `Final ${o.users_stock_counts_finalized_byTousers?.name ?? ""} · ${waktu.format(o.finalized_at)}` : null,
  ].filter(Boolean);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ClipboardCheck}
        judul={`Opname ${labelPeriode(o.period.toISOString().slice(0, 10))}`}
        keterangan={jejak.join(" · ")}
        aksi={<Pil nada={o.status === "final" ? "baik" : "perhatian"}>{LABEL[o.status] ?? o.status}</Pil>}
      />
      <div className="flex flex-col gap-4">
        {o.status === "berjalan" && o.finance_note ? (
          <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
            <b>Dikembalikan Finance:</b> {o.finance_note}
          </section>
        ) : null}
        {o.status === "diajukan" && bolehKelolaUang(sesi.peran) ? <PanelFinanceOpname id={id} /> : null}
        <HitungOpname id={id} status={o.status} baris={baris} />
      </div>
    </Halaman>
  );
}
