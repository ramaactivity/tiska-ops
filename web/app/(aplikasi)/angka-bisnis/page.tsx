import { Calculator } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman, Pil } from "@/components/halaman";
import { ambilJalur, KELOMPOK_PENGATURAN } from "@/lib/label-pengaturan";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { BAWAAN } from "@/lib/pengaturan-bisnis";
import { bolehUbahAngkaBisnis } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { halamanAwalSesi, wajibIzin } from "@/lib/rbac";

import { FormKelompok } from "./form-kelompok";

export const metadata: Metadata = { title: "Angka Bisnis" };
export const dynamic = "force-dynamic";

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function HalamanAngkaBisnis() {
  const sesi = await wajibIzin("angka-bisnis");
  // Centang menu bisa diberikan admin ke peran lain; mengubah angka ini
  // tetap hanya untuk owner & finance.
  if (!bolehUbahAngkaBisnis(sesi.peran)) redirect(`${await halamanAwalSesi(sesi)}?akses=ditolak`);

  const berlaku = await bacaPengaturanBisnis();
  const tersimpan = await prisma.business_settings.findMany({
    select: { key: true, updated_at: true, users: { select: { name: true } } },
  });
  const diubah = new Map(tersimpan.map((t) => [t.key, t]));

  return (
    <Halaman>
      <KepalaHalaman ikon={Calculator}
        judul="Angka Bisnis"
        keterangan="Pajak, layanan, delivery fee, termin, dan batas untung yang dipakai quotation, HPP, dan laporan. Perubahan langsung berlaku."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {KELOMPOK_PENGATURAN.map((k) => {
          const t = diubah.get(k.kunci);
          return (
            <section key={k.kunci} className="kartu p-5">
              <div className="flex items-start justify-between gap-3 pb-1">
                <h2 className="eyebrow">{k.judul}</h2>
                {t ? <Pil nada="perhatian">Diubah</Pil> : <Pil>Bawaan</Pil>}
              </div>
              <p className="pb-4 text-xs text-muted-foreground">
                {k.keterangan}
                {t ? ` Diubah ${t.updated_at ? tanggal.format(t.updated_at) : ""}${t.users?.name ? ` oleh ${t.users.name}` : ""}.` : ""}
              </p>
              <FormKelompok
                kunci={k.kunci}
                diubah={Boolean(t)}
                isian={k.isian.map(([jalur, label, satuan]) => ({
                  jalur,
                  label,
                  satuan,
                  nilai: ambilJalur(berlaku[k.kunci], jalur) as number,
                  bawaan: ambilJalur(BAWAAN[k.kunci], jalur) as number,
                }))}
              />
            </section>
          );
        })}
      </div>
    </Halaman>
  );
}
