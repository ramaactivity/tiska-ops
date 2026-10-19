import "server-only";

import type { Sesi } from "./auth";
import type { Decimal } from "decimal.js";

import { biayaPaketSistem, hppMenuSistem } from "./biaya-paket";
import { hitungHppPaket } from "./hitung/paket";
import { type HasilUntungDokumen, keputusanPersetujuan, untungDokumen } from "./hitung/untung-dokumen";
import { bacaPengaturanBisnis } from "./pengaturan";
import { bolehLihatBiaya } from "./peran";
import { prisma } from "./prisma";
import { menuTersaji, type SlotPaket } from "./slot-paket";
import { hariBaris, paksBaris, subtotalBaris } from "./uang";

/**
 * Untung makanan satu quotation, dihitung sistem (tanpa gerbang peran).
 * Dipakai saat menyimpan untuk menentukan perlu-tidaknya persetujuan owner;
 * hasilnya TIDAK dikirim ke layar. Halaman memakai untungPenawaran(sesi, …).
 */
export async function untungPenawaranSistem(idPenawaran: bigint): Promise<HasilUntungDokumen> {
  const baris = await prisma.quotation_items.findMany({
    where: { quotation_id: idPenawaran, parent_id: null },
    select: {
      day: true,
      qty: true,
      pax: true,
      price: true,
      is_compliment: true,
      package_id: true,
      other_quotation_items: { select: { menu_id: true, item_name: true } },
    },
  });
  const idPaket = [...new Set(baris.map((b) => b.package_id).filter((x): x is bigint => x !== null))];
  const biaya = idPaket.length ? await biayaPaketSistem(idPaket) : new Map();

  // HPP per porsi per paket — hanya bila SEMUA isi paket sudah ber-HPP.
  const hppPaket = new Map<bigint, ReturnType<typeof hitungHppPaket> | null>();
  for (const [id, b] of biaya) {
    const isi = [...b.item.values()];
    // Paket pilihan per kategori (D-082) tanpa isi tetap: HPP belum diketahui, bukan Rp0.
    hppPaket.set(id, isi.length === 0 || isi.some((x) => !x.hpp) ? null : hitungHppPaket(isi.map((x) => x.hpp), b.kemasan));
  }

  // Baris paket yang SEMUA sub-itemnya bermenu dinilai dari menu yang benar-
  // benar disajikan (isi ditukar/dihapus ikut terhitung, D-040); sama persis
  // dengan HPP paket bila isinya tidak diubah. Baris lama tanpa menu memakai
  // HPP paket.
  const dariIsi = (b: (typeof baris)[number]) =>
    b.package_id !== null && b.other_quotation_items.length > 0 && b.other_quotation_items.every((a) => a.menu_id !== null);
  const menuDiPaket = (idPaket: bigint, idMenu: bigint) =>
    [...(biaya.get(idPaket)?.item.values() ?? [])].find((x) => x.menuId === idMenu);
  const idLuar = [
    ...new Set(
      baris
        .filter(dariIsi)
        .flatMap((b) => b.other_quotation_items.map((a) => a.menu_id!).filter((m) => !menuDiPaket(b.package_id!, m))),
    ),
  ];
  const hppLuar = idLuar.length ? await hppMenuSistem(idLuar) : new Map<bigint, Decimal | null>();
  const hppIsi = (b: (typeof baris)[number]) => {
    const hpp = b.other_quotation_items.map((a) => menuDiPaket(b.package_id!, a.menu_id!)?.hpp ?? hppLuar.get(a.menu_id!) ?? null);
    return hpp.some((x) => !x) ? null : hitungHppPaket(hpp as Decimal[], biaya.get(b.package_id!)?.kemasan ?? 0);
  };

  // Paket pilihan per kategori (D-086): HPP = menu yang dipilih (+ yang termasuk) + kemasan.
  const slotRows = idPaket.length
    ? await prisma.package_slots.findMany({
        where: { package_id: { in: idPaket } },
        orderBy: { sort: "asc" },
        select: { package_id: true, label: true, pick: true, extra: true, package_slot_options: { orderBy: { sort: "asc" }, select: { name: true, menu_id: true } } },
      })
    : [];
  const slotPaket = new Map<bigint, SlotPaket[]>();
  for (const r of slotRows) {
    const daftar = slotPaket.get(r.package_id) ?? [];
    daftar.push({ label: r.label, pilih: r.pick, tambahan: r.extra, catatan: null, opsi: r.package_slot_options.map((o) => ({ nama: o.name, hargaTambahan: null, menuId: o.menu_id?.toString() ?? null })) });
    slotPaket.set(r.package_id, daftar);
  }
  const pilihan = (b: (typeof baris)[number]) =>
    b.package_id !== null && slotPaket.has(b.package_id) && (biaya.get(b.package_id)?.item.size ?? 0) === 0;
  const menuPilihan = new Map(
    baris.filter(pilihan).map((b) => [b, menuTersaji(b.other_quotation_items.map((a) => ({ nama: a.item_name, menuId: a.menu_id?.toString() ?? null })), slotPaket.get(b.package_id!)!)] as const),
  );
  const idMenuPilihan = [...new Set([...menuPilihan.values()].flatMap((m) => m ?? []))].map((x) => BigInt(x));
  const hppMenuPilihan = idMenuPilihan.length ? await hppMenuSistem(idMenuPilihan) : new Map<bigint, Decimal | null>();
  const hppPilihan = (b: (typeof baris)[number]) => {
    const menu = menuPilihan.get(b);
    if (!menu) return null;
    const hpp = menu.map((m) => hppMenuPilihan.get(BigInt(m)) ?? null);
    return hpp.some((x) => !x) ? null : hitungHppPaket(hpp as Decimal[], biaya.get(b.package_id!)?.kemasan ?? 0);
  };

  const atur = await bacaPengaturanBisnis();
  return untungDokumen(
    baris.map((b) => {
      const item = { day: b.day.toString(), qty: b.qty.toString(), pax: b.pax, price: b.price.toString(), is_compliment: b.is_compliment };
      return {
        nilai: subtotalBaris(item),
        porsi: hariBaris(item).times(item.qty).times(paksBaris(item)),
        hppPorsi: b.package_id === null ? undefined : pilihan(b) ? hppPilihan(b) : dariIsi(b) ? hppIsi(b) : (hppPaket.get(b.package_id) ?? null),
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
