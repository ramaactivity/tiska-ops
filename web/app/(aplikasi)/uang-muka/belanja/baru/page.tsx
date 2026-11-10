import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { saldoUangMuka } from "@/lib/hitung/uang-muka";
import { barangPrSudahDitangani } from "@/lib/pembelian";
import { bolehCatatBelanjaOrangLain } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormBelanja } from "./form-belanja";

export const metadata: Metadata = { title: "Catat belanja" };
export const dynamic = "force-dynamic";

/* Nota belanja (D-081). Barang PR yang belum dibelanjakan terisi otomatis — tinggal isi harga. */
export default async function HalamanBelanjaBaru({ searchParams }: PageProps<"/uang-muka/belanja/baru">) {
  const sesi = await wajibIzin("uang-muka");
  const kelola = bolehCatatBelanjaOrangLain(sesi.peran);
  const { pr: prAwal } = await searchParams;

  const [mutasi, pr, terbeli, bahan, orang] = await Promise.all([
    prisma.cash_advances.findMany({
      where: kelola ? {} : { holder_user_id: BigInt(sesi.id) },
      select: { holder_user_id: true, kind: true, amount: true, status: true },
    }),
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
    // Barang PR yang sudah dibeli / sudah dipesan lewat PO (belanja bisa beberapa kali jalan).
    barangPrSudahDitangani(),
    prisma.ingredients.findMany({ where: { merged_into: null }, select: { id: true, code: true, name: true, purchase_unit: true, usage_unit: true }, orderBy: { name: "asc" } }),
    kelola ? prisma.users.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
  ]);
  const saldo: Record<string, number> = {};
  for (const id of new Set(mutasi.map((m) => m.holder_user_id.toString()))) {
    saldo[id] = saldoUangMuka(mutasi.filter((m) => m.holder_user_id.toString() === id)).toNumber();
  }
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <Halaman>
      <KepalaHalaman ikon={ShoppingCart} judul="Catat belanja" keterangan="Satu nota = satu catatan. Foto notanya; pedagang tanpa nota → tulis alasannya." />
      <FormBelanja
        saya={sesi.id}
        saldo={saldo}
        hariIni={hariIni}
        prAwal={typeof prAwal === "string" ? prAwal : ""}
        pemegang={orang.map((u) => ({ id: u.id.toString(), label: u.name }))}
        pr={pr.map((p) => ({
          id: p.id.toString(),
          label: `${p.pr_number} · ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(p.need_date)}`,
          barang: p.purchase_request_items
            .filter((b) => !terbeli.has(b.id.toString()))
            .map((b) => ({ prItemId: b.id.toString(), idBahan: b.ingredient_id?.toString() ?? null, nama: b.item_name, qty: Number(b.qty_to_buy), satuan: b.buy_unit ?? "" })),
        }))}
        bahan={bahan.map((b) => ({ id: b.id.toString(), label: b.name, sub: [b.code, b.purchase_unit ?? b.usage_unit].filter(Boolean).join(" · ") }))}
      />
    </Halaman>
  );
}
