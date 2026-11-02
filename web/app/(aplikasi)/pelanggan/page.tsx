import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BingkaiTabel,
  Halaman,
  KeadaanKosong,
  KepalaHalaman,
  RingkasanTabel,
  Td,
  Th,
} from "@/components/halaman";
import { Pencarian } from "@/components/pencarian";
import { TombolImpor } from "@/components/tombol-impor";
import { ThUrut } from "@/components/th-urut";
import { JENIS_KLIEN, type JenisKlien, tebakJenisKlien } from "@/lib/hitung/rekanan";
import { prisma } from "@/lib/prisma";
import { opsiRekanan as bacaOpsiRekanan } from "@/lib/rekanan";
import { wajibIzin } from "@/lib/rbac";
import { bacaUrut, urutkan } from "@/lib/urut";
import { cn } from "@/lib/utils";

import { AksiBaris } from "./aksi-baris";
import { DialogPelanggan } from "./dialog-pelanggan";

export const metadata: Metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function HalamanPelanggan({
  searchParams,
}: PageProps<"/pelanggan">) {
  await wajibIzin("pelanggan");

  const { cari, urut, jenis, kanal } = await searchParams;
  const jenisAktif = typeof jenis === "string" && jenis in JENIS_KLIEN ? (jenis as JenisKlien) : null;
  const kanalAktif = kanal === "event" || kanal === "retail" ? kanal : null;
  const kunci = typeof cari === "string" ? cari.trim() : "";

  // Penyaringan dikerjakan database, bukan di browser. Aplikasi Laravel-nya
  // menarik seluruh tabel lalu menyaring di PHP — itu yang membuatnya berat
  // begitu datanya bertambah.
  const semua = await prisma.customers.findMany({
    where: kunci
      ? {
          OR: [
            { name: { contains: kunci, mode: "insensitive" } },
            { customer_code: { contains: kunci, mode: "insensitive" } },
            { phone: { contains: kunci, mode: "insensitive" } },
            { pic_name: { contains: kunci, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      customer_code: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      npwp: true,
      pic_name: true,
      status: true,
      is_test: true,
      client_type: true,
      referral_partners: { select: { id: true, name: true } },
      // Kanal dihitung dari transaksinya (D-132): catering event vs retail / Ikut Menu Pesta.
      _count: { select: { retail_orders: true, quotations: { where: { order_type: "event" } }, invoices: { where: { order_type: "event" } } } },
    },
  });
  const opsiRekanan = await bacaOpsiRekanan();
  const lengkap = semua.map((p) => ({
    ...p,
    jenis: (p.client_type ?? tebakJenisKlien(p.name)) as JenisKlien,
    event: p._count.quotations + p._count.invoices > 0,
    retail: p._count.retail_orders > 0,
  }));
  const perJenis = new Map<string, number>();
  for (const p of lengkap) perJenis.set(p.jenis, (perJenis.get(p.jenis) ?? 0) + 1);
  const tersaring = lengkap.filter((p) => (!jenisAktif || p.jenis === jenisAktif) && (!kanalAktif || p[kanalAktif]));
  const tautan = (j: string | null, k: string | null) => {
    const q = new URLSearchParams();
    if (j) q.set("jenis", j);
    if (k) q.set("kanal", k);
    if (kunci) q.set("cari", kunci);
    return `/pelanggan${q.size ? `?${q}` : ""}`;
  };

  const { kolom, arah } = bacaUrut(urut, ["kode", "nama"] as const, "nama");
  const daftar = urutkan(tersaring, (p) => (kolom === "kode" ? p.customer_code : p.name), arah);
  const jumlahAktif = daftar.filter((p) => p.status === "active").length;

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Users}
        jumlah={daftar.length}
        judul="Customer"
        keterangan="Data customer yang dipakai di quotation dan invoice."
        aksi={
          <div className="flex flex-wrap gap-2">
            <TombolImpor jenis="customer" />
            <DialogPelanggan opsiRekanan={opsiRekanan} />
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[[null, `Semua jenis (${lengkap.length})`] as const, ...Object.entries(JENIS_KLIEN).filter(([j]) => perJenis.has(j)).map(([j, l]) => [j, `${l} (${perJenis.get(j)})`] as const)].map(([j, l]) => (
          <Link key={j ?? "semua"} href={tautan(j, kanalAktif)} className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", j === jenisAktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}>
            {l}
          </Link>
        ))}
        <span className="mx-1 self-center text-muted-foreground">·</span>
        {(
          [
            [null, "Semua kanal"],
            ["event", "Catering event"],
            ["retail", "Retail / Ikut Menu Pesta"],
          ] as const
        ).map(([k, l]) => (
          <Link key={k ?? "semua"} href={tautan(jenisAktif, k)} className={cn("min-h-9 content-center rounded-full border px-3.5 text-sm transition-colors", k === kanalAktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent")}>
            {l}
          </Link>
        ))}
      </div>

      <div className="pb-4 sm:w-96">
        <Pencarian placeholder="Cari nama, kode, PIC, atau telepon…" />
      </div>

      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Belum ada customer"}
            keterangan={
              kunci
                ? `Tidak ditemukan pelanggan untuk "${kunci}".`
                : "Tambahkan customer pertama supaya bisa dipilih saat membuat quotation."
            }
            aksi={kunci ? undefined : <DialogPelanggan opsiRekanan={opsiRekanan} />}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <ThUrut kolom="kode" className="w-28">Kode</ThUrut>
                <ThUrut kolom="nama">Nama</ThUrut>
                <Th className="hidden md:table-cell">PIC</Th>
                <Th className="hidden sm:table-cell">Telepon</Th>
                <Th className="w-24">Status</Th>
                <Th className="w-12"><span className="sr-only">Tindakan</span></Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => {
                const aktif = p.status === "active";
                return (
                  <tr key={p.id.toString()} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                    <Td className="nomor-dokumen text-muted-foreground">{p.customer_code}</Td>
                    <Td>
                      <Link
                        href={`/pelanggan/${p.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.is_test ? (
                        <span className="ml-2 rounded-full bg-perhatian-halus px-2 py-0.5 text-xs font-medium text-perhatian">data tes</span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        {JENIS_KLIEN[p.jenis]}
                        {p.event ? " · Catering event" : ""}
                        {p.retail ? " · Retail" : ""}
                        {p.referral_partners ? ` · via ${p.referral_partners.name}` : ""}
                      </span>
                    </Td>
                    <Td className="hidden text-muted-foreground md:table-cell">
                      {p.pic_name || "—"}
                    </Td>
                    <Td className="hidden text-muted-foreground sm:table-cell">
                      {p.phone || "—"}
                    </Td>
                    <Td>
                      <LencanaAktif aktif={aktif} />
                    </Td>
                    <Td className="text-right">
                      <AksiBaris
                        aktif={aktif}
                        opsiRekanan={opsiRekanan}
                        pelanggan={{
                          id: p.id.toString(),
                          customer_code: p.customer_code,
                          name: p.name,
                          address: p.address,
                          phone: p.phone,
                          email: p.email,
                          npwp: p.npwp,
                          pic_name: p.pic_name,
                          is_test: p.is_test,
                          client_type: p.client_type,
                          rekanan: p.referral_partners ? { id: p.referral_partners.id.toString(), label: p.referral_partners.name } : null,
                        }}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </BingkaiTabel>

      {daftar.length > 0 ? (
        <RingkasanTabel>
          {daftar.length} customer{kunci ? " cocok" : ""} · {jumlahAktif} aktif
        </RingkasanTabel>
      ) : null}
    </Halaman>
  );
}

/**
 * Aktif dibiarkan tanpa warna — itu keadaan normal dan tidak perlu menarik
 * perhatian. Yang diberi tanda justru yang nonaktif, karena itu yang
 * menjelaskan kenapa sebuah nama tidak muncul di daftar pilihan penawaran.
 */
function LencanaAktif({ aktif }: { aktif: boolean }) {
  if (aktif) return <span className="text-xs text-muted-foreground">Aktif</span>;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/60 bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full ring-1 ring-current" aria-hidden="true" />
      Nonaktif
    </span>
  );
}
