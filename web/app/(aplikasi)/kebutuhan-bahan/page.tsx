import { ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Pil, Td, Th } from "@/components/halaman";
import { LABEL_STATUS_PR, type StatusPr } from "@/lib/belanja";
import { bacaIzin } from "@/lib/izin";
import { kebutuhanTanggal, teksBelumTerhitung } from "@/lib/kebutuhan-event";
import { bolehBuka } from "@/lib/navigasi";
import { satuanStok } from "@/lib/hitung/stok";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { saldoStok } from "@/lib/stok";

import { TombolBuatPr } from "./tombol-buat-pr";
import { TombolPemakaian } from "./tombol-pemakaian";

export const metadata: Metadata = { title: "Kebutuhan Bahan" };
export const dynamic = "force-dynamic";

const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const hariPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/* Kebutuhan bahan per tanggal dari event (D-057): isi menu → resep → takaran × porsi. TANPA harga. */
export default async function HalamanKebutuhan({ searchParams }: PageProps<"/kebutuhan-bahan">) {
  const sesi = await wajibIzin("kebutuhan-bahan");
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const geser = (n: number) => new Date(Date.parse(`${hariIni}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const { tanggal: q } = await searchParams;
  const tanggal = typeof q === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : geser(1);
  const k = await kebutuhanTanggal(tanggal);
  const { event, program, bahan, totalPorsi } = k;
  const adaOrder = event.length + program.length > 0;
  const belum = teksBelumTerhitung(k);
  const izin = await bacaIzin();
  const bolehPr = bolehBuka(sesi.peran, "belanja", izin);
  // Stok gudang (D-087): kolom stok + catat pemakaian tanggal ini.
  const bolehStok = bolehBuka(sesi.peran, "stok", izin);
  const [saldo, satuanBahan, sudahPakai] = bolehStok
    ? await Promise.all([
        saldoStok(bahan.map((b) => BigInt(b.idBahan))),
        prisma.ingredients.findMany({ where: { id: { in: bahan.map((b) => BigInt(b.idBahan)) } }, select: { id: true, usage_unit: true, purchase_unit: true } }),
        prisma.stock_movements.count({ where: { kind: "pakai", usage_date: new Date(`${tanggal}T00:00:00Z`) } }),
      ])
    : [new Map(), [], 0];
  const satuanStokBahan = new Map(satuanBahan.map((b) => [b.id.toString(), satuanStok(b)]));
  const prAda = bolehPr
    ? await prisma.purchase_requests.findMany({
        where: { need_date: new Date(`${tanggal}T00:00:00Z`), status: { not: "batal" } },
        select: { id: true, pr_number: true, status: true },
        orderBy: { id: "asc" },
      })
    : [];

  const pilihan: [string, string][] = [
    [geser(0), "Hari ini"],
    [geser(1), "Besok"],
    [geser(2), "Lusa"],
  ];

  return (
    <Halaman>
      <KepalaHalaman ikon={ShoppingBasket} judul="Kebutuhan Bahan" keterangan="Dihitung dari isi menu event × takaran resep × porsi. Tanpa harga — dasar daftar belanja." />
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {pilihan.map(([t, label]) => (
          <Link
            key={t}
            href={`/kebutuhan-bahan?tanggal=${t}`}
            className={`min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors ${t === tanggal ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <p className="pb-4 text-sm text-muted-foreground">
        {hariPanjang(tanggal)} · {event.length} event
        {program.length ? ` · ${program.length} Ikut Menu Pesta (${program.reduce((a, p) => a + p.totalPax, 0)} pax)` : ""} · {totalPorsi.toLocaleString("id-ID")} porsi menu
      </p>
      {bolehPr && adaOrder ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border bg-card p-4">
          <p className="mr-auto text-sm text-muted-foreground">
            {prAda.length ? "Daftar belanja tanggal ini:" : "Belum ada daftar belanja (PR) untuk tanggal ini."}
          </p>
          {prAda.map((p) => (
            <Link key={p.id.toString()} href={`/belanja/${p.id}`} className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
              <span className="font-mono">{p.pr_number}</span>
              <Pil nada={p.status === "disetujui" ? "baik" : "netral"}>{LABEL_STATUS_PR[p.status as StatusPr] ?? p.status}</Pil>
            </Link>
          ))}
          <TombolBuatPr tanggal={tanggal} lagi={prAda.length > 0} />
        </div>
      ) : null}
      {bolehStok && bahan.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border bg-card p-4">
          <p className="mr-auto text-sm text-muted-foreground">
            {sudahPakai ? `Pemakaian bahan tanggal ini sudah dicatat ke stok (${sudahPakai} bahan).` : "Sesudah dimasak, catat pemakaian bahan tanggal ini supaya stok berkurang."}
          </p>
          <TombolPemakaian tanggal={tanggal} sudah={sudahPakai > 0} />
        </div>
      ) : null}

      {!adaOrder ? (
        <div className="rounded-[14px] border bg-card">
          <KeadaanKosong judul="Tidak ada event di tanggal ini." />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {bahan.length ? (
            <BingkaiTabel>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <Th>Bahan</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="text-right">≈ Kemasan beli</Th>
                    {bolehStok ? <Th className="text-right">Stok</Th> : null}
                    <Th>Untuk menu</Th>
                  </tr>
                </thead>
                <tbody>
                  {bahan.map((b) => (
                    <tr key={b.idBahan} className="border-b last:border-b-0">
                      <Td>
                        <Link href={`/bahan/${b.idBahan}`} className="font-medium underline-offset-4 hover:underline">
                          {b.nama}
                        </Link>
                        {b.pengganti ? (
                          <span className="ml-2">
                            <Pil nada="perhatian">bahan pengganti</Pil>
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular-nums">
                        {angka(b.qty)} {b.satuan ?? ""}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {b.kemasan ? `${angka(b.kemasan)} ${b.satuanBeli ?? "kemasan"}` : "—"}
                      </Td>
                      {bolehStok ? (
                        <Td className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                          {saldo.has(b.idBahan) ? `${angka(saldo.get(b.idBahan)!)} ${satuanStokBahan.get(b.idBahan) ?? ""}` : "—"}
                        </Td>
                      ) : null}
                      <Td className="text-muted-foreground">{b.menu.join(", ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </BingkaiTabel>
          ) : null}
          {belum.length ? (
            <section className="rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian">
              <p className="font-medium">Belum bisa dihitung — lengkapi supaya daftar belanja utuh:</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                {belum.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Halaman>
  );
}
