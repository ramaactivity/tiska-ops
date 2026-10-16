import { BookOpen, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { asalSitus } from "@/lib/asal-situs";
import { bolehKelolaPricelist } from "@/lib/peran";
import { LABEL_BASIS, LABEL_WILAYAH, ukuranBerkas } from "@/lib/pricelist";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { TombolBagikan } from "../tombol-bagikan";
import { FormPricelist } from "./form-pricelist";
import { UnggahVersi } from "./unggah-versi";

export const metadata: Metadata = { title: "Pricelist" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const LABEL_KIRIM: Record<string, string> = { wa: "kirim WA", salin: "salin link", buka: "buka" };

export default async function HalamanDetailPricelist({ params }: PageProps<"/pricelist/[id]">) {
  const sesi = await wajibIzin("pricelist");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const p = await prisma.pricelists.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      segment: true,
      region: true,
      venue: true,
      price_basis: true,
      seasonal: true,
      status: true,
      notes: true,
      pricelist_files: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          file_size: true,
          light_size: true,
          pages: true,
          change_note: true,
          is_active: true,
          created_at: true,
          users: { select: { name: true } },
        },
      },
      pricelist_sends: {
        orderBy: { created_at: "desc" },
        take: 15,
        select: { id: true, kind: true, created_at: true, users: { select: { name: true } } },
      },
    },
  });
  if (!p) notFound();
  const kelola = bolehKelolaPricelist(sesi.peran);
  const tautan = `${await asalSitus()}/pl/${p.slug}`;

  return (
    <Halaman>
      <Link href="/pricelist" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Pricelist
      </Link>
      <KepalaHalaman ikon={BookOpen}
        judul={p.name}
        keterangan={[
          p.code,
          p.segment,
          p.region ? LABEL_WILAYAH[p.region] : null,
          p.venue,
          p.price_basis ? LABEL_BASIS[p.price_basis] : null,
          p.seasonal ? "musiman" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        aksi={p.status === "aktif" ? <Pil nada="baik">Aktif</Pil> : <Pil nada="perhatian">Arsip</Pil>}
      />
      {p.notes ? <p className="mb-4 text-sm text-perhatian">{p.notes}</p> : null}

      {p.status === "aktif" ? (
        <section className="mb-6 flex flex-col gap-2 rounded-[14px] border bg-card p-4">
          <p className="text-xs text-muted-foreground">Link untuk klien (selalu versi terbaru)</p>
          <p className="break-all text-sm font-medium">{tautan}</p>
          <TombolBagikan id={p.id.toString()} nama={p.name} tautan={tautan} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="pb-2.5 text-sm font-semibold">Riwayat versi</h2>
          <ul className="flex flex-col divide-y rounded-[14px] border bg-card text-sm">
            {p.pricelist_files.map((f) => (
              <li key={f.id.toString()} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    Versi {f.version} {f.is_active ? <Pil nada="baik">dipakai</Pil> : null}
                  </span>
                  <span className="flex gap-3 text-xs">
                    <a href={`/pricelist/berkas/${f.id}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                      Buka asli
                    </a>
                    {f.light_size ? (
                      <a href={`/pricelist/berkas/${f.id}?jenis=ringan`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                        Buka ringan
                      </a>
                    ) : null}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ukuranBerkas(f.file_size)}
                  {f.light_size ? ` · ringan ${ukuranBerkas(f.light_size)}` : ""}
                  {f.pages ? ` · ${f.pages} hlm` : ""} · {f.created_at ? waktu.format(f.created_at) : ""}
                  {f.users?.name ? ` · ${f.users.name}` : ""}
                </p>
                {f.change_note ? <p className="text-xs">{f.change_note}</p> : null}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          {kelola ? (
            <section id="unggah" className="scroll-mt-24 rounded-[14px] border bg-card p-5">
              <h2 className="pb-1 text-base font-semibold">Ganti dengan PDF terbaru</h2>
              <p className="pb-3 text-sm text-muted-foreground">Versi lama tetap tersimpan di riwayat. Link /pl ke klien tidak berubah.</p>
              <UnggahVersi id={p.id.toString()} />
            </section>
          ) : null}
          {kelola ? (
            <section className="rounded-[14px] border bg-card p-5">
              <h2 className="eyebrow pb-3">Ubah</h2>
              <FormPricelist p={{ id: p.id.toString(), name: p.name, status: p.status, notes: p.notes }} />
            </section>
          ) : null}
          <section>
            <h2 className="pb-2.5 text-sm font-semibold">Riwayat kirim</h2>
            {p.pricelist_sends.length ? (
              <ul className="flex flex-col divide-y rounded-[14px] border bg-card text-sm">
                {p.pricelist_sends.map((s) => (
                  <li key={s.id.toString()} className="flex justify-between gap-3 px-4 py-2.5">
                    <span>
                      {s.users?.name ?? "—"} · {LABEL_KIRIM[s.kind] ?? s.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.created_at ? waktu.format(s.created_at) : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum pernah dikirim lewat aplikasi.</p>
            )}
          </section>
        </div>
      </div>
    </Halaman>
  );
}
