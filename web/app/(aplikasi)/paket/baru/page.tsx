import { ChevronLeft, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { bolehUbahPaket } from "@/lib/peran";
import { wajibIzin } from "@/lib/rbac";

import { FormPaket } from "../[id]/form-paket";
import { pilihanFormPaket } from "../pilihan-form";

export const metadata: Metadata = { title: "Paket baru" };
export const dynamic = "force-dynamic";

export default async function HalamanPaketBaru() {
  const sesi = await wajibIzin("paket");
  if (!bolehUbahPaket(sesi.peran)) redirect("/paket?akses=ditolak");
  const [menu, bentuk, lini] = await pilihanFormPaket();

  return (
    <Halaman>
      <Link href="/paket" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Paket
      </Link>
      <KepalaHalaman ikon={PackageOpen} judul="Paket baru" keterangan="Isi nama, harga jual per porsi, dan menu di dalamnya. HPP & untung dihitung setelah disimpan." />
      <section className="kartu p-5">
        <FormPaket
          paket={{ id: "", name: "", line: null, price: null, serviceFormId: null, status: "aktif", notes: null }}
          isi={[{ menuId: "", note: "" }]}
          menu={menu}
          bentuk={bentuk}
          lini={lini}
        />
      </section>
    </Halaman>
  );
}
