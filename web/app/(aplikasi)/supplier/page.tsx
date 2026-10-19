import { Store } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormSupplier } from "./form-supplier";

export const metadata: Metadata = { title: "Supplier" };
export const dynamic = "force-dynamic";

/* Master supplier tempo (D-083). Tempo 0 hari = bayar saat barang diterima. */
export default async function HalamanSupplier() {
  await wajibIzin("supplier");
  const daftar = await prisma.suppliers.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <Halaman>
      <KepalaHalaman ikon={Store} judul="Supplier" keterangan="Dipilih saat membuat PO. Tempo bayar menentukan jatuh tempo hutang setiap barang diterima." />
      <div className="flex flex-col gap-4">
        <section className="rounded-[14px] border bg-card p-5">
          <h2 className="eyebrow pb-3">Tambah supplier</h2>
          <FormSupplier />
        </section>
        {daftar.map((s) => (
          <section key={s.id.toString()} className="rounded-[14px] border bg-card p-5">
            <FormSupplier
              s={{
                id: s.id.toString(),
                name: s.name,
                category: s.category ?? "",
                contact_name: s.contact_name ?? "",
                phone: s.phone ?? "",
                payment_term_days: s.payment_term_days,
                bank_account: s.bank_account ?? "",
                notes: s.notes ?? "",
                active: s.active,
              }}
            />
          </section>
        ))}
      </div>
    </Halaman>
  );
}
