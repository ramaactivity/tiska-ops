import { ChevronLeft, PackageOpen, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { biayaPaket } from "@/lib/biaya-paket";
import { fotoDokumen } from "@/lib/foto-menu";
import { hitungHppPaket, LABEL_PITA, nilaiUntung } from "@/lib/hitung/paket";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehLihatBiaya, bolehUbahPaket } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

import { StripFoto } from "../../foto-menu/strip-foto";
import { pilihanFormPaket } from "../pilihan-form";
import { EditorKategori } from "./editor-kategori";
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
      unit: true,
      package_slots: {
        orderBy: { sort: "asc" },
        select: { id: true, label: true, pick: true, extra: true, note: true, package_slot_options: { orderBy: { sort: "asc" }, select: { id: true, name: true, menu_id: true, extra_price: true } } },
      },
    },
  });
  if (!p) notFound();

  // Paket pilihan per kategori (D-082): isinya dipilih klien, jadi HPP baru ada di quotation.
  const pilihan = p.package_slots.length > 0 && p.package_items.length === 0;
  const biaya = lihatBiaya && p.package_items.length ? (await biayaPaket(sesi, [p.id])).get(p.id) : undefined;
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
  // Foto untuk klien (D-125): foto paket + foto menu isinya (atau pilihan per kategori).
  const foto = bolehBuka(sesi.peran, "foto-menu", izin)
    ? await fotoDokumen({
        paket: [p.id],
        menu: [...p.package_items.map((i) => i.menu_id), ...p.package_slots.flatMap((sl) => sl.package_slot_options.flatMap((o) => (o.menu_id ? [o.menu_id] : [])))],
      })
    : [];
  const [pilihanMenu, bentuk, lini] = bolehUbah ? await pilihanFormPaket() : [[], [], []];

  return (
    <Halaman>
      <Link href="/paket" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Paket
      </Link>
      <KepalaHalaman ikon={PackageOpen}
        judul={`[${p.code}] ${p.name}`}
        keterangan={`${p.line ?? ""} · ${p.service_forms?.name ?? "bentuk penyajian belum diisi"}`}
        aksi={<span className="angka text-lg font-semibold tabular-nums">{p.price ? `${rupiah(p.price)} / ${p.unit ?? "porsi"}` : "—"}</span>}
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
          <div className="kartu px-4 py-3">
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

      {pilihan ? (
        <section className="flex flex-col gap-4 kartu p-5">
          <p className="text-sm text-muted-foreground">
            Paket pilihan: klien memilih menu dari tiap kategori saat quotation dibuat. HPP & untung dinilai di quotation sesuai menu yang dipilih.
          </p>
          {p.package_slots.map((sl) => (
            <div key={sl.id.toString()} className="flex flex-col gap-1.5 border-b border-border-row pb-4 last:border-0 last:pb-0">
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{sl.label}</span>
                <span className="text-xs text-muted-foreground">
                  {sl.extra ? "menu tambahan · biaya tambahan" : sl.pick === 0 ? "termasuk" : `pilih ${sl.pick}`}
                  {sl.note && !sl.extra && !/pilih|termasuk/i.test(sl.note) ? ` · ${sl.note}` : ""}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sl.package_slot_options.map((o) => (
                  <span key={o.id.toString()} className={`rounded-full border px-3 py-1 text-[0.8125rem] ${o.menu_id ? "bg-card" : "border-dashed bg-muted/40"}`}>
                    {o.menu_id && bukaMenu ? (
                      <Link href={`/menu/${o.menu_id}`} className="hover:underline">
                        {o.name}
                      </Link>
                    ) : (
                      o.name
                    )}
                    {o.extra_price ? <span className="ml-1 font-mono text-muted-foreground">+{Number(o.extra_price).toLocaleString("id-ID")}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Garis putus-putus = belum tersambung ke master Menu (HPP-nya belum bisa dihitung otomatis).</p>
        </section>
      ) : (
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
            {!p.package_items.length ? (
              <tr>
                <Td className="text-muted-foreground" colSpan={3}>
                  Paket satu menu (stall / per pcs) — nama paket adalah menunya. Hubungkan ke menu & resep lewat &quot;Ubah data paket&quot; agar HPP-nya terhitung.
                </Td>
              </tr>
            ) : null}
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
      )}
      {lihatBiaya && biaya ? (
        <p className="pt-3 text-xs text-muted-foreground">
          {dariResep} dari {p.package_items.length} item dihitung dari resep (ikut harga bahan terbaru); sisanya dari file HPP paket.
          {hppFile && hpp && !hppFile.eq(hpp) ? ` Menurut file HPP paket: ${rupiah(hppFile)}.` : ""}
        </p>
      ) : null}

      {foto.length ? (
        <div className="mt-6">
          <StripFoto kelompok={foto} judul={`${p.code} ${p.name}`} />
        </div>
      ) : null}

      {bolehUbah && !p.package_items.length ? (
        <details className="mt-6 kartu p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            <PencilLine className="mx-1.5 inline size-4 align-[-3px]" />
            {p.package_slots.length ? "Ubah kategori & pilihan menu" : "Jadikan paket pilihan (tambah kategori menu)"}
          </summary>
          <div className="pt-4">
            <EditorKategori
              id={id}
              saranMenu={pilihanMenu.map((m) => m.label)}
              awal={p.package_slots.map((sl) => ({
                label: sl.label,
                pilih: sl.pick,
                tambahan: sl.extra,
                opsi: sl.package_slot_options.map((o) => ({ nama: o.name, hargaTambahan: o.extra_price === null ? null : Number(o.extra_price) })),
              }))}
            />
          </div>
        </details>
      ) : null}

      {bolehUbah ? (
        <details className="mt-6 kartu p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            <PencilLine className="mx-1.5 inline size-4 align-[-3px]" />
            {pilihan ? "Ubah data paket (nama, harga, status)" : "Ubah data paket (nama, harga, isi menu)"}
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
    <div className="kartu px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="angka mt-1 text-lg font-semibold tabular-nums">{nilai}</p>
    </div>
  );
}
