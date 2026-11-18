"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SaringStatus } from "@/components/saring-status";
import { PERIODE_CEPAT, type PeriodeCepat, periodeAktif, rentangPeriode } from "@/lib/kalender";

/**
 * Pilihan cepat periode (D-193): satu ketuk mengisi `dari` & `sampai` di alamat halaman sekaligus. Tanggal yang
 * dipilih sendiri tetap boleh — tidak ada tab yang menyala.
 */
export function SaringPeriode({ denganSemua = true }: { denganSemua?: boolean }) {
  const router = useRouter();
  const jalur = usePathname();
  const params = useSearchParams();
  const dari = params.get("dari") ?? "";
  const sampai = params.get("sampai") ?? "";

  return (
    <SaringStatus
      pilihan={[...(denganSemua ? [{ nilai: "", label: "Semua" }] : []), ...PERIODE_CEPAT]}
      nilai={!dari && !sampai ? "" : (periodeAktif(dari, sampai) ?? "__sendiri")}
      onPilih={(p) => {
        const baru = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(p ? rentangPeriode(p as PeriodeCepat) : { dari: "", sampai: "" })) {
          if (v) baru.set(k, v);
          else baru.delete(k);
        }
        router.replace(`${jalur}?${baru.toString()}`, { scroll: false });
      }}
    />
  );
}
