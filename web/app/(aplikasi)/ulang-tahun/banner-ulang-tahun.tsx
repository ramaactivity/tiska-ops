import Link from "next/link";

import { mendatang } from "@/lib/hitung/ulang-tahun";
import { prisma } from "@/lib/prisma";

/** Dashboard (D-109): siapa berulang tahun hari ini s.d. 7 hari ke depan. Tidak ada = tidak tampil. */
export async function BannerUlangTahun() {
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const daftar = mendatang(
    (await prisma.employee_birthdays.findMany({ select: { id: true, name: true, birth_day: true, birth_month: true } })).map((u) => ({ ...u, hari: u.birth_day, bulan: u.birth_month })),
    hariIni,
    7,
  );
  if (!daftar.length) return null;
  const kapan = (n: number) => (n === 0 ? "hari ini" : n === 1 ? "besok" : `${n} hari lagi`);
  return (
    <Link href="/ulang-tahun" className="mb-4 flex items-start justify-between gap-3 kartu p-4 text-sm hover:bg-muted/30">
      <span>
        <span className="font-medium">🎂 Ulang tahun minggu ini: </span>
        {daftar.map((u, i) => (
          <span key={u.id.toString()}>
            {i ? " · " : ""}
            <b className={u.lagi === 0 ? "text-perhatian" : undefined}>{u.name}</b> <span className="text-muted-foreground">({kapan(u.lagi)})</span>
          </span>
        ))}
      </span>
      <span className="shrink-0 text-primary underline">Buka</span>
    </Link>
  );
}
