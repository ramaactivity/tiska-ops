"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { cekPesanan, rapikanHp } from "@/lib/hitung/ikut-menu-pesta";
import type { PesanPush } from "@/lib/hitung/notifikasi";
import { kodePelangganBerikutnya, nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { aksesPenuh } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { pastikanIzin } from "@/lib/rbac";
import { hitungTotalDokumen } from "@/lib/uang";

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

  const p = await prisma.retail_programs.findUnique({
    where: { id: BigInt(d.idProgram) },
    select: {
      id: true,
      name: true,
      status: true,
      price_per_pax: true,
      min_pax: true,
      max_pax: true,
      area: true,
      order_deadline: true,
      delivery_date: true,
      retail_program_sets: { select: { id: true, title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } },
      retail_orders: { where: { status: "aktif" }, select: { retail_order_items: { select: { pax: true } } } },
    },
  });
  if (!p) return { ok: false, pesan: "Program tidak ditemukan." };
  if (p.status !== "disetujui") return { ok: false, pesan: "Pesanan hanya bisa dicatat untuk program yang sudah disetujui." };

  const paket = d.paket.filter((x) => x.pax > 0);
  const sah = new Map(p.retail_program_sets.map((s) => [s.id.toString(), s]));
  if (paket.some((x) => !sah.has(x.idSet))) return { ok: false, pesan: "Paket tidak dikenal. Muat ulang halaman." };
  const terpakai = p.retail_orders.flatMap((o) => o.retail_order_items).reduce((a, i) => a + i.pax, 0);
  const salah = cekPesanan({ pax: d.paket.map((x) => x.pax), minPax: p.min_pax, maksPax: p.max_pax, paxTerpakai: terpakai });
  if (salah) return { ok: false, pesan: salah };

  const angka = await bacaPengaturanBisnis();
  const harga = Number(p.price_per_pax);
  const ongkir = d.luarArea ? d.ongkir : 0; // area program gratis kirim (Bogor)
  const total = hitungTotalDokumen({
    items: paket.map((x) => ({ qty: 1, pax: x.pax, price: harga, charge_pb1: true, charge_service: false })),
    pb1_enabled: true,
    pb1_percent: angka.pbjt_pct,
    delivery_amount: ongkir,
  });
  const telat = Date.now() > p.order_deadline.getTime();
  const hariIni = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())}T00:00:00Z`);
  const hp = rapikanHp(d.hp);

  const id = await prisma.$transaction(async (tx) => {
    // Pembeli langganan dikenali lewat nomor HP — tidak dibuat dobel.
    const ada = await tx.$queryRawUnsafe<{ id: bigint }[]>(
      `SELECT id FROM customers WHERE regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^62', '0') = $1 ORDER BY id`,
      hp,
    );
    const idCustomer =
      ada[0]?.id ??
      (
        await simpanDenganKodeUnik(
          () => kodePelangganBerikutnya(tx),
          (kode) =>
            tx.customers.create({
              data: { customer_code: kode, name: d.nama, phone: d.hp, address: d.alamat, status: "active", created_by: BigInt(sesi.id), created_at: new Date(), updated_at: new Date() },
              select: { id: true },
            }),
        )
      ).id;

    const invoice = await simpanDenganKodeUnik(
      () => nomorTiskaBerikutnya("invoices", "invoice_number", "INV", tx),
      (nomor) =>
        tx.invoices.create({
          data: {
            invoice_number: nomor,
            customer_id: idCustomer,
            invoice_date: hariIni,
            due_date: p.delivery_date,
            status: "unpaid",
            paid_amount: "0",
            order_type: "retail",
            notes: p.name,
            contact_person: d.nama,
            contact_phone: d.hp,
            venue: d.alamat,
            event_date: p.delivery_date,
            event_time: d.jam || null,
            subtotal: total.subtotal.toString(),
            service_charge_amount: "0",
            pb1_enabled: true,
            pb1_percent: angka.pbjt_pct,
            pb1_amount: total.pb1_amount.toString(),
            delivery_amount: total.delivery_amount.toString(),
            grand_total: total.grand_total.toString(),
            created_by: BigInt(sesi.id),
            created_at: new Date(),
            updated_at: new Date(),
          },
          select: { id: true },
        }),
    );
    for (const x of paket) {
      const s = sah.get(x.idSet)!;
      const induk = await tx.invoice_items.create({
        data: {
          invoice_id: invoice.id,
          item_name: `Ikut Menu Pesta — ${s.title}`,
          unit: "pax",
          qty: 1,
          pax: x.pax,
          price: harga,
          subtotal: harga * x.pax,
          charge_service: false,
          charge_pb1: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: { id: true },
      });
      await tx.invoice_items.createMany({
        data: s.retail_program_set_items.map((i) => ({
          invoice_id: invoice.id,
          parent_id: induk.id,
          item_name: i.name,
          qty: 0,
          price: 0,
          subtotal: 0,
          charge_service: false,
          charge_pb1: false,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    await tx.invoice_event_dates.create({ data: { invoice_id: invoice.id, event_date: p.delivery_date, created_at: new Date(), updated_at: new Date() } });

    const o = await tx.retail_orders.create({
      data: {
        program_id: p.id,
        customer_id: idCustomer,
        invoice_id: invoice.id,
        recipient_name: d.nama,
        phone: d.hp,
        address: d.alamat,
        maps_url: d.maps || null,
        receive_time: d.jam || null,
        notes: d.catatan || null,
        source: d.asal,
        payment_mode: d.bayar,
        is_late: telat,
        outside_area: d.luarArea,
        area_status: d.luarArea ? "menunggu" : null,
        delivery_fee: ongkir,
        created_by: BigInt(sesi.id),
        retail_order_items: { create: paket.map((x) => ({ set_id: BigInt(x.idSet), pax: x.pax, price: harga })) },
      },
      select: { id: true },
    });
    return o.id;
  });

  if (d.luarArea) {
    const pesan: PesanPush = { judul: "Pesanan luar Bogor perlu persetujuan", isi: `${d.nama} — ${p.name}`, url: `/ikut-menu-pesta/${p.id}`, tag: `area-${id}` };
    kirimNanti(["owner"], pesan);
  }
  revalidatePath(`/ikut-menu-pesta/${p.id}`);
  return { ok: true, id: id.toString(), telat };
}

/** Kirim ke luar area program: diputuskan Mba Ari (Ibu Rita, owner) — akses penuh (jawaban tim #7). */
export async function putuskanLuarArea(idPesanan: string, setuju: boolean): Promise<{ ok: boolean; pesan?: string }> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!aksesPenuh(sesi.peran)) return { ok: false, pesan: "Kirim ke luar area diputuskan owner (Mba Ari)." };
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

/* ---------- Tahap C: pesanan → kloter antar (D-117) ---------- */

/** Masukkan pesanan ke kloter antar program (atau keluarkan: null). Luar area wajib disetujui dulu. Urutan antar = paling belakang. */
export async function aturKloterPesanan(idPesanan: string, idKloter: string | null): Promise<{ ok: boolean; pesan?: string }> {
  await pastikanIzin("ikut-menu-pesta");
  if (!/^\d+$/.test(idPesanan) || (idKloter !== null && !/^\d+$/.test(idKloter))) return { ok: false, pesan: "Permintaan tidak sah." };
  const o = await prisma.retail_orders.findUnique({ where: { id: BigInt(idPesanan) }, select: { id: true, program_id: true, status: true, area_status: true, delivered_at: true } });
  if (!o || o.status !== "aktif") return { ok: false, pesan: "Pesanan tidak ditemukan atau sudah batal." };
  if (o.delivered_at) return { ok: false, pesan: "Pesanan ini sudah diantar." };
  if (idKloter && o.area_status && o.area_status !== "disetujui") return { ok: false, pesan: "Kirim luar area belum disetujui Mba Ari." };
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
