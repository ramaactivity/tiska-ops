import { ChefHat, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { hargaBahanTerkini } from "@/lib/harga-bahan";
import { hitungHpp } from "@/lib/hitung/hpp";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya, bolehUbahResep } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { alasanPerluDicek, LABEL_STATUS_RESEP } from "@/lib/resep";
import { angka, d, rupiah } from "@/lib/uang";

import { EditorBahan } from "./editor-bahan";
import { FormResep } from "./form-resep";

export const metadata: Metadata = { title: "Resep" };
export const dynamic = "force-dynamic";

/** Takaran ditulis apa adanya (2,1 · 0,35), bukan dibulatkan ke rupiah. */
const takaran = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
/** Harga per gram/ml sering di bawah Rp100 dan berkoma — dibulatkan ke rupiah akan menyesatkan. */
const hargaSatuan = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export default async function HalamanDetailResep({ params }: PageProps<"/resep/[id]">) {
  const sesi = await wajibIzin("resep");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  const r = await prisma.recipes.findUnique({
    where: { id: BigInt(id) },
    select: {
      code: true,
      name: true,
      sheet: true,
      portions_per_batch: true,
      status: true,
      notes: true,
      recipe_lines: {
        orderBy: { sort: "asc" },
        select: {
          id: true,
          qty_per_batch: true,
          usage_unit: true,
          note: true,
          ingredient_id: true,
          ingredients: { select: { code: true, name: true, brand: true, usage_unit: true, is_placeholder: true } },
        },
      },
    },
  });
  if (!r) notFound();
  const bolehUbah = bolehUbahResep(sesi.peran);
  // Daftar bahan untuk editor hanya dimuat bagi yang boleh mengubah, dan
  // tanpa kolom harga apa pun.
  const pilihan = bolehUbah
    ? await prisma.ingredients.findMany({
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, usage_unit: true, is_placeholder: true },
      })
    : [];

  const harga = lihatBiaya ? await hargaBahanTerkini(sesi, r.recipe_lines.map((l) => l.ingredient_id)) : null;
  const atur = lihatBiaya ? await bacaPengaturanBisnis() : null;
  const hpp =
    harga && atur
      ? hitungHpp({
          baris: r.recipe_lines.map((l) => ({ qty: l.qty_per_batch, harga: harga.get(l.ingredient_id)?.perSatuan ?? null })),
          porsi: r.portions_per_batch,
          overheadPct: atur.overhead_pct,
          targetFoodCostPct: atur.target_food_cost_pct,
        })
      : null;
  const alasan = alasanPerluDicek({
    porsi: r.portions_per_batch,
    baris: r.recipe_lines.map((l) => ({ qty: l.qty_per_batch, bahanPengganti: l.ingredients.is_placeholder })),
  });
  const porsi = r.portions_per_batch && r.portions_per_batch.gt(0) ? r.portions_per_batch : null;

  return (
    <Halaman>
      <Link
        href="/resep"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Resep
      </Link>
      <KepalaHalaman ikon={ChefHat}
        judul={r.name}
        keterangan={`${r.code} · ${porsi ? `${angka(porsi)} porsi per resep` : "porsi belum diisi"}`}
        aksi={
          <Pil nada={r.status === "standar" ? "baik" : r.status === "belum_ada" ? "perhatian" : "netral"}>
            {LABEL_STATUS_RESEP[r.status] ?? r.status}
          </Pil>
        }
      />

      {alasan.length || hpp?.hargaKosong ? (
        <div className="mb-5 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          Perlu dicek:{" "}
          {[...alasan, ...(hpp?.hargaKosong ? [`${hpp.hargaKosong} bahan belum berharga (HPP terlalu rendah)`] : [])].join(" · ")}
        </div>
      ) : null}

      {hpp ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Angka label="Biaya bahan / resep" nilai={rupiah(hpp.totalBahan)} />
          <Angka label="Biaya bahan / porsi" nilai={hpp.bahanPerPorsi ? rupiah(hpp.bahanPerPorsi) : "—"} />
          <Angka
            label={`HPP / porsi (+${atur?.overhead_pct}% overhead)`}
            nilai={hpp.hppPerPorsi ? rupiah(hpp.hppPerPorsi) : "—"}
            menonjol
          />
          <Angka
            label={`Saran harga (food cost ${atur?.target_food_cost_pct}%)`}
            nilai={hpp.saranHarga ? rupiah(hpp.saranHarga) : "—"}
          />
        </div>
      ) : null}

      {bolehUbah ? (
        <details className="mb-6 rounded-[14px] border bg-card p-5" open={r.status !== "standar"}>
          <summary className="cursor-pointer text-sm font-semibold">Status, porsi & catatan</summary>
          <div className="pt-4">
            <FormResep id={id} status={r.status} porsi={r.portions_per_batch?.toString() ?? null} catatan={r.notes} />
          </div>
        </details>
      ) : r.notes ? (
        <p className="mb-5 rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{r.notes}</p>
      ) : null}

      <BingkaiTabel>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <Th className="hidden w-10 sm:table-cell">No</Th>
              <Th>Bahan</Th>
              <Th className="w-36 text-right">Per resep</Th>
              <Th className="hidden w-32 text-right sm:table-cell">Per porsi</Th>
              {lihatBiaya ? <Th className="hidden w-32 text-right md:table-cell">Harga / satuan</Th> : null}
              {lihatBiaya ? <Th className="w-32 text-right">Biaya</Th> : null}
            </tr>
          </thead>
          <tbody>
            {r.recipe_lines.map((l, i) => {
              const satuan = l.usage_unit ?? l.ingredients.usage_unit ?? "";
              const h = harga?.get(l.ingredient_id)?.perSatuan;
              return (
                <tr key={l.id.toString()} className="border-b last:border-0">
                  <Td className="hidden text-muted-foreground tabular-nums sm:table-cell">{i + 1}</Td>
                  <Td>
                    <span className="font-medium">{l.ingredients.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.ingredients.code}
                      {l.ingredients.brand ? ` · ${l.ingredients.brand}` : ""}
                    </span>
                    {l.ingredients.is_placeholder ? (
                      <span className="block text-xs text-perhatian">
                        Tidak ada di daftar bahan — perlu dilengkapi
                      </span>
                    ) : null}
                    {l.note ? <span className="block text-xs text-perhatian">{l.note}</span> : null}
                  </Td>
                  <Td className="angka text-right tabular-nums">
                    {takaran.format(l.qty_per_batch.toNumber())} <span className="text-muted-foreground">{satuan}</span>
                  </Td>
                  <Td className="angka hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                    {porsi ? `${takaran.format(l.qty_per_batch.div(porsi).toNumber())} ${satuan}` : "—"}
                  </Td>
                  {lihatBiaya ? (
                    <Td className="angka hidden text-right text-muted-foreground tabular-nums md:table-cell">
                      {h ? `Rp ${hargaSatuan.format(h.toNumber())}` : "belum ada"}
                    </Td>
                  ) : null}
                  {lihatBiaya ? (
                    <Td className="angka text-right tabular-nums">{h ? rupiah(d(h).times(l.qty_per_batch)) : "—"}</Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </BingkaiTabel>

      {bolehUbah ? (
        <details className="mt-6 rounded-[14px] border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">Ubah isi resep</summary>
          <p className="pt-2 text-xs text-muted-foreground">
            Takaran per resep ({porsi ? `${angka(porsi)} porsi` : "porsi belum diisi"}). Ganti bahan pengganti dengan bahan dari daftar.
          </p>
          <div className="pt-4">
            <EditorBahan
              resepId={id}
              baris={r.recipe_lines.map((l) => ({ bahanId: l.ingredient_id.toString(), qty: l.qty_per_batch.toNumber().toLocaleString("id-ID", { maximumFractionDigits: 6 }) }))}
              pilihan={pilihan.map((p) => ({ id: p.id.toString(), code: p.code, name: p.name, unit: p.usage_unit, pengganti: p.is_placeholder }))}
            />
          </div>
        </details>
      ) : null}
    </Halaman>
  );
}

function Angka({ label, nilai, menonjol }: { label: string; nilai: string; menonjol?: boolean }) {
  return (
    <div className="rounded-[14px] border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`angka mt-1 tabular-nums ${menonjol ? "text-lg font-semibold" : "font-medium"}`}>{nilai}</p>
    </div>
  );
}
