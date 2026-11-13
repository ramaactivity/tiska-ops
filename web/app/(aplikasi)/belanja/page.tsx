import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Pil } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { LABEL_STATUS_PR, type StatusPr } from "@/lib/belanja";
import { bolehLihatBiaya } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Belanja (PR)" };
export const dynamic = "force-dynamic";

const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const AKTIF: StatusPr[] = ["draft", "diajukan", "disetujui"];

/* Daftar Purchase Request (D-075). Bawaan: yang masih berjalan, tanggal kebutuhan terdekat dulu. */
export default async function HalamanBelanja({ searchParams }: PageProps<"/belanja">) {
  const sesi = await wajibIzin("belanja");
  const lihatHarga = bolehLihatBiaya(sesi.peran);
  const { status } = await searchParams;
  const saring = typeof status === "string" && status in LABEL_STATUS_PR ? (status as StatusPr) : "";

  const [daftar, hitung] = await Promise.all([
    prisma.purchase_requests.findMany({
      where: { status: saring ? saring : { in: AKTIF } },
      orderBy: saring ? [{ need_date: "desc" }, { id: "desc" }] : [{ need_date: "asc" }, { id: "asc" }],
      take: 200,
      select: {
        id: true,
        pr_number: true,
        need_date: true,
        status: true,
        event_ids: true,
        est_total: true,
        transfer_amount: true,
        finance_note: true,
        _count: { select: { purchase_request_items: true } },
      },
    }),
    prisma.purchase_requests.groupBy({ by: ["status"], _count: true }),
  ]);
  const jumlah = new Map(hitung.map((h) => [h.status, h._count]));

  return (
    <Halaman>
      <KepalaHalaman
        ikon={ClipboardList}
        judul="Belanja (PR)"
        keterangan="RAB belanja untuk event atau stok gudang: disusun, diajukan ke Finance, lalu dibelanjakan. Biaya event otomatis masuk Margin."
        aksi={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/kebutuhan-bahan" />}>
              Buat dari Kebutuhan Bahan
            </Button>
            <Button render={<Link href="/belanja/baru" />}>PR baru</Button>
          </div>
        }
      />
      <div className="pb-4">
        <SaringStatus
          parameter="status"
          pilihan={[
            { nilai: "", label: "Berjalan", jumlah: AKTIF.reduce((s, t) => s + (jumlah.get(t) ?? 0), 0) },
            ...(Object.entries(LABEL_STATUS_PR) as [StatusPr, string][]).map(([k, label]) => ({ nilai: k, label, jumlah: jumlah.get(k) ?? 0 })),
          ]}
        />
      </div>

      {daftar.length === 0 ? (
        <div className="kartu">
          <KeadaanKosong
            judul={saring ? "Tidak ada PR dengan status ini." : "Belum ada daftar belanja yang berjalan."}
            keterangan="Buka Kebutuhan Bahan, pilih tanggal acara, lalu tekan “Buat daftar belanja (PR)”."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {daftar.map((p) => (
            <li key={p.id.toString()}>
              <Link href={`/belanja/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 kartu p-4 transition-colors hover:bg-accent/40">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-medium">{p.pr_number}</span>
                  <span className="text-sm text-muted-foreground">
                    Untuk {hari.format(p.need_date)} · {p.event_ids.length ? `${p.event_ids.length} event` : "stok gudang"} · {p._count.purchase_request_items} barang
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lihatHarga ? <span className="font-mono text-sm tabular-nums">{rupiah(p.transfer_amount ?? p.est_total)}</span> : null}
                  {p.status === "draft" && p.finance_note ? <Pil nada="perhatian">Dikembalikan Finance</Pil> : null}
                  <Pil nada={p.status === "disetujui" ? "baik" : p.status === "diajukan" ? "perhatian" : "netral"}>
                    {LABEL_STATUS_PR[p.status as StatusPr] ?? p.status}
                  </Pil>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}
