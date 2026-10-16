import { ArrowLeft, ChevronRight, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { uraiPoin } from "@/lib/poin-syarat";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { EditorSyarat } from "./editor-syarat";

export const metadata: Metadata = { title: "Syarat & Ketentuan" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const LABEL_BERLAKU: Record<string, string> = {
  buffet_stall: "Pesanan buffet & stall",
  set_menu: "Pesanan set menu",
  box: "Pesanan nasi / snack box",
  bukan_box: "Semua pesanan, kecuali box saja",
  hanya_box: "Pesanan box saja",
  semua: "Semua pesanan",
};

/* Naskah S&K per bagian (D-043, D-064). Owner/admin saja (hanyaAdmin di navigasi).
   Kiri: daftar bagian seperti daftar isi; kanan: penyunting poin bagian terpilih. */
export default async function HalamanSyarat({ searchParams }: PageProps<"/syarat">) {
  await wajibIzin("syarat");
  const { bagian: kode } = await searchParams;
  const daftar = await prisma.terms_sections.findMany({
    orderBy: { sort: "asc" },
    include: { users: { select: { name: true } } },
  });
  const dipilih = daftar.find((b) => b.code === kode) ?? daftar[0];
  const adaPilihan = typeof kode === "string" && dipilih?.code === kode;

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ScrollText}
        judul="Syarat & Ketentuan"
        jumlah={daftar.length}
        keterangan="Pilih bagian di kiri, lalu ubah poin-poinnya di kanan. Nomor diatur otomatis dan perubahan tersimpan sendiri."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <nav aria-label="Bagian S&K" className={cn("overflow-hidden rounded-[14px] border bg-card lg:sticky lg:top-4", adaPilihan && "hidden lg:block")}>
          <ul>
            {daftar.map((b) => {
              const jumlah = uraiPoin(b.body).filter((p) => p.jenis !== "catatan").length;
              const aktif = b.id === dipilih?.id;
              return (
                <li key={b.id.toString()} className="border-b border-border-row last:border-0">
                  <Link
                    href={`/syarat?bagian=${b.code}`}
                    scroll={false}
                    aria-current={aktif ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                      aktif && "lg:bg-accent/60 lg:shadow-[inset_3px_0_0_var(--primary)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("line-clamp-2 text-[0.9375rem] leading-snug font-medium", !b.active && "text-muted-foreground")}>{b.title}</span>
                      <span className="mt-1 block text-[0.8125rem] text-muted-foreground">
                        {LABEL_BERLAKU[b.applies_to] ?? b.applies_to} · {jumlah} poin
                        {!b.active ? <span className="font-medium text-perhatian"> · tidak dipakai</span> : null}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {dipilih ? (
          <section className={cn("rounded-[14px] border bg-card p-3.5 sm:p-6", !adaPilihan && "hidden lg:block")}>
            {adaPilihan ? (
              <Link href="/syarat" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary lg:hidden">
                <ArrowLeft className="size-4" />
                Semua bagian
              </Link>
            ) : null}
            <EditorSyarat
              key={dipilih.id.toString()}
              id={dipilih.id.toString()}
              judulAwal={dipilih.title}
              poinAwal={uraiPoin(dipilih.body)}
              aktifAwal={dipilih.active}
              untuk={LABEL_BERLAKU[dipilih.applies_to] ?? dipilih.applies_to}
            />
            <p className="mt-5 border-t border-border-row pt-3 text-xs text-subtle-foreground">
              {dipilih.users ? `Terakhir diubah ${waktu.format(dipilih.updated_at)} oleh ${dipilih.users.name}` : "Naskah awal dari quotation yang beredar"}
            </p>
          </section>
        ) : null}
      </div>
    </Halaman>
  );
}
