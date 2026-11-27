import type { Metadata } from "next";

import type { Dapur } from "@/lib/dapur-layar";
import {
  agendaDapur,
  pesananDapur,
  ulangTahunDekat,
} from "@/lib/pesanan-dapur";
import { persiapanHariIni, rencanaMasak } from "@/lib/jadwal-masak";
import { wajibIzin } from "@/lib/rbac";

import { LayarDapur } from "./layar";

export const metadata: Metadata = {
  title: { absolute: "Layar Dapur · Tiska" },
};
export const dynamic = "force-dynamic";

/* Layar Dapur (08-TIM-PWA §7, D-055): pesanan HARI INI + BESOK, tanpa harga (lib/pesanan-dapur).
   ?dapur=masak|pastry → hanya isi yang menjadi tugas dapur itu (D-097); tiap TV bisa di-bookmark. */
export default async function HalamanLayarDapur({
  searchParams,
}: PageProps<"/layar-dapur">) {
  await wajibIzin("layar-dapur");
  const { dapur: q } = await searchParams;
  const dapur: Dapur | null = q === "masak" || q === "pastry" ? q : null;
  const sekarang = new Date();
  const wib = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
  const hariIni = wib(sekarang);
  const besok = wib(new Date(sekarang.getTime() + 86_400_000));
  const [order, orderBesok, rencana, targetPersiapan] = await Promise.all([
    pesananDapur(hariIni, dapur),
    pesananDapur(besok, dapur),
    // Rencana masak hari ini + besok: jadwal yang dimulai lewat tengah malam sudah tampil sebagai "Berikutnya".
    rencanaMasak([hariIni, besok]),
    persiapanHariIni(hariIni),
  ]);
  // Hari tanpa pesanan: TV memutar agenda 7 hari, ulang tahun karyawan, dan slide Tiska (mode santai).
  const [agenda, ultah] = order.length
    ? [null, []]
    : await Promise.all([agendaDapur(besok, 7), ulangTahunDekat(hariIni, 7)]);

  return (
    <LayarDapur
      tanggal={hariIni}
      besok={besok}
      order={order}
      orderBesok={orderBesok}
      agenda={agenda}
      ultah={ultah}
      rencana={rencana}
      targetPersiapan={targetPersiapan}
      dapur={dapur}
      dibuat={sekarang.getTime()}
    />
  );
}
