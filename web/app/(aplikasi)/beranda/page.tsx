import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { LABEL_PERAN } from "@/lib/peran";
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
 * dibuka siapa saja yang sudah masuk (captain, driver, dapur).
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
          event_assignments: { orderBy: { sort: "asc" }, include: { users: { select: { name: true } } } },
          events: {
            select: {
              venue: true,
              address: true,
              maps_url: true,
              pic_name: true,
              pic_phone: true,
              first_date: true,
              customers: { select: { name: true } },
              event_items: { orderBy: { sort: "asc" }, select: { session_date: true, item_name: true, qty: true, unit: true, pax: true, contents: true } },
            },
          },
        },
      },
    },
  });

  const tgl = (t: Date) => t.toISOString().slice(0, 10);
  const tugas: TugasTampil[] = milik.map((a) => {
    const k = a.event_kloters;
    const e = k.events;
    const tanggal = tgl(k.date);
    const tujuan = e.venue ?? e.customers.name;
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
      alamat: e.address,
      maps: e.maps_url,
      pic: e.pic_name,
      hpPic: e.pic_phone,
      order: e.event_items
        .filter((i) => (i.session_date ? tgl(i.session_date) : e.first_date ? tgl(e.first_date) : tanggal) === tanggal)
        .map((i) => ({
          nama: i.item_name,
          jumlah: teksJumlahBaris({ qty: i.qty, pax: i.pax ?? undefined, unit: i.unit || "pax" }).toUpperCase(),
          isi: i.contents ? i.contents.split("\n") : [],
        })),
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
