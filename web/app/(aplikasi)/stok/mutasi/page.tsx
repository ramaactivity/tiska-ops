import { Download, Repeat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman, Td, Th } from "@/components/halaman";
import { Button } from "@/components/ui/button";
import { bacaPeriode, mutasiKeseluruhan, mutasiPerBahan } from "@/lib/laporan-mutasi";
import { wajibIzin } from "@/lib/rbac";

import { SaringMutasi } from "./saring";

export const metadata: Metadata = { title: "Laporan mutasi stok" };
export const dynamic = "force-dynamic";

const angka = (v: { toString(): string }) => Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const hari = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const tgl = (t: string) => hari.format(new Date(`${t}T00:00:00Z`));

/* Laporan mutasi stok (D-148): keseluruhan (saldo awal, masuk, keluar, saldo akhir per bahan) & per bahan (riwayat + saldo berjalan). Tanpa harga. */
export default async function HalamanMutasi({ searchParams }: PageProps<"/stok/mutasi">) {
  await wajibIzin("stok");
  const p = bacaPeriode(await searchParams);
  const kartu = p.bahan ? await mutasiPerBahan(p.bahan, p.dari, p.sampai) : null;
  const semua = p.bahan ? [] : await mutasiKeseluruhan(p.dari, p.sampai);
  const unduh = `/stok/mutasi/excel?${new URLSearchParams({ dari: p.dari, sampai: p.sampai, ...(p.bahan ? { bahan: p.bahan } : {}) }).toString()}`;

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Repeat}
        judul="Laporan mutasi stok"
        keterangan={`Periode ${tgl(p.dari)} – ${tgl(p.sampai)}. Masuk = nota/penerimaan PO & koreksi tambah; keluar = pemakaian event, barang keluar, waste & koreksi kurang.`}
        aksi={
          <Button variant="outline" className="rounded-full" render={<a href={unduh} />}>
            <Download className="size-4" />
            Unduh Excel
          </Button>
        }
      />
      <div className="flex flex-col gap-5">
        <SaringMutasi dari={p.dari} sampai={p.sampai} bahan={kartu ? { id: kartu.bahan.id.toString(), label: kartu.bahan.name } : null} />

        {p.bahan && kartu ? (
          <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b p-4">
              <h2 className="font-medium">
                <Link href={`/stok/${kartu.bahan.id}`} className="underline-offset-4 hover:underline">
                  {kartu.bahan.name}
                </Link>{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {kartu.bahan.code} · satuan {kartu.bahan.satuan ?? "belum diatur"}
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <Th className="w-36">Tanggal</Th>
                    <Th className="w-40">Jenis</Th>
                    <Th>Keterangan</Th>
                    <Th className="w-28 text-right">Masuk</Th>
                    <Th className="w-28 text-right">Keluar</Th>
                    <Th className="w-28 text-right">Saldo</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/40">
                    <Td colSpan={5} className="font-medium">
                      Saldo awal
                    </Td>
                    <Td className="text-right font-mono font-medium tabular-nums">{angka(kartu.awal)}</Td>
                  </tr>
                  {kartu.baris.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <Td className="text-sm">{tgl(b.tanggal)}</Td>
                      <Td className="text-sm">{b.jenis}</Td>
                      <Td className="text-sm text-muted-foreground">{b.keterangan || "—"}</Td>
                      <Td className="text-right font-mono tabular-nums text-lunas">{Number(b.qty) > 0 ? angka(b.qty) : ""}</Td>
                      <Td className="text-right font-mono tabular-nums">{Number(b.qty) < 0 ? angka(Math.abs(Number(b.qty))) : ""}</Td>
                      <Td className="text-right font-mono tabular-nums">{angka(b.saldo)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <Td colSpan={5}>Saldo akhir</Td>
                    <Td className="text-right font-mono tabular-nums">{angka(kartu.akhir)}</Td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!kartu.baris.length ? <p className="p-4 text-sm text-muted-foreground">Tidak ada pergerakan di periode ini.</p> : null}
          </section>
        ) : p.bahan ? (
          <KeadaanKosong judul="Bahan tidak ditemukan." keterangan="Pilih bahan lain." />
        ) : !semua.length ? (
          <div className="rounded-2xl border bg-card">
            <KeadaanKosong judul="Belum ada saldo maupun pergerakan stok di periode ini." keterangan="Stok masuk otomatis dari nota belanja & penerimaan PO." />
          </div>
        ) : (
          <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b">
                    <Th>Bahan</Th>
                    <Th className="w-24">Satuan</Th>
                    <Th className="w-28 text-right">Saldo awal</Th>
                    <Th className="w-28 text-right">Masuk</Th>
                    <Th className="w-28 text-right">Keluar</Th>
                    <Th className="w-28 text-right">Saldo akhir</Th>
                  </tr>
                </thead>
                <tbody>
                  {semua.map((r) => (
                    <tr key={r.idBahan} className="border-b last:border-0">
                      <Td>
                        <Link
                          href={`/stok/mutasi?${new URLSearchParams({ dari: p.dari, sampai: p.sampai, bahan: r.idBahan }).toString()}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {r.nama}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{[r.kode, r.kategori].filter(Boolean).join(" · ")}</span>
                      </Td>
                      <Td className="text-sm text-muted-foreground">{r.satuan ?? "—"}</Td>
                      <Td className="text-right font-mono tabular-nums">{angka(r.awal)}</Td>
                      <Td className="text-right font-mono tabular-nums text-lunas">{r.masuk.isZero() ? "" : angka(r.masuk)}</Td>
                      <Td className="text-right font-mono tabular-nums">{r.keluar.isZero() ? "" : angka(r.keluar)}</Td>
                      <Td className={`text-right font-mono font-medium tabular-nums ${r.akhir.lt(0) ? "text-tempo" : ""}`}>{angka(r.akhir)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t p-3 text-xs text-muted-foreground">{semua.length} bahan. Klik nama bahan untuk melihat riwayatnya. Saldo minus (merah) = perlu opname.</p>
          </section>
        )}
      </div>
    </Halaman>
  );
}
