import { CalendarDays, Clock, MessageCircle, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoTiska } from "@/components/logo-tiska";
import { tanggalFlyer, tautanWa } from "@/lib/hitung/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { alamatPublik } from "@/lib/r2";
import { rupiah } from "@/lib/uang";

import { FormOnline } from "./form-online";

export const metadata: Metadata = { title: { absolute: "Pesan Ikut Menu Pesta · Tiska Catering" } };
export const dynamic = "force-dynamic";

const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
const tglWib = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

/* Form pesan online per program (Tahap E, D-119): link di flyer/bio IG, tanpa login. Tidak ada angka HPP di sini. */
export default async function HalamanPesanOnline({ params }: PageProps<"/pesan/[slug]">) {
  const { slug } = await params;
  const p = await prisma.retail_programs.findUnique({
    where: { slug },
    select: {
      name: true,
      status: true,
      delivery_date: true,
      order_deadline: true,
      price_per_pax: true,
      min_pax: true,
      area: true,
      contact: true,
      retail_program_sets: { orderBy: { sort: "asc" }, select: { id: true, title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true, menu_id: true } } } },
    },
  });
  // Program dibatalkan tetap menampilkan halaman (flyer sudah tersebar) — form ditutup.
  if (!p || (p.status !== "disetujui" && p.status !== "dibatalkan")) notFound();
  const angka = await bacaPengaturanBisnis();
  const tanggal = p.delivery_date.toISOString().slice(0, 10);
  const batas = `${tanggalFlyer(tglWib.format(p.order_deadline))} jam ${jamWib.format(p.order_deadline).replace(":", ".")} WIB`;
  const batal = p.status === "dibatalkan";
  const ditutup = batal || p.order_deadline < new Date();
  const harga = Number(p.price_per_pax);
  const wa = tautanWa(p.contact, `Halo admin Tiska, saya mau pesan ${p.name}.`);
  // Foto utama tiap menu di paket (D-126) — dari galeri Foto Menu, tanpa yang disembunyikan.
  const idMenu = p.retail_program_sets.flatMap((s) => s.retail_program_set_items.flatMap((i) => (i.menu_id ? [i.menu_id] : [])));
  const sampul = new Map<string, { thumb: string; utama: string }>();
  for (const f of await prisma.menu_photos.findMany({ where: { menu_id: { in: idMenu }, hidden: false }, orderBy: [{ is_cover: "desc" }, { id: "asc" }], select: { menu_id: true, thumb_key: true, file_key: true } }))
    if (!sampul.has(f.menu_id!.toString())) sampul.set(f.menu_id!.toString(), { thumb: alamatPublik(f.thumb_key), utama: alamatPublik(f.file_key) });

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <LogoTiska tinggi={56} />
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">Open Pre-Order</p>
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-[-0.02em] text-balance">{p.name}</h1>
          <ul className="flex flex-col gap-1.5 text-[0.9375rem] text-muted-foreground">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" />
              Dikirim {tanggalFlyer(tanggal)}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" />
              Batas order {batas}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 shrink-0" />
              Gratis kirim area {p.area} · minimal {p.min_pax} pax
            </li>
          </ul>
          <p className="text-[0.9375rem]">
            <span className="font-mono text-lg font-semibold tabular-nums">{rupiah(harga)}</span>
            <span className="text-muted-foreground"> / pax, belum termasuk PBJT {angka.pbjt_pct}%</span>
          </p>
        </header>

        {ditutup ? (
          <section className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">{batal ? "Program ini dibatalkan" : "Pre-order sudah ditutup"}</h2>
            <p className="text-[0.9375rem] text-muted-foreground">
              {batal ? "Mohon maaf, program ini tidak jadi dibuka. Silakan chat admin untuk program berikutnya." : "Batas order program ini sudah lewat. Silakan chat admin, kami cek apakah masih bisa dibantu."}
            </p>
            <a href={wa} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground">
              <MessageCircle className="size-4" />
              Chat admin di WhatsApp
            </a>
          </section>
        ) : (
          <FormOnline
            slug={slug}
            paket={p.retail_program_sets.map((s) => ({
              id: s.id.toString(),
              judul: s.title,
              isi: s.retail_program_set_items.map((i) => i.name),
              foto: s.retail_program_set_items.flatMap((i) => {
                const f = i.menu_id ? sampul.get(i.menu_id.toString()) : undefined;
                return f ? [{ ...f, nama: i.name }] : [];
              }),
            }))}
            harga={harga}
            minPax={p.min_pax}
            area={p.area}
            pbjtPct={angka.pbjt_pct}
            waAdmin={wa}
          />
        )}
      </div>
    </main>
  );
}
