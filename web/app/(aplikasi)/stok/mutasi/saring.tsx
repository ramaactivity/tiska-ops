"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { SaringPeriode } from "@/components/saring-periode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { tanggalSiapDisaring } from "@/lib/bentuk-form";

/** Periode & bahan laporan mutasi — tersimpan di alamat halaman (bisa dikirim sebagai tautan & ikut ke unduhan Excel). */
export function SaringMutasi({ dari, sampai, bahan }: { dari: string; sampai: string; bahan: OpsiCari | null }) {
  const router = useRouter();
  const jalur = usePathname();
  const params = useSearchParams();
  const [, mulai] = useTransition();
  const [pilihan, setPilihan] = useState<OpsiCari[]>([]);
  const [tampil, setTampil] = useState(bahan ? "bahan" : "semua");
  useEffect(() => {
    if (tampil !== "bahan" || pilihan.length) return;
    fetch("/stok/bahan").then((r) => r.json()).then(setPilihan).catch(() => toast.error("Daftar bahan gagal dimuat."));
  }, [tampil, pilihan.length]);

  function ubah(isi: Record<string, string>) {
    const baru = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(isi)) {
      if (v) baru.set(k, v);
      else baru.delete(k);
    }
    mulai(() => router.replace(`${jalur}?${baru.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-3">
      <PilihanChip
        label="Jenis laporan"
        nilai={tampil}
        onPilih={(v) => {
          setTampil(v);
          if (v === "semua") ubah({ bahan: "" });
        }}
        pilihan={[
          { nilai: "semua", label: "Mutasi keseluruhan" },
          { nilai: "bahan", label: "Mutasi per bahan" },
        ]}
      />
      <SaringPeriode denganSemua={false} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dari" className="text-xs">
            Dari tanggal
          </Label>
          <PilihTanggal id="dari" value={dari} onChange={(t) => tanggalSiapDisaring(t) && ubah({ dari: t })} bisaHapus={false} className="w-48" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sampai" className="text-xs">
            Sampai tanggal
          </Label>
          <PilihTanggal id="sampai" value={sampai} onChange={(t) => tanggalSiapDisaring(t) && ubah({ sampai: t })} bisaHapus={false} className="w-48" />
        </div>
        {tampil === "bahan" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="bahan" className="text-xs">
              Bahan
            </Label>
            <div className="flex w-72 max-w-full items-center gap-1">
              <div className="min-w-0 flex-1">
                <PilihCari id="bahan" nilai={bahan ?? undefined} pilihan={pilihan} onPilih={(o) => ubah({ bahan: o.id })} placeholder={pilihan.length ? "Cari bahan…" : "Memuat bahan…"} />
              </div>
              {bahan ? (
                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => ubah({ bahan: "" })} aria-label="Kosongkan bahan">
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
