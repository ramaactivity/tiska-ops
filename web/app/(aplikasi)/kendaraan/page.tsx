import { Car } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormKendaraan } from "./form-kendaraan";

export const metadata: Metadata = { title: "Kendaraan" };
export const dynamic = "force-dynamic";

/* Master kendaraan untuk penugasan kloter (D-051). Owner/admin. */
export default async function HalamanKendaraan() {
  await wajibIzin("kendaraan");
  const daftar = await prisma.vehicles.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <Halaman>
      <KepalaHalaman ikon={Car} judul="Kendaraan" keterangan="Dipilih saat menugaskan driver di kloter event." />
      <div className="flex flex-col gap-4">
        <section className="kartu p-5">
          <h2 className="eyebrow pb-3">Tambah kendaraan</h2>
          <FormKendaraan />
        </section>
        {daftar.map((k) => (
          <section key={k.id.toString()} className="kartu p-5">
            <FormKendaraan k={{ id: k.id.toString(), name: k.name, plate: k.plate ?? "", capacity_note: k.capacity_note ?? "", active: k.active }} />
          </section>
        ))}
      </div>
    </Halaman>
  );
}
