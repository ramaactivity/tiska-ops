"use client";

import { LoaderCircle, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari } from "@/components/pilih-cari";
import { PilihJam } from "@/components/pilih-jam";
import { PilihanChip } from "@/components/pilihan-chip";
import { SalinTeks } from "@/components/salin-teks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { tugaskanDriver } from "../event/actions";

type Opsi = { id: string; label: string };

/**
 * Tugaskan driver dari Pengiriman (docs/25 #6): driver (akun atau nama), jam berangkat dari Julang, kendaraan, pesan
 * khusus → kloter & penugasan event; pesan WA "🚚 Delivery order …" format Mbak Ari siap disalin.
 */
export function TugaskanDriver({
  idEvent,
  idQuotation,
  jamAwal,
  sekarang,
  teksWa,
  orang,
  kendaraan,
}: {
  idEvent?: string;
  /** Order yang belum punya jadwal kirim: jadwalnya dibuat sekalian. */
  idQuotation?: string;
  jamAwal: string;
  /** Driver yang sudah ditugaskan (untuk tombol Ubah). */
  sekarang: { userId: string | null; nama: string; kendaraanId: string | null; pesan: string } | null;
  teksWa: string | null;
  orang: Opsi[];
  kendaraan: { nilai: string; label: string }[];
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const [pilih, setPilih] = useState<Opsi | undefined>(() => orang.find((o) => o.id === sekarang?.userId));
  const [nama, setNama] = useState(sekarang && !sekarang.userId ? sekarang.nama : "");
  const [mobil, setMobil] = useState(sekarang?.kendaraanId ?? "");
  const [jam, setJam] = useState(jamAwal);
  const [pesan, setPesan] = useState(sekarang?.pesan ?? "");

  const simpan = () =>
    mulai(async () => {
      try {
        await tugaskanDriver({ idEvent, idQuotation, userId: pilih?.id ?? null, nama, kendaraanId: mobil || null, jam, pesan });
        toast.success("Driver ditugaskan. Pesan WA siap disalin.");
        setBuka(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menugaskan driver.");
      }
    });

  if (!buka)
    return (
      <div className="flex flex-wrap items-center gap-2">
        {teksWa ? <SalinTeks teks={teksWa} label="Salin ke WA" pesan="Pesan delivery tersalin. Tempel di grup WA tim." /> : null}
        <Button size="sm" variant={teksWa ? "ghost" : "default"} className="rounded-full" onClick={() => setBuka(true)}>
          <Truck className="size-4" /> {teksWa ? "Ubah driver" : "Tugaskan driver"}
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <PilihCari
          nilai={pilih}
          pilihan={orang}
          onPilih={(o) => {
            setPilih(o);
            setNama("");
          }}
          placeholder="Pilih driver…"
        />
        <Input
          value={nama}
          onChange={(e) => {
            setNama(e.target.value);
            setPilih(undefined);
          }}
          placeholder="…atau tulis nama driver"
          aria-label="Nama driver"
        />
      </div>
      {kendaraan.length ? (
        <PilihanChip kecil label="Kendaraan" nilai={mobil} onPilih={(v) => setMobil(mobil === v ? "" : v)} pilihan={kendaraan} />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <PilihJam value={jam} onChange={setJam} placeholder="Jam berangkat" aria-label="Jam berangkat dari Julang" bisaHapus={false} />
        <Input value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Pesan khusus (boleh kosong), mis. minta minuman less sugar" aria-label="Pesan khusus" maxLength={255} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" disabled={menunggu || (!pilih && !nama.trim()) || !jam} onClick={simpan}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Truck className="size-4" />}
          Simpan
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => setBuka(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
