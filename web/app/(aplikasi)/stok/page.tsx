import { Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { keadaanStok, LABEL_KEADAAN, satuanStok } from "@/lib/hitung/stok";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { saldoStok } from "@/lib/stok";

import { FormMutasi, MasukkanBaris } from "./form-stok";

export const metadata: Metadata = { title: "Stok Bahan" };
export const dynamic = "force-dynamic";

const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const hari = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

/* Stok bahan & packaging (D-087). Tanpa harga. Masuk otomatis dari nota & penerimaan PO, keluar dari pemakaian event. */
export default async function HalamanStok({ searchParams }: PageProps<"/stok">) {
  await wajibIzin("stok");
  const { cari, lihat } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const perhatian = lihat === "perhatian";

  const [saldo, bahan, belumMasuk] = await Promise.all([
    saldoStok(),
    prisma.ingredients.findMany({
      where: {
        // Bawaan: bahan yang pernah bermutasi atau punya minimum; pencarian membuka semua bahan.
        ...(kunci ? { OR: [{ name: { contains: kunci, mode: "insensitive" } }, { code: { contains: kunci, mode: "insensitive" } }] } : { OR: [{ stock_movements: { some: {} } }, { min_stock: { not: null } }] }),
      },
      orderBy: { name: "asc" },
      take: 400,
      select: { id: true, code: true, name: true, category: true, usage_unit: true, purchase_unit: true, min_stock: true },
    }),
    prisma.purchase_items.findMany({
      where: { ingredient_id: { not: null }, stock_movements: null, purchases: { status: "posted" } },
      orderBy: { id: "desc" },
      take: 50,
      select: {
        id: true,
        item_name: true,
        qty: true,
        unit: true,
        ingredients: { select: { usage_unit: true, purchase_unit: true } },
        purchases: { select: { id: true, purchase_number: true, purchased_at: true } },
      },
    }),
  ]);
  const baris = bahan
    .map((b) => {
      const s = saldo.get(b.id.toString());
      return { ...b, saldo: s ?? null, keadaan: keadaanStok(s ?? 0, b.min_stock) };
    })
    .filter((b) => !perhatian || b.keadaan !== "aman");
  const jumlahPerhatian = bahan.filter((b) => keadaanStok(saldo.get(b.id.toString()) ?? 0, b.min_stock) !== "aman").length;

  return (
    <Halaman>
      <KepalaHalaman ikon={Warehouse} judul="Stok Bahan" keterangan="Masuk otomatis dari nota belanja & penerimaan PO, keluar dari pemakaian event (Kebutuhan Bahan). Tanpa harga." />
      <div className="flex flex-col gap-4">
        {belumMasuk.length ? (
          <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4">
            <p className="text-sm font-medium text-perhatian">Belum masuk stok — satuan nota tidak bisa dikonversi otomatis. Isi jumlahnya dalam satuan stok:</p>
            <ul className="mt-2 flex flex-col gap-2">
              {belumMasuk.map((b) => (
                <li key={b.id.toString()} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <b>{b.item_name}</b> {angka(b.qty)} {b.unit ?? ""} ·{" "}
                    <Link href={`/uang-muka/belanja/${b.purchases.id}`} className="font-mono underline-offset-4 hover:underline">
                      {b.purchases.purchase_number}
                    </Link>{" "}
                    · {hari.format(b.purchases.purchased_at)}
                  </span>
                  <MasukkanBaris id={b.id.toString()} satuan={b.ingredients ? satuanStok(b.ingredients) : null} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <FormMutasi />

        <div className="flex flex-col gap-3">
          <Pencarian placeholder="Cari bahan untuk melihat / mengatur stoknya…" />
          <SaringStatus
            parameter="lihat"
            pilihan={[
              { nilai: "", label: "Semua", jumlah: bahan.length },
              { nilai: "perhatian", label: "Perlu perhatian", jumlah: jumlahPerhatian },
            ]}
          />
        </div>

        {!baris.length ? (
          <div className="rounded-[14px] border bg-card">
            <KeadaanKosong
              judul={kunci ? "Tidak ada bahan yang cocok." : perhatian ? "Tidak ada stok yang perlu perhatian." : "Belum ada stok tercatat."}
              keterangan="Stok terisi otomatis saat nota belanja / penerimaan PO dicatat. Cari bahan untuk mengatur stok minimumnya."
            />
          </div>
        ) : (
          <BingkaiTabel>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <Th>Bahan</Th>
                  <Th className="text-right">Stok</Th>
                  <Th className="text-right">Minimum</Th>
                  <Th>Keadaan</Th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => {
                  const satuan = satuanStok(b) ?? "";
                  return (
                    <tr key={b.id.toString()} className="border-b last:border-b-0">
                      <Td>
                        <Link href={`/stok/${b.id}`} className="font-medium underline-offset-4 hover:underline">
                          {b.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {b.code} · {b.category}
                        </span>
                      </Td>
                      <Td className={`text-right font-mono whitespace-nowrap tabular-nums ${b.keadaan === "minus" ? "text-tempo" : ""}`}>
                        {b.saldo ? `${angka(b.saldo)} ${satuan}` : "—"}
                      </Td>
                      <Td className="text-right font-mono whitespace-nowrap tabular-nums text-muted-foreground">{b.min_stock ? `${angka(b.min_stock)} ${satuan}` : "—"}</Td>
                      <Td>
                        <Pil nada={b.keadaan === "aman" ? "baik" : "perhatian"}>{LABEL_KEADAAN[b.keadaan]}</Pil>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </BingkaiTabel>
        )}
      </div>
    </Halaman>
  );
}
