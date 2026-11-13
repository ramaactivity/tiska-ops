import { FileBox, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { LABEL_STATUS_PO, type StatusPo } from "@/lib/belanja";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "PO Supplier" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const BERJALAN: StatusPo[] = ["draft", "dikirim", "sebagian"];

/* PO ke supplier tempo (D-083). Bawaan: yang masih berjalan. */
export default async function HalamanPo({ searchParams }: PageProps<"/po">) {
  await wajibIzin("po");
  const { status } = await searchParams;
  const saring = typeof status === "string" && status in LABEL_STATUS_PO ? (status as StatusPo) : "";
  const [daftar, hitung] = await Promise.all([
    prisma.purchase_orders.findMany({
      where: { status: saring ? saring : { in: BERJALAN } },
      orderBy: [{ order_date: "desc" }, { id: "desc" }],
      take: 200,
      include: { suppliers: { select: { name: true } }, purchase_requests: { select: { pr_number: true } }, _count: { select: { purchase_order_items: true } } },
    }),
    prisma.purchase_orders.groupBy({ by: ["status"], _count: true }),
  ]);
  const jumlah = new Map(hitung.map((h) => [h.status, h._count]));

  return (
    <Halaman>
      <KepalaHalaman
        ikon={FileBox}
        judul="PO Supplier"
        keterangan="Pesanan ke supplier tempo: pesan → terima barang (boleh sebagian) → otomatis jadi hutang dengan jatuh tempo."
        aksi={
          <Button render={<Link href="/po/baru" />}>
            <Plus className="size-4" />
            PO baru
          </Button>
        }
      />
      <div className="pb-4">
        <SaringStatus
          parameter="status"
          pilihan={[
            { nilai: "", label: "Berjalan", jumlah: BERJALAN.reduce((s, t) => s + (jumlah.get(t) ?? 0), 0) },
            ...(Object.entries(LABEL_STATUS_PO) as [StatusPo, string][]).map(([k, label]) => ({ nilai: k, label, jumlah: jumlah.get(k) ?? 0 })),
          ]}
        />
      </div>
      {!daftar.length ? (
        <div className="kartu">
          <KeadaanKosong judul={saring ? "Tidak ada PO dengan status ini." : "Belum ada PO yang berjalan."} keterangan="Buat PO dari PR yang sudah disetujui Finance, atau PO kosong untuk isi ulang stok." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {daftar.map((p) => (
            <li key={p.id.toString()}>
              <Link href={`/po/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 kartu p-4 transition-colors hover:bg-accent/40">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    <span className="font-mono text-sm">{p.po_number}</span> · {p.suppliers.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {[`Dipesan ${hari.format(p.order_date)}`, p.expected_date ? `kirim ${hari.format(p.expected_date)}` : null, `${p._count.purchase_order_items} barang`, p.purchase_requests?.pr_number].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">{rupiah(p.total)}</span>
                  <Pil nada={p.status === "diterima" ? "baik" : p.status === "sebagian" || p.status === "dikirim" ? "perhatian" : "netral"}>{LABEL_STATUS_PO[p.status as StatusPo] ?? p.status}</Pil>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}
