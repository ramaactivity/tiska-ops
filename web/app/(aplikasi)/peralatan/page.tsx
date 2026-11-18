import { Armchair } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { KATEGORI_ALAT } from "@/lib/hitung/peralatan";
import { bolehKelolaUang } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { DaftarAlat } from "./daftar-alat";

export const metadata: Metadata = { title: "Peralatan" };
export const dynamic = "force-dynamic";

const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

/* Peralatan milik sendiri (D-089): Hitung Awal per kategori (bisa dicicil, barang mahal dulu). */
export default async function HalamanPeralatan() {
  const sesi = await wajibIzin("peralatan");
  const [alat, dipakai] = await Promise.all([
    prisma.equipment.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], include: { users: { select: { name: true } } } }),
    // Sedang di luar (keluar, belum kembali).
    prisma.event_equipment.groupBy({ by: ["equipment_id"], where: { status: "keluar", equipment_id: { not: null } }, _sum: { qty: true } }),
  ]);
  const diLuar = new Map(dipakai.map((g) => [g.equipment_id!.toString(), g._sum.qty ?? 0]));
  return (
    <Halaman>
      <KepalaHalaman
        ikon={Armchair}
        judul="Peralatan"
        keterangan="Hitung Awal: isi jumlah milik & yang rusak per kategori — boleh dicicil, barang mahal dulu. Alat dibawa ke event dicatat di halaman event."
      />
      <DaftarAlat
        kategori={[...KATEGORI_ALAT]}
        bolehHarga={bolehKelolaUang(sesi.peran)}
        alat={alat.map((a) => ({
          id: a.id.toString(),
          kategori: a.category,
          nama: a.name,
          satuan: a.unit,
          milik: a.owned_qty,
          rusak: a.damaged_qty,
          diLuar: diLuar.get(a.id.toString()) ?? 0,
          hargaSewa: a.rental_price ? Number(a.rental_price) : null,
          hargaGanti: a.replacement_price ? Number(a.replacement_price) : null,
          disewakan: a.for_rent,
          catatan: a.notes ?? "",
          aktif: a.active,
          dihitung: a.counted_at ? `${a.users?.name ?? ""} · ${waktu.format(a.counted_at)}` : null,
        }))}
      />
    </Halaman>
  );
}
