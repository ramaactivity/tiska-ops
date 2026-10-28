import { Cake } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { SalinTeks } from "@/components/salin-teks";
import { teksDaftarWa } from "@/lib/hitung/ulang-tahun";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { DaftarUlangTahun, TombolTambah } from "./daftar-ulang-tahun";

export const metadata: Metadata = { title: "Ulang Tahun" };
export const dynamic = "force-dynamic";

/* Ulang tahun karyawan (D-109): daftar per bulan, yang segera, salin ke WA. Pengingat HP pukul 06.00 WIB. */
export default async function HalamanUlangTahun() {
  await wajibIzin("ulang-tahun");
  const [baris, akun] = await Promise.all([
    prisma.employee_birthdays.findMany({
      orderBy: [{ birth_month: "asc" }, { birth_day: "asc" }, { name: "asc" }],
      include: { users: { select: { name: true, username: true, avatar: true } } },
    }),
    prisma.users.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, username: true } }),
  ]);
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const data = baris.map((b) => ({
    id: b.id.toString(),
    nama: b.name,
    hari: b.birth_day,
    bulan: b.birth_month,
    tahun: b.birth_year,
    catatan: b.notes ?? "",
    akun: b.users ? { id: b.user_id!.toString(), nama: b.users.name, username: b.users.username, avatar: b.users.avatar } : null,
  }));
  const terpakai = new Set(data.flatMap((d) => (d.akun ? [d.akun.id] : [])));
  const pilihanAkun = akun.map((a) => ({ id: a.id.toString(), label: a.name, sub: a.username, terpakai: terpakai.has(a.id.toString()) }));

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Cake}
        jumlah={data.length}
        judul="Ulang Tahun"
        keterangan="Tanggal ulang tahun tim & karyawan, supaya tidak ada ucapan dan perayaan kecil yang terlewat. Pengingat masuk ke HP owner & admin pukul 06.00 pada H-1 dan hari H."
        aksi={
          <div className="flex flex-wrap gap-2">
            <SalinTeks teks={teksDaftarWa(data)} label="Salin daftar WA" />
            <TombolTambah akun={pilihanAkun} />
          </div>
        }
      />
      <DaftarUlangTahun data={data} akun={pilihanAkun} hariIni={hariIni} />
    </Halaman>
  );
}
