import { ChevronLeft, PackageOpen, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { biayaPaket } from "@/lib/biaya-paket";
import { hitungHppPaket, LABEL_PITA, nilaiUntung } from "@/lib/hitung/paket";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya, bolehUbahPaket } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { pilihanFormPaket } from "../pilihan-form";
import { FormPaket } from "./form-paket";

export const metadata: Metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function HalamanDetailPaket({ params }: PageProps<"/paket/[id]">) {
  const sesi = await wajibIzin("paket");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const lihatBiaya = bolehLihatBiaya(sesi.peran);

  const p = await prisma.packages.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      code: true,
      name: true,
      line: true,
      price: true,
      notes: true,
      status: true,
      service_form_id: true,
      service_forms: { select: { name: true } },
      package_items: {
        orderBy: { sort: "asc" },
        select: { id: true, qty: true, note: true, menu_id: true, menus: { select: { name: true, recipe_id: true } } },
      },
    },
  });
  if (!p) notFound();

  const biaya = lihatBiaya ? (await biayaPaket(sesi, [p.id])).get(p.id) : undefined;
  const atur = lihatBiaya ? await bacaPengaturanBisnis() : null;
  const hpp = biaya ? hitungHppPaket([...biaya.item.values()].map((x) => x.hpp), biaya.kemasan) : null;
  const hppFile = biaya ? hitungHppPaket([...biaya.item.values()].map((x) => x.hppFile), biaya.kemasan) : null;
  const dariResep = biaya ? [...biaya.item.values()].filter((x) => x.sumber === "resep").length : 0;
  // Item tanpa HPP membuat HPP paket terlalu rendah dan untung tampak "aman" palsu.
  const tanpaHpp = biaya ? [...biaya.item.values()].filter((x) => !x.hpp).length : 0;
  const untung =
    hpp && atur && tanpaHpp === 0
      ? nilaiUntung({ harga: p.price, hpp, untungAmanPct: atur.untung_aman_pct, untungMinPct: atur.untung_min_pct })
      : null;
  const izin = await bacaIzin();
  const bukaResep = bolehBuka(sesi.peran, "resep", izin);
  const bukaMenu = bolehBuka(sesi.peran, "menu", izin);
  const bolehUbah = bolehUbahPaket(sesi.peran);
  const [pilihanMenu, bentuk, lini] = bolehUbah ? await pilihanFormPaket() : [[], [], []];

  return (
    <Halaman>
      <Link href="/paket" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Paket
      </Link>
      <KepalaHalaman ikon={PackageOpen}
        judul={`[${p.code}] ${p.name}`}
        keterangan={`${p.line ?? ""} · ${p.service_forms?.name ?? "bentuk penyajian belum diisi"}`}
        aksi={<span className="angka text-lg font-semibold tabular-nums">{p.price ? `${rupiah(p.price)} / porsi` : "—"}</span>}
      />
      {p.notes ? (
        <p className="mb-5 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          {p.notes}
        </p>
      ) : null}

      {hpp ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kotak label={tanpaHpp ? `HPP / porsi (${tanpaHpp} item tanpa HPP)` : "HPP / porsi"} nilai={rupiah(hpp)} />
          <Kotak label="Termasuk kemasan" nilai={biaya?.kemasan ? rupiah(biaya.kemasan) : "—"} />
          <Kotak label="Untung / porsi" nilai={untung ? rupiah(untung.untung) : "—"} />
          <div className="rounded-[14px] border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Untung</p>
            {tanpaHpp ? (
              <p className="mt-1">
                <Pil nada="perhatian">HPP belum lengkap</Pil>
              </p>
            ) : untung ? (
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="angka text-lg font-semibold tabular-nums">{untung.pct.toFixed(1).replace(".", ",")}%</span>
                <Pil nada={untung.pita === "aman" ? "baik" : "perhatian"}>{LABEL_PITA[untung.pita]}</Pil>
              </p>
            ) : (
              <p className="mt-1">—</p>
            )}
          </div>
        </div>
      ) : null}

      <BingkaiTabel>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <Th className="hidden w-10 sm:table-cell">No</Th>
              <Th>Isi paket</Th>
              {lihatBiaya ? <Th className="w-32 text-right">HPP / porsi</Th> : null}
            </tr>
          </thead>
          <tbody>
            {p.package_items.map((i, n) => (
              <tr key={i.id.toString()} className="border-b last:border-0">
                <Td className="hidden text-muted-foreground tabular-nums sm:table-cell">{n + 1}</Td>
                <Td>
                  {bukaMenu ? (
                    <Link href={`/menu/${i.menu_id}`} className="font-medium hover:underline">
                      {i.menus.name}
                    </Link>
                  ) : i.menus.recipe_id && bukaResep ? (
                    <Link href={`/resep/${i.menus.recipe_id}`} className="font-medium hover:underline">
                      {i.menus.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{i.menus.name}</span>
                  )}
                  {i.note ? <span className="block text-xs text-muted-foreground">{i.note}</span> : null}
                </Td>
                {lihatBiaya ? (
                  <Td className="angka text-right tabular-nums">
                    {biaya?.item.get(i.id)?.hpp ? rupiah(biaya.item.get(i.id)!.hpp!) : "—"}
                    <span className="block text-[0.6875rem] text-muted-foreground">
                      {biaya?.item.get(i.id)?.sumber === "resep" ? "dari resep" : "dari file"}
                    </span>
                  </Td>
                ) : null}
              </tr>
            ))}
            {lihatBiaya && biaya?.kemasan ? (
              <tr className="border-t bg-muted/20">
                <Td className="hidden sm:table-cell" />
                <Td className="text-muted-foreground">Kemasan ({p.service_forms?.name}: box, alat makan & mika)</Td>
                <Td className="angka text-right tabular-nums">{rupiah(biaya.kemasan)}</Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </BingkaiTabel>
      {lihatBiaya && biaya ? (
        <p className="pt-3 text-xs text-muted-foreground">
          {dariResep} dari {p.package_items.length} item dihitung dari resep (ikut harga bahan terbaru); sisanya dari file HPP paket.
          {hppFile && hpp && !hppFile.eq(hpp) ? ` Menurut file HPP paket: ${rupiah(hppFile)}.` : ""}
        </p>
      ) : null}

      {bolehUbah ? (
        <details className="mt-6 rounded-[14px] border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            <PencilLine className="mx-1.5 inline size-4 align-[-3px]" />
            Ubah data paket (nama, harga, isi menu)
          </summary>
          <div className="pt-4">
            <FormPaket
              paket={{
                id,
                name: p.name,
                line: p.line,
                price: p.price?.toString() ?? null,
                serviceFormId: p.service_form_id?.toString() ?? null,
                status: p.status,
                notes: p.notes,
              }}
              isi={p.package_items.map((i) => ({ menuId: i.menu_id.toString(), note: i.note ?? "" }))}
              menu={pilihanMenu}
              bentuk={bentuk}
              lini={lini}
            />
          </div>
        </details>
      ) : null}
    </Halaman>
  );
}

function Kotak({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-[14px] border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="angka mt-1 text-lg font-semibold tabular-nums">{nilai}</p>
    </div>
  );
}
