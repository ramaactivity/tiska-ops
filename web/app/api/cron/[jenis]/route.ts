import { NextResponse } from "next/server";

import { labelPeriode } from "@/lib/hitung/opname";
import { pesanHutangJatuhTempo, pesanJadwalBesok, pesanPengingatOpname, pesanUlangTahun } from "@/lib/hitung/notifikasi";
import { mendatang } from "@/lib/hitung/ulang-tahun";
import { prisma } from "@/lib/prisma";
import { akunBerperan, kirimPush } from "@/lib/push";
import { pengingatOpname } from "@/lib/stok";

/* ==========================================================================
   PENGINGAT TERJADWAL (D-096) — dipanggil Cron Vercel (web/vercel.json),
   dijaga CRON_SECRET (Vercel mengirim "Authorization: Bearer <CRON_SECRET>").
     sore (17.00 WIB): jadwal besok ke tiap anggota kloter yang punya akun
     pagi (06.00 WIB): opname bulan ini belum dimulai/final (tgl 1–3) → gudang;
                       hutang supplier jatuh tempo hari ini / lewat → Finance;
                       ulang tahun hari ini & besok → owner & admin (D-109),
                       kecuali yang berulang tahun (tetap kejutan)
   ========================================================================== */

export const dynamic = "force-dynamic";

const hariIniWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

export async function GET(request: Request, { params }: { params: Promise<{ jenis: string }> }) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || request.headers.get("authorization") !== `Bearer ${rahasia}`) return new NextResponse("Tidak ada akses.", { status: 401 });
  const { jenis } = await params;
  const hariIni = hariIniWib();

  if (jenis === "sore") {
    const besok = new Date(Date.parse(`${hariIni}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const tugas = await prisma.event_assignments.findMany({
      where: { user_id: { not: null }, event_kloters: { date: tgl(besok), events: { status: { not: "batal" } } } },
      select: { user_id: true, role: true, confirmed_at: true, event_kloters: { select: { no: true, depart_time: true, events: { select: { name: true } } } } },
    });
    const perOrang = new Map<bigint, typeof tugas>();
    for (const t of tugas) perOrang.set(t.user_id!, [...(perOrang.get(t.user_id!) ?? []), t]);
    let terkirim = 0;
    for (const [orang, daftar] of perOrang) {
      const pesan = pesanJadwalBesok(
        besok,
        daftar.map((t) => ({ jam: t.event_kloters.depart_time, event: t.event_kloters.events.name, kloter: t.event_kloters.no, captain: t.role === "captain", sudahSiap: Boolean(t.confirmed_at) })),
      );
      if (pesan) terkirim += (await kirimPush([orang], pesan)).terkirim;
    }
    return NextResponse.json({ jenis, besok, orang: perOrang.size, terkirim });
  }

  if (jenis === "pagi") {
    const hasil: Record<string, number> = {};
    const opname = await pengingatOpname();
    if (opname && Number(hariIni.slice(8, 10)) <= 3 && opname.status !== "diajukan") {
      hasil.opname = (await kirimPush(await akunBerperan(["gudang"]), pesanPengingatOpname(labelPeriode(opname.periode)))).terkirim;
    }
    const hutang = await prisma.supplier_payables.count({ where: { status: "belum", due_date: { lte: tgl(hariIni) } } });
    const pesanHutang = pesanHutangJatuhTempo(hutang);
    if (pesanHutang) hasil.hutang = (await kirimPush(await akunBerperan(["finance"]), pesanHutang)).terkirim;
    const ultah = mendatang(
      (await prisma.employee_birthdays.findMany({ select: { name: true, birth_day: true, birth_month: true, user_id: true } })).map((u) => ({ ...u, hari: u.birth_day, bulan: u.birth_month })),
      hariIni,
      1,
    );
    const pesanUltah = pesanUlangTahun(ultah.filter((u) => u.lagi === 0).map((u) => u.name), ultah.filter((u) => u.lagi === 1).map((u) => u.name));
    if (pesanUltah) {
      const yangUltah = new Set(ultah.flatMap((u) => (u.user_id ? [u.user_id] : [])));
      hasil.ulangTahun = (await kirimPush((await akunBerperan(["owner", "admin"])).filter((id) => !yangUltah.has(id)), pesanUltah)).terkirim;
    }
    return NextResponse.json({ jenis, hariIni, ...hasil });
  }

  return new NextResponse("Jenis tidak dikenal.", { status: 404 });
}
