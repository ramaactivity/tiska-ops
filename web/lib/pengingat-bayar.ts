import "server-only";

import { keadaanTagihan, type KeadaanTagihan, sisaHari } from "./hitung/pengingat-bayar";
import { bacaIzin } from "./izin";
import { bolehBuka } from "./navigasi";
import type { Peran } from "./peran";
import { prisma } from "./prisma";

/* Pengingat Bayar (D-128) — pembacaan untuk halaman & cron pagi. */

export type TagihanTampil = {
  id: string;
  nama: string;
  kategori: string;
  nominal: number | null;
  ulangi: number | null;
  jatuhTempo: string;
  sisa: number;
  keadaan: KeadaanTagihan;
  ingatkan: number;
  pic: string | null;
  status: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function daftarTagihan(status: "aktif" | "lain", hariIni: string): Promise<TagihanTampil[]> {
  const b = await prisma.bills.findMany({
    where: status === "aktif" ? { status: "aktif" } : { status: { in: ["selesai", "berhenti"] } },
    orderBy: status === "aktif" ? [{ next_due: "asc" }, { id: "asc" }] : [{ updated_at: "desc" }],
    take: status === "aktif" ? undefined : 100,
    select: { id: true, name: true, category: true, amount: true, repeat_months: true, next_due: true, remind_days: true, status: true, users_bills_pic_user_idTousers: { select: { name: true } } },
  });
  return b.map((x) => {
    const sisa = sisaHari(iso(x.next_due), hariIni);
    return {
      id: x.id.toString(),
      nama: x.name,
      kategori: x.category,
      nominal: x.amount === null ? null : Number(x.amount),
      ulangi: x.repeat_months,
      jatuhTempo: iso(x.next_due),
      sisa,
      keadaan: keadaanTagihan(sisa, x.remind_days),
      ingatkan: x.remind_days,
      pic: x.users_bills_pic_user_idTousers?.name ?? null,
      status: x.status,
    };
  });
}

/** PIC = akun aktif yang perannya boleh membuka Pengingat Bayar (owner/admin selalu). */
export async function opsiPic() {
  const izin = await bacaIzin();
  const u = await prisma.users.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } });
  return u.filter((x) => bolehBuka(x.role as Peran, "pengingat-bayar", izin)).map((x) => ({ id: x.id.toString(), label: x.name }));
}
