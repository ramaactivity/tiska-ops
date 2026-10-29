import { FileBox } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { barangPrSudahDitangani } from "@/lib/pembelian";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormPo } from "./form-po";

export const metadata: Metadata = { title: "PO baru" };
export const dynamic = "force-dynamic";

/* PO baru (D-083): dari PR disetujui (barang yang belum dibeli/dipesan terisi) atau kosong. */
export default async function HalamanPoBaru({ searchParams }: PageProps<"/po/baru">) {
  await wajibIzin("po");
  const { pr: prAwal } = await searchParams;
  const [supplier, pr, ditangani, bahan] = await Promise.all([
    prisma.suppliers.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, category: true, payment_term_days: true } }),
    prisma.purchase_requests.findMany({
      where: { status: "disetujui" },
      orderBy: { need_date: "asc" },
      select: {
        id: true,
        pr_number: true,
        need_date: true,
        purchase_request_items: { orderBy: { sort: "asc" }, select: { id: true, ingredient_id: true, item_name: true, qty_to_buy: true, buy_unit: true } },
      },
    }),
    barangPrSudahDitangani(),
    prisma.ingredients.findMany({ where: { merged_into: null }, select: { id: true, code: true, name: true, purchase_unit: true, usage_unit: true }, orderBy: { name: "asc" } }),
  ]);
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <Halaman>
      <KepalaHalaman ikon={FileBox} judul="PO baru" keterangan="Nomor PO dibuat otomatis setelah disimpan. Harga boleh dikoreksi lagi saat barang diterima sesuai nota supplier." />
      <FormPo
        hariIni={hariIni}
        prAwal={typeof prAwal === "string" ? prAwal : ""}
        supplier={supplier.map((s) => ({ id: s.id.toString(), label: s.name, sub: [s.category, s.payment_term_days ? `tempo ${s.payment_term_days} hari` : "bayar langsung"].filter(Boolean).join(" · ") }))}
        pr={pr.map((p) => ({
          id: p.id.toString(),
          label: `${p.pr_number} · ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(p.need_date)}`,
          tanggal: p.need_date.toISOString().slice(0, 10),
          barang: p.purchase_request_items
            .filter((b) => !ditangani.has(b.id.toString()))
            .map((b) => ({ prItemId: b.id.toString(), idBahan: b.ingredient_id?.toString() ?? null, nama: b.item_name, qty: Number(b.qty_to_buy), satuan: b.buy_unit ?? "" })),
        }))}
        bahan={bahan.map((b) => ({ id: b.id.toString(), label: b.name, sub: [b.code, b.purchase_unit ?? b.usage_unit].filter(Boolean).join(" · ") }))}
      />
    </Halaman>
  );
}
