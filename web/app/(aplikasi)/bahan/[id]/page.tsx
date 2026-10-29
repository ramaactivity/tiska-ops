import { Carrot, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { LABEL_STATUS_BAHAN } from "@/lib/bahan";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { FormBahan, FormHarga } from "./form-bahan";

export const metadata: Metadata = { title: "Bahan" };
export const dynamic = "force-dynamic";

const takaran = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const hargaSatuan = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function HalamanDetailBahan({ params }: PageProps<"/bahan/[id]">) {
  const sesi = await wajibIzin("bahan");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  const b = await prisma.ingredients.findUnique({
    where: { id: BigInt(id) },
    select: {
      ingredients: { select: { id: true, code: true, name: true } },
      code: true,
      name: true,
      category: true,
      brand: true,
      variant: true,
      purchase_qty: true,
      purchase_unit: true,
      usage_qty_per_pack: true,
      usage_unit: true,
      status: true,
      is_placeholder: true,
      notes: true,
      recipe_lines: {
        orderBy: { recipes: { code: "asc" } },
        select: { id: true, qty_per_batch: true, usage_unit: true, recipes: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!b) notFound();

  // Riwayat harga hanya dibaca untuk owner/finance; untuk peran lain kuerinya
  // tidak pernah dijalankan.
  const riwayat = lihatBiaya
    ? await prisma.ingredient_prices.findMany({
        where: { ingredient_id: BigInt(id) },
        orderBy: [{ effective_at: "desc" }, { id: "desc" }],
        select: {
          id: true,
          price_per_pack: true,
          price_per_usage_unit: true,
          source: true,
          source_note: true,
          effective_at: true,
          users: { select: { name: true } },
        },
      })
    : [];
  const bukaResep = bolehBuka(sesi.peran, "resep", await bacaIzin());

  return (
    <Halaman>
      <Link href="/bahan" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Bahan
      </Link>
      {b.ingredients ? (
        <p className="mb-5 rounded-2xl border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          Bahan ini sudah digabung ke{" "}
          <Link href={`/bahan/${b.ingredients.id}`} className="font-medium underline underline-offset-4">
            {b.ingredients.code} {b.ingredients.name}
          </Link>{" "}
          — resep, nota, stok, dan harganya ada di sana. Tidak dihapus supaya riwayat tetap terbaca.
        </p>
      ) : null}
      <KepalaHalaman ikon={Carrot}
        judul={b.name}
        keterangan={`${b.code} · dipakai di ${b.recipe_lines.length} baris resep`}
        aksi={
          b.is_placeholder ? (
            <Pil nada="perhatian">Tidak ada di daftar</Pil>
          ) : (
            <Pil nada={b.status === "ok" ? "netral" : "perhatian"}>{LABEL_STATUS_BAHAN[b.status] ?? b.status}</Pil>
          )
        }
      />

      {b.notes ? (
        <p className="mb-5 rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{b.notes}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Bahan yang sudah digabung (D-123) tidak bisa diubah — server juga menolak. */}
        {b.ingredients ? null : (
        <section className="rounded-[14px] border bg-card p-5">
          <h2 className="pb-4 text-sm font-semibold">Ubah data bahan</h2>
          <FormBahan
            bahan={{
              id,
              name: b.name,
              category: b.category,
              brand: b.brand,
              variant: b.variant,
              purchase_qty: b.purchase_qty?.toString() ?? null,
              purchase_unit: b.purchase_unit,
              usage_qty_per_pack: b.usage_qty_per_pack?.toString() ?? null,
              usage_unit: b.usage_unit,
              status: b.status,
            }}
          />
        </section>
        )}

        <div className="flex flex-col gap-6">
          {lihatBiaya ? (
            <section className="rounded-[14px] border bg-card p-5">
              <h2 className="pb-1 text-sm font-semibold">Harga</h2>
              <p className="pb-4 text-xs text-muted-foreground">
                Harga baru tidak menimpa yang lama — riwayatnya tersimpan di bawah.
              </p>
              {b.ingredients ? null : <FormHarga id={id} isiPerKemasan={b.usage_qty_per_pack?.toString() ?? null} satuan={b.usage_unit} />}
              {riwayat.length ? (
                <ul className="mt-5 flex flex-col divide-y border-t text-sm">
                  {riwayat.map((h, i) => (
                    <li key={h.id.toString()} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                          {h.price_per_pack ? `${rupiah(h.price_per_pack)} / kemasan · ` : ""}Rp{" "}
                          {hargaSatuan.format(h.price_per_usage_unit.toNumber())} / {b.usage_unit ?? "satuan"}
                          {i === 0 ? <span className="ml-1.5 text-xs text-lunas">berlaku</span> : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tanggal.format(h.effective_at)} · {h.source}
                          {h.users?.name ? ` · ${h.users.name}` : ""}
                          {h.source_note ? ` · ${h.source_note}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada harga.</p>
              )}
            </section>
          ) : null}

          <section>
            <h2 className="pb-2.5 text-sm font-semibold">Dipakai di resep</h2>
            <BingkaiTabel>
              {b.recipe_lines.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum dipakai resep mana pun.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <Th className="w-24">Kode</Th>
                      <Th>Resep</Th>
                      <Th className="w-32 text-right">Per resep</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.recipe_lines.map((l) => (
                      <tr key={l.id.toString()} className="border-b last:border-0">
                        <Td className="nomor-dokumen text-muted-foreground">{l.recipes.code}</Td>
                        <Td>
                          {bukaResep ? (
                            <Link href={`/resep/${l.recipes.id}`} className="hover:underline">
                              {l.recipes.name}
                            </Link>
                          ) : (
                            l.recipes.name
                          )}
                        </Td>
                        <Td className="angka text-right tabular-nums">
                          {takaran.format(l.qty_per_batch.toNumber())}{" "}
                          <span className="text-muted-foreground">{l.usage_unit ?? b.usage_unit ?? ""}</span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </BingkaiTabel>
          </section>
        </div>
      </div>
    </Halaman>
  );
}
