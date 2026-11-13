import { Carrot, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bolehLihatBiaya } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";

import { FormBahan } from "../[id]/form-bahan";

export const metadata: Metadata = { title: "Bahan baru" };
export const dynamic = "force-dynamic";

export default async function HalamanBahanBaru() {
  // Sama dengan ubah bahan: cukup izin halaman bahan.
  const sesi = await wajibIzin("bahan");

  return (
    <Halaman>
      <Link href="/bahan" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Bahan
      </Link>
      <KepalaHalaman
        ikon={Carrot}
        judul="Bahan baru"
        keterangan={
          bolehLihatBiaya(sesi.peran)
            ? "Isi nama, kategori, dan kemasan belinya. Harga dicatat di halaman bahan setelah disimpan."
            : "Isi nama, kategori, dan kemasan belinya."
        }
      />
      <section className="max-w-2xl kartu p-5">
        <FormBahan
          bahan={{
            id: "",
            name: "",
            category: "",
            brand: null,
            variant: null,
            purchase_qty: null,
            purchase_unit: null,
            usage_qty_per_pack: null,
            usage_unit: null,
            status: "lengkapi",
          }}
        />
      </section>
    </Halaman>
  );
}
