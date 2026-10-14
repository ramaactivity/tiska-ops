import "server-only";

import type { Decimal } from "decimal.js";

import type { Sesi } from "./auth";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";

/**
 * HPP item (hpp_snapshot) dan biaya kemasan per paket.
 *
 * SATU-SATUNYA jalan membaca biaya paket; menolak sendiri bila pemanggil
 * tidak boleh melihat biaya (D-006). Halaman paket memuat isi paket TANPA
 * kolom biaya, lalu memanggil ini hanya untuk owner/finance.
 */
export async function biayaPaket(
  sesi: Sesi,
  idPaket: bigint[],
): Promise<Map<bigint, { kemasan: Decimal | null; item: Map<bigint, Decimal | null> }>> {
  if (!bolehLihatBiaya(sesi.peran)) throw new Error("Peran ini tidak boleh melihat biaya paket.");
  const paket = await prisma.packages.findMany({
    where: { id: { in: idPaket } },
    select: {
      id: true,
      service_forms: { select: { packaging_cost: true } },
      package_items: { select: { id: true, hpp_snapshot: true } },
    },
  });
  return new Map(
    paket.map((p) => [
      p.id,
      {
        kemasan: p.service_forms?.packaging_cost ?? null,
        item: new Map(p.package_items.map((i) => [i.id, i.hpp_snapshot])),
      },
    ]),
  );
}
