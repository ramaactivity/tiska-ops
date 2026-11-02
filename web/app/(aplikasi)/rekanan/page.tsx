import { Handshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Pencarian } from "@/components/pencarian";
import { saringMirip } from "@/lib/cari-mirip";
import { JENIS_REKANAN, type JenisRekanan } from "@/lib/hitung/rekanan";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";
import { orderRekanan, statistik } from "@/lib/rekanan";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { TombolRekanan } from "./dialog-rekanan";

export const metadata: Metadata = { title: "Rekanan" };
export const dynamic = "force-dynamic";

const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* Rekanan pembawa klien (D-132): EO, WO, MC, venue… — klien, order, omzet, Partner Fee. */
export default async function HalamanRekanan({ searchParams }: PageProps<"/rekanan">) {
  await wajibIzin("rekanan");
  const { cari, jenis } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const aktif = typeof jenis === "string" && jenis in JENIS_REKANAN ? (jenis as JenisRekanan) : null;
  const [rekanan, order, atur] = await Promise.all([
    prisma.referral_partners.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, contact_name: true, phone: true, fee_pct: true, active: true, customers: { select: { id: true } } } }),
    orderRekanan(),
    bacaPengaturanBisnis(),
  ]);
  const baris = rekanan
    .map((r) => ({ ...r, s: statistik(r.id.toString(), order, r.customers.map((c) => c.id.toString())) }))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.s.omzet - a.s.omzet || a.name.localeCompare(b.name));
  const sejenis = aktif ? baris.filter((r) => r.kind === aktif) : baris;
  const tampil = kunci ? saringMirip(kunci, sejenis, (r) => [r.name, r.contact_name, JENIS_REKANAN[r.kind as JenisRekanan]], 200) : sejenis;
  const total = (k: "siap" | "dibayar" | "omzet") => baris.reduce((n, r) => n + r.s[k], 0);
  const per = new Map<string, number>();
  for (const r of baris) per.set(r.kind, (per.get(r.kind) ?? 0) + 1);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Handshake}
        judul="Rekanan"
        jumlah={rekanan.length}
        keterangan={`EO, WO, MC, venue, dan pihak lain yang membawa klien. Partner Fee bawaan ${String(atur.partner_fee_pct).replace(".", ",")}% dari nilai makanan & minuman, siap dibayar setelah klien lunas.`}
        aksi={<TombolRekanan feeBawaan={atur.partner_fee_pct} />}
      />
      <PapanAngka kolom={3} className="mb-5">
        <KartuAngka label="Omzet dari rekanan" nilai={rupiah(total("omzet"))} keterangan={`${baris.filter((r) => r.active).length} rekanan aktif · ${baris.reduce((n, r) => n + r.s.klien, 0)} klien · ${order.length} order`} />
        <KartuAngka label="Partner Fee siap dibayar" nilai={rupiah(total("siap"))} nada={total("siap") ? "perhatian" : "netral"} menonjol keterangan={`${order.filter((o) => o.status === "siap").length} order, klien sudah lunas`} />
        <KartuAngka label="Partner Fee sudah dibayar" nilai={rupiah(total("dibayar"))} />
      </PapanAngka>
      <div className="mb-3 sm:w-96">
        <Pencarian placeholder="Cari nama rekanan atau PIC" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[[null, `Semua (${baris.length})`] as const, ...Object.entries(JENIS_REKANAN).filter(([k]) => per.has(k)).map(([k, l]) => [k, `${l} (${per.get(k)})`] as const)].map(([k, l]) => (
          <Link
            key={k ?? "semua"}
            href={k ? `/rekanan?jenis=${k}` : "/rekanan"}
            className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", k === aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}
          >
            {l}
          </Link>
        ))}
      </div>
      <BingkaiTabel>
        {tampil.length ? (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Rekanan</Th>
                <Th className="text-right">Klien</Th>
                <Th className="text-right">Order</Th>
                <Th className="hidden text-right md:table-cell">Omzet</Th>
                <Th className="text-right">Partner Fee siap dibayar</Th>
                <Th className="hidden text-right lg:table-cell">Sudah dibayar</Th>
                <Th className="hidden lg:table-cell">Order terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((r) => (
                <tr key={r.id.toString()} className={cn("border-b border-border-row last:border-0 hover:bg-muted/40", !r.active && "opacity-60")}>
                  <Td>
                    <Link href={`/rekanan/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                      {r.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {JENIS_REKANAN[r.kind as JenisRekanan] ?? r.kind}
                      {r.contact_name ? ` · ${r.contact_name}` : ""}
                      {r.fee_pct !== null ? ` · Partner Fee ${String(Number(r.fee_pct)).replace(".", ",")}%` : ""}
                      {!r.active ? " · nonaktif" : ""}
                    </span>
                  </Td>
                  <Td className="text-right font-mono tabular-nums">{r.s.klien}</Td>
                  <Td className="text-right font-mono tabular-nums">{r.s.order}</Td>
                  <Td className="hidden text-right font-mono tabular-nums md:table-cell">{rupiah(r.s.omzet)}</Td>
                  <Td className={cn("text-right font-mono tabular-nums", r.s.siap && "font-semibold text-perhatian")}>{r.s.siap ? rupiah(r.s.siap) : "—"}</Td>
                  <Td className="hidden text-right font-mono tabular-nums lg:table-cell">{r.s.dibayar ? rupiah(r.s.dibayar) : "—"}</Td>
                  <Td className="hidden text-sm text-muted-foreground lg:table-cell">{r.s.terakhir ? tgl.format(new Date(`${r.s.terakhir}T00:00:00Z`)) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Belum ada rekanan"}
            keterangan={kunci ? `Tidak ditemukan rekanan untuk "${kunci}".` : "Tambahkan EO, WO, MC, atau venue yang biasa membawa klien. Lalu tandai di customer / quotation mana yang dibawa mereka."}
          />
        )}
      </BingkaiTabel>
    </Halaman>
  );
}
