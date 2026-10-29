import { CalendarClock, KeyRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { LABEL_PERAN } from "@/lib/peran";
import { akunDiHpIni } from "@/lib/auth";
import { barangKloter } from "@/lib/delivery-order";
import { prisma } from "@/lib/prisma";
import { teksJumlahBaris } from "@/lib/uang";
import { wajibSesi } from "@/lib/rbac";
import { kalimatSuara, labelHari } from "@/lib/tim";

import { KartuTugas, type TugasTampil } from "./kartu-tugas";
import { StatusSinyal } from "./status-sinyal";

export const metadata: Metadata = { title: "Beranda" };

const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
export const dynamic = "force-dynamic";

/**
 * Beranda (D-052): "Jadwal saya" — kloter yang ditugaskan ke akun ini hari
 * ini s.d. 7 hari ke depan. TIDAK memuat angka uang apa pun: halaman ini
 * dibuka siapa saja yang sudah masuk (captain, driver, dapur) — kecuali jumlah
 * yang harus DITAGIH driver untuk pesanan Ikut Menu Pesta bayar-saat-kirim
 * (D-117; tagihan pembeli, bukan HPP/biaya).
 */
export default async function HalamanBeranda({ searchParams }: PageProps<"/beranda">) {
  const sesi = await wajibSesi();
  const { akses } = await searchParams;
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const mulai = new Date(`${hariIni}T00:00:00Z`);
  const sampai = new Date(mulai.getTime() + 7 * 86_400_000);

  const milik = await prisma.event_assignments.findMany({
    where: { user_id: BigInt(sesi.id), event_kloters: { date: { gte: mulai, lte: sampai }, events: { status: { not: "batal" } } } },
    orderBy: [{ event_kloters: { date: "asc" } }, { event_kloters: { depart_time: "asc" } }],
    include: {
      vehicles: { select: { name: true } },
      event_kloters: {
        include: {
          kloter_tracking: { orderBy: { at: "asc" }, select: { status: true, at: true } },
          basts: { select: { bast_number: true, receiver_name: true } },
          event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } } } },
          // Kloter antar Ikut Menu Pesta (D-117): alamat-alamat pembeli, urut antar.
          retail_orders: {
            where: { status: "aktif" },
            orderBy: [{ stop_no: "asc" }, { id: "asc" }],
            select: {
              id: true,
              recipient_name: true,
              phone: true,
              address: true,
              maps_url: true,
              receive_time: true,
              notes: true,
              payment_mode: true,
              delivered_at: true,
              cod_collected: true,
              invoices: { select: { grand_total: true, paid_amount: true } },
              retail_order_items: { select: { pax: true, retail_program_sets: { select: { title: true, retail_program_set_items: { orderBy: { sort: "asc" }, select: { name: true } } } } } },
            },
          },
          events: {
            select: {
              venue: true,
              address: true,
              maps_url: true,
              pic_name: true,
              pic_phone: true,
              first_date: true,
              customers: { select: { name: true } },
              event_items: { orderBy: { sort: "asc" }, select: { session_date: true, session_time: true, item_name: true, qty: true, unit: true, pax: true, contents: true } },
            },
          },
        },
      },
    },
  });

  // Belum membuat PIN di HP ini → ajak (D-101): besok masuk cukup wajah + PIN.
  const [u, hp] = await Promise.all([prisma.users.findUnique({ where: { id: BigInt(sesi.id) }, select: { pin_hash: true } }), akunDiHpIni()]);
  const ajakPin = !u?.pin_hash || !hp.includes(sesi.id);

  const tgl = (t: Date) => t.toISOString().slice(0, 10);
  const barisOrder = (i: { item_name: string; qty: Prisma.Decimal; pax: number | null; unit: string | null; contents: string | null }) => ({
    nama: i.item_name,
    jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
    isi: i.contents ? i.contents.split("\n") : [],
  });
  const tugas: TugasTampil[] = milik.map((a) => {
    const k = a.event_kloters;
    const e = k.events;
    const tanggal = tgl(k.date);
    const retail = k.program_id !== null;
    const tujuan = retail ? `Antar Ikut Menu Pesta · ${k.retail_orders.length} alamat` : (e.venue ?? e.customers.name);
    const diTanggal = e.event_items.filter((i) => (i.session_date ? tgl(i.session_date) : e.first_date ? tgl(e.first_date) : tanggal) === tanggal);
    return {
      id: a.id.toString(),
      kloterId: k.id.toString(),
      lacak: k.kloter_tracking.map((x) => ({ status: x.status, jam: jamWib.format(x.at) })),
      hari: labelHari(tanggal, hariIni),
      jam: k.depart_time,
      catatan: k.note,
      peran: a.role,
      kendaraan: a.vehicles?.name ?? null,
      tugas: a.task_note,
      tujuan,
      alamat: retail ? null : e.address,
      maps: retail ? null : e.maps_url,
      pic: retail ? null : e.pic_name,
      hpPic: retail ? null : e.pic_phone,
      order: retail ? [] : diTanggal.map(barisOrder),
      // BAST (D-103): barang = isi Delivery Order kloter ini (sama dengan yang disalin server).
      barangBast: retail ? [] : barangKloter(diTanggal, k.depart_time).map(barisOrder),
      antar: retail
        ? k.retail_orders.map((o, i) => ({
            id: o.id.toString(),
            no: i + 1,
            nama: o.recipient_name,
            hp: o.phone,
            alamat: o.address,
            maps: o.maps_url,
            jam: o.receive_time,
            catatan: o.notes,
            paket: o.retail_order_items.map((x) => ({ nama: `${x.retail_program_sets.title} = ${x.pax} PAX`, isi: x.retail_program_sets.retail_program_set_items.map((m) => m.name) })),
            tagih: o.payment_mode === "cod" && o.invoices ? Math.max(0, Number(o.invoices.grand_total) - Number(o.invoices.paid_amount)) : null,
            diantar: o.delivered_at ? jamWib.format(o.delivered_at) : null,
            tunai: o.cod_collected !== null,
          }))
        : null,
      bast: k.basts ? { nomor: k.basts.bast_number, penerima: k.basts.receiver_name } : null,
      tim: k.event_assignments.map((x) => ({ id: x.id.toString(), nama: x.users?.name ?? x.person_name ?? "?", siap: Boolean(x.confirmed_at) })),
      siap: Boolean(a.confirmed_at),
      captain: a.role === "captain",
      suara: kalimatSuara({ tanggal, hariIni, jam: k.depart_time, kendaraan: a.vehicles?.name ?? null, tugas: a.task_note, tujuan, peran: a.role }),
    };
  });

  return (
    <Halaman>
      <div className="mx-auto w-full max-w-[480px]">
        <KepalaHalaman ikon={CalendarClock} judul={`Halo, ${sesi.nama}`} keterangan={LABEL_PERAN[sesi.peran]} />
        <PemberitahuanAkses ditolak={akses === "ditolak"} />
        {ajakPin ? (
          <Link href="/pin" className="mb-3 flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-4 text-base shadow-sm">
            <KeyRound className="size-6 shrink-0 text-primary" />
            <span>
              <b>Biar masuk gampang:</b> buat PIN di HP ini. Besok cukup pilih wajah + tekan PIN.
            </span>
          </Link>
        ) : null}
        <StatusSinyal diperbarui={new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date())} />
        {tugas.length ? (
          <div className="mt-2 flex flex-col gap-4">
            <h2 className="text-base font-semibold">Jadwal saya</h2>
            {tugas.map((t) => (
              <KartuTugas key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[14px] border bg-card">
            <KeadaanKosong judul="Belum ada jadwal untuk 7 hari ke depan" keterangan="Jadwal muncul di sini begitu admin menugaskan kamu di sebuah event." />
          </div>
        )}
      </div>
    </Halaman>
  );
}
