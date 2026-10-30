"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { rapikanHp } from "@/lib/hitung/ikut-menu-pesta";
import type { PesanPush } from "@/lib/hitung/notifikasi";
import { catatPesanan } from "@/lib/ikut-menu-pesta";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { aksesPenuh } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { pastikanIzin } from "@/lib/rbac";

/* Pesanan Ikut Menu Pesta (Tahap B, D-116): satu pesanan = satu customer + satu invoice retail. */

const SKEMA = z.object({
  idProgram: z.string().regex(/^\d+$/),
  nama: z.string().trim().min(2, "Nama pembeli belum diisi.").max(150),
  hp: z
    .string()
    .trim()
    .refine((h) => rapikanHp(h).length >= 9, "Nomor HP/WA belum benar."),
  alamat: z.string().trim().min(5, "Alamat kirim belum diisi."),
  maps: z.string().trim().max(500).nullish(),
  jam: z.string().trim().max(20).nullish(),
  catatan: z.string().trim().max(1000).nullish(),
  asal: z.enum(["wa", "ig", "langganan", "teman", "lainnya"]),
  bayar: z.enum(["transfer", "cod"]),
  luarArea: z.boolean(),
  ongkir: z.number().int().min(0),
  paket: z.array(z.object({ idSet: z.string().regex(/^\d+$/), pax: z.number().int().min(0) })).min(1),
});
export type InputPesanan = z.input<typeof SKEMA>;

type Hasil = { ok: true; id: string; telat: boolean } | { ok: false; pesan: string };

export async function simpanPesanan(input: InputPesanan): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  const cek = SKEMA.safeParse(input);
  if (!cek.success) return { ok: false, pesan: cek.error.issues[0].message };
  const d = cek.data;

  const r = await catatPesanan(d, BigInt(sesi.id));
  if (!r.ok) return r;
  const { id, p, telat } = r;

  if (d.luarArea) {
    const pesan: PesanPush = { judul: "Pesanan luar Bogor perlu persetujuan", isi: `${d.nama} — ${p.name}`, url: `/ikut-menu-pesta/${p.id}`, tag: `area-${id}` };
    kirimNanti(["owner"], pesan);
  }
  revalidatePath(`/ikut-menu-pesta/${p.id}`);
  return { ok: true, id: id.toString(), telat };
}

/** Kirim ke luar area program: diputuskan Mbak Ari (Rita Ariyani, owner) — akses penuh (jawaban tim #7). */
export async function putuskanLuarArea(idPesanan: string, setuju: boolean): Promise<{ ok: boolean; pesan?: string }> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Kirim ke luar area diputuskan owner (Mbak Ari)." };
  if (!/^\d+$/.test(idPesanan)) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(idPesanan) }, select: { program_id: true, area_status: true } });
  if (!o || o.area_status !== "menunggu") return { ok: false, pesan: "Pesanan ini tidak menunggu persetujuan." };
  await prisma.retail_orders.update({
    where: { id: BigInt(idPesanan) },
    data: { area_status: setuju ? "disetujui" : "ditolak", area_decided_by: BigInt(sesi.id), area_decided_at: new Date(), updated_at: new Date() },
  });
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
  return { ok: true };
}

/** Batalkan pesanan + invoice-nya (alasan wajib; invoice yang sudah dibayar harus dihapus payment-nya dulu). */
export async function batalkanPesanan(idPesanan: string, alasan: string): Promise<{ ok: boolean; pesan?: string }> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  const baca = bacaAlasanPembatalan(alasan);
  if (!baca.ok) return { ok: false, pesan: baca.pesan };
  if (!/^\d+$/.test(idPesanan)) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({
    where: { id: BigInt(idPesanan) },
    select: { program_id: true, status: true, invoice_id: true, invoices: { select: { paid_amount: true } } },
  });
  if (!o || o.status !== "aktif") return { ok: false, pesan: "Pesanan tidak ditemukan atau sudah batal." };
  if (o.invoices && Number(o.invoices.paid_amount) > 0) return { ok: false, pesan: "Pesanan ini sudah dibayar. Hapus payment-nya dulu di menu Payment." };
  await prisma.$transaction([
    prisma.retail_orders.update({ where: { id: BigInt(idPesanan) }, data: { status: "batal", cancel_reason: baca.alasan, updated_at: new Date() } }),
    ...(o.invoice_id
      ? [
          prisma.invoices.update({
            where: { id: o.invoice_id },
            data: { status: "cancelled", cancel_reason: baca.alasan, cancelled_at: new Date(), cancelled_by: BigInt(sesi.id), updated_at: new Date() },
          }),
        ]
      : []),
  ]);
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
  return { ok: true };
}

/* ---------- Tahap E: pesanan dari form online (D-119) ---------- */

/**
 * Admin sudah menghubungi pembeli → pesanan online dikonfirmasi. Untuk alamat luar area, Delivery Fee
 * diisi di sini (pembeli tidak tahu ongkirnya): ditambahkan paling akhir di invoice, tanpa PBJT (lib/uang).
 */
export async function konfirmasiPesanan(idPesanan: string, ongkir: number | null): Promise<{ ok: boolean; pesan?: string }> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!/^\d+$/.test(idPesanan) || (ongkir !== null && (!Number.isInteger(ongkir) || ongkir < 0))) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({
    where: { id: BigInt(idPesanan) },
    select: { program_id: true, status: true, source: true, confirmed_at: true, outside_area: true, delivery_fee: true, invoice_id: true, invoices: { select: { grand_total: true, paid_amount: true } } },
  });
  if (!o || o.status !== "aktif" || o.source !== "online" || o.confirmed_at) return { ok: false, pesan: "Pesanan ini tidak menunggu konfirmasi." };
  const ubahOngkir = o.outside_area && ongkir !== null && ongkir !== Number(o.delivery_fee) && o.invoice_id && o.invoices;
  if (ubahOngkir && Number(o.invoices!.paid_amount) > 0) return { ok: false, pesan: "Invoice sudah dibayar — Delivery Fee tidak bisa diubah di sini." };
  await prisma.$transaction([
    prisma.retail_orders.update({
      where: { id: BigInt(idPesanan) },
      data: { confirmed_at: new Date(), confirmed_by: BigInt(sesi.id), ...(ubahOngkir ? { delivery_fee: ongkir! } : {}), updated_at: new Date() },
    }),
    ...(ubahOngkir
      ? [
          prisma.invoices.update({
            where: { id: o.invoice_id! },
            data: {
              delivery_amount: ongkir!.toString(),
              grand_total: (Number(o.invoices!.grand_total) - Number(o.delivery_fee) + ongkir!).toString(),
              updated_at: new Date(),
            },
          }),
        ]
      : []),
  ]);
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
  revalidatePath("/ikut-menu-pesta");
  return { ok: true };
}

/* ---------- Tahap C: pesanan → kloter antar (D-117) ---------- */

/** Masukkan pesanan ke kloter antar program (atau keluarkan: null). Luar area wajib disetujui dulu. Urutan antar = paling belakang. */
export async function aturKloterPesanan(idPesanan: string, idKloter: string | null): Promise<{ ok: boolean; pesan?: string }> {
  await pastikanIzin("ikut-menu-pesta");
  if (!/^\d+$/.test(idPesanan) || (idKloter !== null && !/^\d+$/.test(idKloter))) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(idPesanan) }, select: { id: true, program_id: true, status: true, area_status: true, delivered_at: true } });
  if (!o || o.status !== "aktif") return { ok: false, pesan: "Pesanan tidak ditemukan atau sudah batal." };
  if (o.delivered_at) return { ok: false, pesan: "Pesanan ini sudah diantar." };
  if (idKloter && o.area_status && o.area_status !== "disetujui") return { ok: false, pesan: "Kirim luar area belum disetujui Mbak Ari." };
  let urut: number | null = null;
  if (idKloter) {
    const k = await prisma.event_kloters.findUnique({ where: { id: BigInt(idKloter) }, select: { program_id: true } });
    if (!k || k.program_id !== o.program_id) return { ok: false, pesan: "Kloter bukan milik program ini." };
    urut = ((await prisma.retail_orders.aggregate({ where: { kloter_id: BigInt(idKloter) }, _max: { stop_no: true } }))._max.stop_no ?? 0) + 1;
  }
  await prisma.retail_orders.update({ where: { id: o.id }, data: { kloter_id: idKloter ? BigInt(idKloter) : null, stop_no: urut, updated_at: new Date() } });
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
  return { ok: true };
}

/** Geser urutan antar satu langkah (−1 maju, +1 mundur) di dalam kloternya. */
export async function geserUrutan(idPesanan: string, arah: -1 | 1): Promise<{ ok: boolean; pesan?: string }> {
  await pastikanIzin("ikut-menu-pesta");
  if (!/^\d+$/.test(idPesanan)) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(idPesanan) }, select: { program_id: true, kloter_id: true } });
  if (!o?.kloter_id) return { ok: false, pesan: "Pesanan belum masuk kloter." };
  const urut = await prisma.retail_orders.findMany({ where: { kloter_id: o.kloter_id, status: "aktif" }, orderBy: [{ stop_no: "asc" }, { id: "asc" }], select: { id: true } });
  const i = urut.findIndex((x) => x.id === BigInt(idPesanan));
  const j = i + arah;
  if (i < 0 || j < 0 || j >= urut.length) return { ok: true };
  [urut[i], urut[j]] = [urut[j], urut[i]];
  await prisma.$transaction(urut.map((x, n) => prisma.retail_orders.update({ where: { id: x.id }, data: { stop_no: n + 1 } })));
  revalidatePath(`/ikut-menu-pesta/${o.program_id}`);
  return { ok: true };
}
