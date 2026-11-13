import { ChevronLeft, Handshake, MessageCircle, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BingkaiTabel, Halaman, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Button } from "@/components/ui/button";
import { tautanWa } from "@/lib/hitung/ikut-menu-pesta";
import { KATEGORI_VENDOR, type KategoriVendor } from "@/lib/hitung/rekanan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { opsiRekanan } from "@/lib/rekanan";
import { rupiah } from "@/lib/uang";

import { TombolVendor } from "../form-supplier";

export const metadata: Metadata = { title: "Vendor" };
export const dynamic = "force-dynamic";

const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Satu vendor (D-133): kontak, penilaian, riwayat PO, nota belanja, hutang, dan sewa alat di event. */
export default async function HalamanVendor({ params }: PageProps<"/supplier/[id]">) {
  await wajibIzin("supplier");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const s = await prisma.suppliers.findUnique({ where: { id: BigInt(id) }, include: { referral_partners: { select: { id: true, name: true } } } });
  if (!s) notFound();
  const [po, nota, hutang, sewa, rekanan] = await Promise.all([
    prisma.purchase_orders.findMany({ where: { supplier_id: s.id }, orderBy: { id: "desc" }, take: 50, select: { id: true, po_number: true, order_date: true, status: true, total: true } }),
    prisma.purchases.findMany({ where: { supplier_id: s.id, status: "posted" }, orderBy: { id: "desc" }, take: 50, select: { id: true, purchase_number: true, purchased_at: true, total: true } }),
    prisma.supplier_payables.findMany({ where: { supplier_id: s.id }, orderBy: [{ status: "asc" }, { due_date: "asc" }], take: 50, select: { id: true, amount: true, due_date: true, status: true, paid_at: true } }),
    // Sewa alat di event masih mencatat nama vendor sebagai teks — dicocokkan lewat nama.
    prisma.event_equipment.findMany({ where: { vendor_name: { equals: s.name, mode: "insensitive" } }, orderBy: { id: "desc" }, take: 50, select: { id: true, item_name: true, qty: true, rental_cost: true, events: { select: { id: true, first_date: true, customers: { select: { name: true } } } } } }),
    opsiRekanan(),
  ]);
  const belum = hutang.filter((h) => h.status === "belum").reduce((n, h) => n + Number(h.amount), 0);
  const belanja = po.filter((p) => p.status !== "batal").reduce((n, p) => n + Number(p.total), 0) + nota.reduce((n, x) => n + Number(x.total), 0);
  const kategori = KATEGORI_VENDOR[(s.category ?? "lainnya") as KategoriVendor] ?? s.category;

  return (
    <Halaman>
      <Link href="/supplier" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Vendor &amp; Supplier
      </Link>
      <KepalaHalaman
        ikon={Store}
        judul={s.name}
        keterangan={[kategori, s.contact_name, s.rating ? "★".repeat(s.rating) : null, s.active ? null : "nonaktif"].filter(Boolean).join(" · ")}
        aksi={
          <>
            {s.phone ? (
              <Button variant="outline" className="rounded-full bg-card" render={<a href={tautanWa(s.phone)} target="_blank" rel="noopener" />}>
                <MessageCircle className="size-4" />
                Chat WA
              </Button>
            ) : null}
            <TombolVendor
              opsiRekanan={rekanan}
              s={{
                id,
                name: s.name,
                category: s.category ?? "",
                contact_name: s.contact_name ?? "",
                phone: s.phone ?? "",
                payment_term_days: s.payment_term_days,
                bank_account: s.bank_account ?? "",
                notes: s.notes ?? "",
                active: s.active,
                address: s.address ?? "",
                instagram: s.instagram ?? "",
                rating: s.rating,
                rekanan: s.referral_partners ? { id: s.referral_partners.id.toString(), label: s.referral_partners.name } : null,
              }}
            />
          </>
        }
      />
      <PapanAngka kolom={3} className="mb-5">
        <KartuAngka label="Total belanja" nilai={rupiah(belanja)} keterangan={`${po.length} PO · ${nota.length} nota`} />
        <KartuAngka label="Hutang belum dibayar" nilai={rupiah(belum)} nada={belum ? "perhatian" : "netral"} menonjol keterangan={s.payment_term_days ? `tempo ${s.payment_term_days} hari` : "bayar tunai"} />
        <KartuAngka label="Sewa alat di event" nilai={String(sewa.length)} keterangan="dicocokkan dari nama vendor di Peralatan" />
      </PapanAngka>

      <section className="mb-6 flex flex-col gap-1 kartu px-5 py-4 text-[0.9375rem]">
        {[s.phone, s.address, s.instagram, s.bank_account ? `Rekening: ${s.bank_account}` : null].filter(Boolean).map((x) => (
          <p key={x}>{x}</p>
        ))}
        {s.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{s.notes}</p> : null}
        {s.referral_partners ? (
          <p className="flex items-center gap-1.5 pt-1 text-sm">
            <Handshake className="size-4 text-muted-foreground" />
            Juga rekanan pembawa klien:{" "}
            <Link href={`/rekanan/${s.referral_partners.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {s.referral_partners.name}
            </Link>
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Riwayat judul="PO" kosong="Belum ada PO.">
          {po.map((p) => (
            <tr key={p.id.toString()} className="border-b border-border-row last:border-0">
              <Td>
                <Link href={`/po/${p.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                  {p.po_number}
                </Link>
                <span className="block text-xs text-muted-foreground">{tgl.format(p.order_date)}</span>
              </Td>
              <Td>
                <Pil>{p.status}</Pil>
              </Td>
              <Td className="text-right font-mono tabular-nums">{rupiah(p.total)}</Td>
            </tr>
          ))}
        </Riwayat>
        <Riwayat judul="Hutang" kosong="Belum ada hutang.">
          {hutang.map((h) => (
            <tr key={h.id.toString()} className="border-b border-border-row last:border-0">
              <Td className="text-sm">
                jatuh tempo {tgl.format(h.due_date)}
                {h.paid_at ? <span className="block text-xs text-muted-foreground">dibayar {tgl.format(h.paid_at)}</span> : null}
              </Td>
              <Td>
                <Pil nada={h.status === "lunas" ? "baik" : "perhatian"}>{h.status === "lunas" ? "Lunas" : "Belum dibayar"}</Pil>
              </Td>
              <Td className="text-right font-mono tabular-nums">{rupiah(h.amount)}</Td>
            </tr>
          ))}
        </Riwayat>
        <Riwayat judul="Nota belanja" kosong="Belum ada nota belanja dari vendor ini.">
          {nota.map((n) => (
            <tr key={n.id.toString()} className="border-b border-border-row last:border-0">
              <Td>
                <Link href={`/uang-muka/belanja/${n.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                  {n.purchase_number}
                </Link>
              </Td>
              <Td className="text-sm text-muted-foreground">{tgl.format(n.purchased_at)}</Td>
              <Td className="text-right font-mono tabular-nums">{rupiah(n.total)}</Td>
            </tr>
          ))}
        </Riwayat>
        <Riwayat judul="Sewa alat di event" kosong={`Belum ada sewa alat dengan nama vendor "${s.name}" di Peralatan event.`}>
          {sewa.map((x) => (
            <tr key={x.id.toString()} className="border-b border-border-row last:border-0">
              <Td>
                <Link href={`/event/${x.events.id}`} className="text-primary underline-offset-4 hover:underline">
                  {x.events.customers.name}
                </Link>
                <span className="block text-xs text-muted-foreground">{x.events.first_date ? tgl.format(x.events.first_date) : ""}</span>
              </Td>
              <Td className="text-sm">
                {x.item_name} × {x.qty}
              </Td>
              <Td className="text-right font-mono tabular-nums">{x.rental_cost !== null ? rupiah(x.rental_cost) : "—"}</Td>
            </tr>
          ))}
        </Riwayat>
      </div>
    </Halaman>
  );
}

function Riwayat({ judul, kosong, children }: { judul: string; kosong: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="eyebrow pb-2">{judul}</h2>
      <BingkaiTabel>
        {children.length ? (
          <table className="w-full">
            <thead className="sr-only">
              <tr>
                <Th>Dokumen</Th>
                <Th>Keterangan</Th>
                <Th>Nominal</Th>
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        ) : (
          <p className="px-4 py-5 text-center text-sm text-muted-foreground">{kosong}</p>
        )}
      </BingkaiTabel>
    </section>
  );
}
