import { DatabaseZap } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { adaSambunganLama, bacaDataLama, isiSekarang, PINDAH_DATA_SELESAI } from "@/lib/pindah-data-lama";
import { cariKembar, KOLOM_USER, saranPenandatangan, saranUser } from "@/lib/pindah-data-rencana";
import { prisma } from "@/lib/prisma";
import { wajibPeran } from "@/lib/rbac";

import { WizardPindah } from "./wizard-pindah";

export const metadata: Metadata = { title: "Pindah data lama" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function HalamanPindahData() {
  await wajibPeran();

  if (PINDAH_DATA_SELESAI) {
    return (
      <Halaman>
        <KepalaHalaman
          ikon={DatabaseZap}
          judul="Pindah data lama"
          keterangan={`Sudah selesai pada ${PINDAH_DATA_SELESAI}. Semua data dari aplikasi lama sudah ada di Tiska Ops, jadi fitur ini dikunci supaya data asli tidak terhapus.`}
        />
      </Halaman>
    );
  }

  if (!adaSambunganLama()) {
    return (
      <Halaman>
        <KepalaHalaman ikon={DatabaseZap} judul="Pindah data lama" keterangan="Alamat database aplikasi lama (LAMA_DATABASE_URL) belum dipasang di server." />
      </Halaman>
    );
  }

  const [lama, sekarang, userBaru, ttdBaru] = await Promise.all([
    bacaDataLama(),
    isiSekarang(),
    prisma.users.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true, role: true },
    }),
    prisma.signatories.findMany({
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, signature_path: true },
    }),
  ]);

  const s = (v: unknown) => String(v ?? "");
  const hitung = (rows: Record<string, unknown>[], kol: string) => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r[kol] != null) m[s(r[kol])] = (m[s(r[kol])] ?? 0) + 1;
    return m;
  };
  // Semua akun lama yang dirujuk (pembuat, pembatal, finalisasi margin) wajib dicocokkan.
  const dokUser: Record<string, number> = {};
  for (const [t, kolom] of Object.entries(KOLOM_USER) as [keyof typeof KOLOM_USER, string[]][]) {
    for (const kol of kolom) for (const [id, n] of Object.entries(hitung(lama[t], kol))) dokUser[id] = (dokUser[id] ?? 0) + n;
  }
  const dokTtd = hitung([...lama.quotations, ...lama.invoices], "signatory_id");
  const dokCust = hitung([...lama.quotations, ...lama.invoices], "customer_id");
  const ub = userBaru.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    username: u.username,
  }));
  const tb = ttdBaru.map((t) => ({
    id: t.id.toString(),
    name: t.name,
    adaGambar: Boolean(t.signature_path),
  }));
  // Sudah pernah dipindah = ada customer lama (kode DAN nama sama) di sini. Kode saja tidak cukup:
  // kedua aplikasi sama-sama menomori CUST-0001, CUST-0002, … sehingga data uji coba ikut "cocok".
  const namaLama = new Map(lama.customers.map((c) => [s(c.customer_code), s(c.name)]));
  const kembar = await prisma.customers.findMany({ where: { customer_code: { in: [...namaLama.keys()] } }, select: { customer_code: true, name: true } });
  const sudahPernah = kembar.some((c) => namaLama.get(c.customer_code) === c.name);

  return (
    <Halaman>
      <KepalaHalaman
        ikon={DatabaseZap}
        judul="Pindah data lama"
        keterangan="Hapus data uji coba, lalu lanjutkan dengan data asli dari Aplikasi Penjualan TC. Aplikasi lama hanya dibaca, tidak diubah."
      />
      <WizardPindah
        sudahPernah={sudahPernah}
        sekarang={sekarang}
        lama={{
          customer: lama.customers.length,
          quotation: lama.quotations.length,
          invoice: lama.invoices.length,
          payment: lama.payments.length,
          totalInvoice: lama.invoices.reduce((a, r) => a + Number(r.grand_total ?? 0), 0),
          totalPayment: lama.payments.reduce((a, r) => a + Number(r.total_amount ?? 0), 0),
        }}
        userLama={lama.users
          .filter((u) => dokUser[s(u.id)])
          .map((u) => ({
            id: s(u.id),
            nama: s(u.name),
            username: s(u.username),
            dok: dokUser[s(u.id)],
            saran: saranUser(u, ub),
          }))}
        userBaru={userBaru.map((u) => ({
          id: u.id.toString(),
          label: u.name,
          sub: `${u.username} · ${u.role}`,
        }))}
        ttdLama={lama.signatories
          .filter((t) => dokTtd[s(t.id)])
          .map((t) => ({
            id: s(t.id),
            nama: s(t.name),
            dok: dokTtd[s(t.id)],
            saran: saranPenandatangan(t, tb),
          }))}
        ttdBaru={tb}
        customer={lama.customers.map((c) => ({
          id: s(c.id),
          nama: s(c.name),
          hp: s(c.phone),
          dok: dokCust[s(c.id)] ?? 0,
        }))}
        kembar={cariKembar(lama.customers, dokCust)}
      />
    </Halaman>
  );
}
