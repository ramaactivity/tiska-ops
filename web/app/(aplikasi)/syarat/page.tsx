import type { Metadata } from "next";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormBagian } from "./form-bagian";

export const metadata: Metadata = { title: "Syarat & Ketentuan" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const LABEL_BERLAKU: Record<string, string> = {
  buffet_stall: "Pesanan buffet & stall",
  set_menu: "Pesanan set menu",
  box: "Pesanan nasi / snack box",
  bukan_box: "Semua pesanan, kecuali box saja",
  hanya_box: "Hanya pesanan box saja",
  semua: "Semua pesanan",
};

/* Naskah S&K per bagian (D-043). Owner/admin saja (hanyaAdmin di navigasi). */
export default async function HalamanSyarat() {
  await wajibIzin("syarat");
  const bagian = await prisma.terms_sections.findMany({
    orderBy: { sort: "asc" },
    include: { users: { select: { name: true } } },
  });

  return (
    <Halaman>
      <KepalaHalaman
        judul="Syarat & Ketentuan"
        keterangan="Bagian-bagian ini dirakit tombol “Isi S&K standar” di form quotation, sesuai jenis pesanan. Penomoran I, II, … dihitung otomatis. Quotation yang sudah dibuat tidak ikut berubah."
      />
      <div className="flex flex-col gap-4">
        {bagian.map((b) => (
          <section key={b.id.toString()} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <Pil>{LABEL_BERLAKU[b.applies_to] ?? b.applies_to}</Pil>
              {!b.active ? <Pil nada="perhatian">Tidak dipakai</Pil> : null}
              {b.users ? (
                <span className="text-xs text-muted-foreground">
                  Diubah {waktu.format(b.updated_at)} oleh {b.users.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Naskah awal dari quotation yang beredar</span>
              )}
            </div>
            <FormBagian id={b.id.toString()} judul={b.title} isi={b.body} aktif={b.active} />
          </section>
        ))}
      </div>
    </Halaman>
  );
}
