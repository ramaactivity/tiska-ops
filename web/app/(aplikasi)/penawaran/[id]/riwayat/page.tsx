import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { bandingkanVersi, type SalinanPenawaran } from "@/lib/revisi";
import { salinanPenawaran } from "@/lib/revisi-penawaran";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Riwayat revisi" };

const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export const dynamic = "force-dynamic";

/* Riwayat revisi quotation (D-042): tiap versi lama + apa yang berubah ke
   versi sesudahnya. Salinan tanpa HPP, jadi sales boleh melihatnya. */
export default async function HalamanRiwayatPenawaran({ params }: PageProps<"/penawaran/[id]/riwayat">) {
  const sesi = await wajibIzin("penawaran");
  const { id } = await params;

  const p = await prisma.quotations.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    select: {
      id: true,
      quotation_number: true,
      revision: true,
      updated_at: true,
      quotation_versions: {
        orderBy: { revision: "asc" },
        select: { id: true, revision: true, quotation_number: true, snapshot: true, created_at: true, users: { select: { name: true } } },
      },
    },
  });
  if (!p) notFound();

  const sekarang = await salinanPenawaran(prisma, p.id);
  const versi = [
    ...p.quotation_versions.map((v) => ({
      kunci: v.id.toString(),
      nomor: v.quotation_number,
      salinan: v.snapshot as unknown as SalinanPenawaran,
      // Versi ini digantikan pada saat salinannya dibuat.
      diganti: v.created_at,
      oleh: v.users?.name ?? null,
    })),
    { kunci: "sekarang", nomor: p.quotation_number, salinan: sekarang, diganti: null, oleh: null },
  ];

  return (
    <Halaman>
      <div className="pb-5">
        <Link
          href={`/penawaran/${p.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Kembali ke {p.quotation_number}
        </Link>
      </div>
      <KepalaHalaman
        judul="Riwayat revisi"
        keterangan={p.revision > 0 ? `${p.revision} kali direvisi setelah dikirim ke customer.` : "Belum pernah direvisi."}
      />

      <ol className="flex flex-col gap-4">
        {versi.map((v, i) => {
          const sesudah = versi[i + 1];
          const banding = sesudah ? bandingkanVersi(v.salinan, sesudah.salinan) : null;
          return (
            <li key={v.kunci} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="nomor-dokumen text-sm font-semibold">{v.nomor}</span>
                  {sesudah ? null : <Pil nada="baik">Versi sekarang</Pil>}
                </div>
                <span className="text-sm font-medium tabular-nums">{rupiah(v.salinan.total)}</span>
              </div>
              {v.diganti ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Diganti {waktu.format(v.diganti)}
                  {v.oleh ? ` oleh ${v.oleh}` : ""} → {sesudah?.nomor}
                </p>
              ) : null}
              {banding ? (
                banding.angka.length + banding.baris.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Tidak ada perubahan isi atau angka.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    {banding.baris.map((b, j) => (
                      <div key={j}>
                        <span className={b.jenis === "hapus" ? "text-destructive" : b.jenis === "tambah" ? "text-emerald-700 dark:text-emerald-300" : ""}>
                          {b.jenis === "tambah" ? "+ " : b.jenis === "hapus" ? "− " : "• "}
                          {b.nama}
                        </span>
                        {b.jenis === "ubah" ? (
                          <span className="text-muted-foreground"> — {b.rincian.join("; ")}</span>
                        ) : b.jenis === "tambah" ? (
                          <span className="text-muted-foreground"> — baris baru</span>
                        ) : (
                          <span className="text-muted-foreground"> — dihapus</span>
                        )}
                      </div>
                    ))}
                    {banding.angka.length ? (
                      <dl className="mt-1 grid gap-1 sm:grid-cols-[10rem_1fr]">
                        {banding.angka.map((a) => (
                          <div key={a.label} className="contents">
                            <dt className="text-muted-foreground">{a.label}</dt>
                            <dd className="tabular-nums">
                              {a.lama} → <b>{a.baru}</b>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                )
              ) : null}
            </li>
          );
        })}
      </ol>
    </Halaman>
  );
}
