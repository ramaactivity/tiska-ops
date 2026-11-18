import { CalendarCheck, ShoppingBag, Users } from "lucide-react";
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
import { SaringStatus } from "@/components/saring-status";
import { TombolImpor } from "@/components/tombol-impor";
import { ThUrut } from "@/components/th-urut";
import { JENIS_KLIEN, type JenisKlien, tebakJenisKlien } from "@/lib/hitung/rekanan";
import { prisma } from "@/lib/prisma";
import { opsiRekanan as bacaOpsiRekanan } from "@/lib/rekanan";
import { wajibIzin } from "@/lib/rbac";
import { bacaUrut, urutkan } from "@/lib/urut";

import { AksiBaris } from "./aksi-baris";
import { DialogPelanggan } from "./dialog-pelanggan";

export const metadata: Metadata = { title: "Customer" };

/** Label pendek untuk tab saringan (satu baris di layar laptop); label lengkap tetap di popup & bawah nama. */
const LABEL_TAB_JENIS: Partial<Record<JenisKlien, string>> = {
  kelompok: "Komunitas",
  organisasi: "Organisasi & sekolah",
  instansi: "Instansi",
};
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

  const { kolom, arah } = bacaUrut(urut, ["kode", "nama"] as const, "nama");
  const daftar = urutkan(tersaring, (p) => (kolom === "kode" ? p.customer_code : p.name), arah);
  const jumlahAktif = daftar.filter((p) => p.status === "active").length;
  const dataPelanggan = (p: (typeof daftar)[number]) => ({
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
  });

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Users}
        jumlah={daftar.length}
        judul="Customer"
        keterangan="Data customer yang dipakai di quotation dan invoice."
        aksi={
          <div className="flex flex-wrap gap-2">
            {/* Impor Excel dikerjakan di komputer; di HP cukup satu tombol utama. */}
            <span className="max-sm:hidden">
              <TombolImpor jenis="customer" />
            </span>
            <DialogPelanggan opsiRekanan={opsiRekanan} />
          </div>
        }
      />

      {/* Saringan (Rama, 18 Nov): jenis klien = tab pil berwadah (sama dengan Pesanan & Dashboard), kanal = segmen
          kecil di samping kotak cari — dulu dua deret chip bercampur dalam satu baris yang turun-turun. */}
      <div className="mb-4 flex flex-col gap-3">
        <SaringStatus
          parameter="jenis"
          pilihan={[
            { nilai: "", label: "Semua", jumlah: lengkap.length },
            ...Object.entries(JENIS_KLIEN)
              .filter(([j]) => perJenis.has(j))
              .map(([j, l]) => ({ nilai: j, label: LABEL_TAB_JENIS[j as JenisKlien] ?? l, jumlah: perJenis.get(j) })),
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <Pencarian placeholder="Cari nama, kode, PIC, atau telepon…" />
          </div>
          <SaringStatus
            parameter="kanal"
            pilihan={[
              { nilai: "", label: "Semua kanal" },
              { nilai: "event", label: "Catering event", ikon: <CalendarCheck className="size-4" strokeWidth={1.75} /> },
              { nilai: "retail", label: "Retail", ikon: <ShoppingBag className="size-4" strokeWidth={1.75} /> },
            ]}
          />
        </div>
      </div>

      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci || jenisAktif || kanalAktif ? "Tidak ada yang cocok" : "Belum ada customer"}
            keterangan={
              kunci
                ? `Tidak ditemukan pelanggan untuk "${kunci}".`
                : jenisAktif || kanalAktif
                  ? "Tidak ada customer dengan saringan ini. Pilih \u201cSemua\u201d untuk melihat semuanya."
                  : "Tambahkan customer pertama supaya bisa dipilih saat membuat quotation."
            }
            aksi={kunci || jenisAktif || kanalAktif ? undefined : <DialogPelanggan opsiRekanan={opsiRekanan} />}
          />
        ) : (
          <>
          {/* HP: daftar kartu ala kontak (D-180) — tabel 3 kolom terlalu sempit di layar 360–412 px. */}
          <ul className="divide-y divide-border-row sm:hidden">
            {daftar.map((p) => (
              <li key={p.id.toString()} className="flex items-center pr-2">
                <Link href={`/pelanggan/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 transition-colors active:bg-muted/60">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
                    {inisial(p.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <span className="nomor-dokumen">{p.customer_code}</span> · {JENIS_KLIEN[p.jenis]}
                      {p.phone ? <> · <span className="whitespace-nowrap">{p.phone}</span></> : null}
                    </span>
                    {p.is_test || p.status !== "active" ? (
                      <span className="mt-1 flex gap-1.5">
                        {p.status !== "active" ? <LencanaAktif aktif={false} /> : null}
                        {p.is_test ? <span className="rounded-full bg-perhatian-halus px-2 py-0.5 text-xs font-medium text-perhatian">data tes</span> : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
                <AksiBaris aktif={p.status === "active"} opsiRekanan={opsiRekanan} pelanggan={dataPelanggan(p)} />
              </li>
            ))}
          </ul>
          <table className="hidden w-full sm:table">
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
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                          {inisial(p.name)}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/pelanggan/${p.id}`} className="font-medium underline-offset-4 hover:underline">
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
                        </span>
                      </div>
                    </Td>
                    <Td className="hidden text-muted-foreground md:table-cell">
                      {p.pic_name || "—"}
                    </Td>
                    <Td className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                      {p.phone || "—"}
                    </Td>
                    <Td>
                      <LencanaAktif aktif={aktif} />
                    </Td>
                    <Td className="text-right">
                      <AksiBaris
                        aktif={aktif}
                        opsiRekanan={opsiRekanan}
                        pelanggan={dataPelanggan(p)}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
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
/** Dua huruf awal untuk lingkaran di daftar HP: "Bank Raya Indonesia" → "BR", gelar Bapak/Ibu dilewati. */
function inisial(nama: string) {
  const kata = nama.replace(/^(bapak|ibu|bpk\.?|bp\.?|bu|pak|mr\.?|mrs\.?|pt\.?|cv\.?)\s+/i, "").split(/\s+/).filter((k) => /[a-z0-9]/i.test(k));
  return (kata.slice(0, 2).map((k) => k.match(/[a-z0-9]/i)?.[0] ?? "").join("") || "?").toUpperCase();
}

function LencanaAktif({ aktif }: { aktif: boolean }) {
  if (aktif) return <span className="text-xs text-muted-foreground">Aktif</span>;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/60 bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full ring-1 ring-current" aria-hidden="true" />
      Nonaktif
    </span>
  );
}
