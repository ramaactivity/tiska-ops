import "server-only";

import type { Sesi } from "./auth";
import { biayaPaketSistem } from "./biaya-paket";
import { hitungHppPaket } from "./hitung/paket";
import { type HasilUntungDokumen, keputusanPersetujuan, untungDokumen } from "./hitung/untung-dokumen";
import { bacaPengaturanBisnis } from "./pengaturan";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";
import { hariBaris, paksBaris, subtotalBaris } from "./uang";

/**
 * Untung makanan satu quotation, dihitung sistem (tanpa gerbang peran).
 * Dipakai saat menyimpan untuk menentukan perlu-tidaknya persetujuan owner;
 * hasilnya TIDAK dikirim ke layar. Halaman memakai untungPenawaran(sesi, …).
 */
export async function untungPenawaranSistem(idPenawaran: bigint): Promise<HasilUntungDokumen> {
  const baris = await prisma.quotation_items.findMany({
    where: { quotation_id: idPenawaran, parent_id: null },
    select: { day: true, qty: true, pax: true, price: true, is_compliment: true, package_id: true },
  });
  const idPaket = [...new Set(baris.map((b) => b.package_id).filter((x): x is bigint => x !== null))];
  const biaya = idPaket.length ? await biayaPaketSistem(idPaket) : new Map();

  // HPP per porsi per paket — hanya bila SEMUA isi paket sudah ber-HPP.
  const hppPaket = new Map<bigint, ReturnType<typeof hitungHppPaket> | null>();
  for (const [id, b] of biaya) {
    const isi = [...b.item.values()];
    hppPaket.set(id, isi.some((x) => !x.hpp) ? null : hitungHppPaket(isi.map((x) => x.hpp), b.kemasan));
  }

  const atur = await bacaPengaturanBisnis();
  return untungDokumen(
    baris.map((b) => {
      const item = { day: b.day.toString(), qty: b.qty.toString(), pax: b.pax, price: b.price.toString(), is_compliment: b.is_compliment };
      return {
        nilai: subtotalBaris(item),
        porsi: hariBaris(item).times(item.qty).times(paksBaris(item)),
        hppPorsi: b.package_id === null ? undefined : (hppPaket.get(b.package_id) ?? null),
      };
    }),
    { untungAmanPct: atur.untung_aman_pct, untungMinPct: atur.untung_min_pct },
  );
}

/** Versi untuk halaman: hanya owner/finance (D-006). */
export async function untungPenawaran(sesi: Sesi, idPenawaran: bigint): Promise<HasilUntungDokumen> {
  if (!bolehLihatBiaya(sesi.peran)) throw new Error("Peran ini tidak boleh melihat untung.");
  return untungPenawaranSistem(idPenawaran);
}

/**
 * Menilai ulang perlu-tidaknya persetujuan owner setelah quotation disimpan
 * (D-013, D-038). Sistem hanya MENANDAI — tidak memblokir pengiriman; owner
 * menyetujui lewat tombol di halaman quotation.
 */
export async function nilaiPersetujuanOwner(idPenawaran: bigint): Promise<"perlu" | "disetujui" | null> {
  const [q, hasil] = await Promise.all([
    prisma.quotations.findUniqueOrThrow({
      where: { id: idPenawaran },
      select: { owner_approval: true, owner_approved_pct: true },
    }),
    untungPenawaranSistem(idPenawaran),
  ]);
  const status = keputusanPersetujuan(hasil, {
    status: q.owner_approval,
    pctDisetujui: q.owner_approved_pct?.toString() ?? null,
  });
  if (status !== q.owner_approval) {
    await prisma.quotations.update({ where: { id: idPenawaran }, data: { owner_approval: status } });
  }
  return status;
}

/** Owner menyetujui harga quotation pada untung saat ini. */
export async function setujuiHargaOwner(sesi: Sesi, idPenawaran: bigint): Promise<void> {
  const hasil = await untungPenawaran(sesi, idPenawaran);
  await prisma.quotations.update({
    where: { id: idPenawaran },
    data: {
      owner_approval: "disetujui",
      owner_approved_by: BigInt(sesi.id),
      owner_approved_at: new Date(),
      owner_approved_pct: hasil.pct?.toFixed(2) ?? null,
    },
  });
}
