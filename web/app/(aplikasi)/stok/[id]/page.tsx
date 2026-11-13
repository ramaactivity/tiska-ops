import { Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { JENIS_MUTASI, keadaanStok, LABEL_KEADAAN, satuanStok } from "@/lib/hitung/stok";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { saldoStok } from "@/lib/stok";

import { FormMinimum, FormMutasi, TombolHapusKeluar } from "../form-stok";

export const metadata: Metadata = { title: "Stok bahan" };
export const dynamic = "force-dynamic";

const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Kartu stok satu bahan (D-087): saldo, minimum, riwayat mutasi. Tanpa harga. */
export default async function HalamanKartuStok({ params }: PageProps<"/stok/[id]">) {
  await wajibIzin("stok");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await prisma.ingredients.findUnique({
    where: { id: BigInt(id) },
    select: { id: true, code: true, name: true, category: true, usage_unit: true, purchase_unit: true, usage_qty_per_pack: true, min_stock: true },
  });
  if (!b) notFound();
  const [saldo, mutasi] = await Promise.all([
    saldoStok([b.id]),
    prisma.stock_movements.findMany({
      where: { ingredient_id: b.id },
      orderBy: [{ moved_at: "desc" }, { id: "desc" }],
      take: 100,
      include: {
        users: { select: { name: true } },
        events: { select: { id: true, name: true } },
        purchase_items: { select: { purchases: { select: { id: true, purchase_number: true } } } },
      },
    }),
  ]);
  const s = saldo.get(id) ?? 0;
  const satuan = satuanStok(b);
  const keadaan = keadaanStok(s, b.min_stock);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Warehouse}
        judul={b.name}
        keterangan={`${b.code} · ${b.category} · satuan stok ${satuan ?? "belum diatur"}${b.purchase_unit && b.usage_qty_per_pack && b.usage_unit ? ` (1 ${b.purchase_unit} = ${angka(b.usage_qty_per_pack)} ${b.usage_unit})` : ""}`}
        aksi={<Pil nada={keadaan === "aman" ? "baik" : "perhatian"}>{LABEL_KEADAAN[keadaan]}</Pil>}
      />
      <div className="flex flex-col gap-4">
        <section className="grid gap-4 kartu p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Stok sekarang</p>
            <p className={`font-mono text-2xl font-bold tabular-nums ${keadaan === "minus" ? "text-tempo" : ""}`}>
              {angka(s)} {satuan ?? ""}
            </p>
            {keadaan === "minus" ? <p className="text-xs text-tempo">Catatan lebih kecil dari nol — hitung fisik (opname) lalu koreksi.</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-muted-foreground">Stok minimum (PR mengisi ulang sampai angka ini)</p>
            <FormMinimum id={id} minimum={b.min_stock?.toString() ?? ""} satuan={satuan} />
          </div>
        </section>

        <FormMutasi bahanAwal={{ id, label: b.name, satuan }} />

        <section className="kartu">
          <h2 className="eyebrow border-b p-4">Riwayat · 100 terakhir</h2>
          {!mutasi.length ? (
            <p className="p-4 text-sm text-muted-foreground">Belum ada mutasi.</p>
          ) : (
            <ul className="divide-y">
              {mutasi.map((m) => (
                <li key={m.id.toString()} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {JENIS_MUTASI[m.kind] ?? m.kind}
                      {m.events ? (
                        <Link href={`/event/${m.events.id}`} className="ml-2 text-sm font-normal underline-offset-4 hover:underline">
                          {m.events.name}
                        </Link>
                      ) : null}
                      {m.purchase_items ? (
                        <Link href={`/uang-muka/belanja/${m.purchase_items.purchases.id}`} className="ml-2 font-mono text-sm underline-offset-4 hover:underline">
                          {m.purchase_items.purchases.purchase_number}
                        </Link>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{[hari.format(m.moved_at), m.note, m.users?.name].filter(Boolean).join(" · ")}</p>
                  </div>
                  {m.kind === "keluar" ? <TombolHapusKeluar id={m.id.toString()} /> : null}
                  <span className={`font-mono tabular-nums ${Number(m.qty) > 0 ? "text-lunas" : ""}`}>
                    {Number(m.qty) > 0 ? "+" : "−"}
                    {angka(Math.abs(Number(m.qty)))} {satuan ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Halaman>
  );
}
