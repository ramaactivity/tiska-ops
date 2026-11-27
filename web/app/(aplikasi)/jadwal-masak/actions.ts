"use server";

import { z } from "zod";

import { jadwalTanggal, KUNCI_GABUNGAN } from "@/lib/jadwal-masak";
import { pesananDapur } from "@/lib/pesanan-dapur";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";
import { drafGabungan, drafRencana, IsiRencana, type SidikGabungan, sidikPesanan } from "@/lib/rencana-masak";

/* Jadwal Masak (docs/24 M1): simpan & draf jadwal produksi per pesanan per tanggal. Izin "jadwal-masak". */

const Kunci = z.string().regex(/^[a-z0-9-]{1,40}$/);
const Tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pesanan = async (kunci: string, tanggal: string) =>
  (await pesananDapur(tanggal, null)).find((o) => o.id === kunci) ?? null;

/**
 * Simpan seluruh jadwal satu pesanan pada satu tanggal (ditimpa utuh) + sidik pesanan saat ini, sehingga tanda
 * "Pesanan berubah" hilang. Jadwal kosong = baris dihapus.
 */
export async function simpanJadwal(kunci: string, tanggal: string, isi: IsiRencana) {
  const oleh = BigInt((await pastikanIzin("jadwal-masak")).id);
  const k = Kunci.parse(kunci);
  const t = Tanggal.parse(tanggal);
  const r = IsiRencana.safeParse(isi);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Isi jadwal tidak sah.");
  const date = new Date(`${t}T00:00:00Z`);
  if (!r.data.sesi.length && !r.data.judul && !r.data.catatan) {
    await prisma.production_plans.deleteMany({ where: { order_key: k, date } });
    return;
  }
  // Jadwal gabungan: sidik = semua pesanan tanggal itu yang belum punya jadwal sendiri.
  if (k === KUNCI_GABUNGAN) {
    const { calon } = (await jadwalTanggal(t)).gabungan;
    const sidik: SidikGabungan = { gabungan: calon.map((o) => ({ kunci: o.id, nama: o.nama, sidik: sidikPesanan(o) })) };
    const data = {
      title: r.data.judul || null,
      notes: r.data.catatan || null,
      sessions: r.data.sesi,
      updated_by: oleh,
      updated_at: new Date(),
      order_name: "Jadwal gabungan",
      order_snapshot: sidik,
    };
    await prisma.production_plans.upsert({
      where: { order_key_date: { order_key: k, date } },
      create: { order_key: k, date, ...data },
      update: data,
    });
    return;
  }
  const o = await pesanan(k, t);
  const data = {
    title: r.data.judul || null,
    notes: r.data.catatan || null,
    sessions: r.data.sesi,
    updated_by: oleh,
    updated_at: new Date(),
    // Pesanan yang sudah hilang tetap boleh disimpan (mis. dikosongkan sebagian); nama & sidik lama dipertahankan.
    ...(o ? { order_name: o.nama, order_snapshot: sidikPesanan(o) } : {}),
  };
  await prisma.production_plans.upsert({
    where: { order_key_date: { order_key: k, date } },
    create: { order_key: k, date, ...data },
    update: data,
  });
}

/** Draf dari isi pesanan (belum disimpan — operator menggeser dulu). */
export async function drafJadwal(kunci: string, tanggal: string): Promise<IsiRencana> {
  await pastikanIzin("jadwal-masak");
  if (kunci === KUNCI_GABUNGAN) {
    const { calon } = (await jadwalTanggal(Tanggal.parse(tanggal))).gabungan;
    if (!calon.length) throw new Error("Tidak ada pesanan tanpa jadwal di tanggal ini.");
    return drafGabungan(calon);
  }
  const o = await pesanan(Kunci.parse(kunci), Tanggal.parse(tanggal));
  if (!o) throw new Error("Pesanan ini tidak ada di tanggal tersebut.");
  return drafRencana([o]);
}
