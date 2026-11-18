"use client";

import { Ban, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IsianRupiah } from "@/components/isian-rupiah";
import { hitungRefund } from "@/lib/hitung/pembatalan-event";
import { bacaAlasanPembatalan } from "@/lib/pembatalan";
import type { PengaturanBisnis } from "@/lib/pengaturan-bisnis";

import { batalkanEvent } from "../../actions";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const tgl = (t: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

export function FormBatalEvent(p: {
  id: string;
  hariIni: string;
  tanggalAcara: string | null;
  dibayar: number;
  aturan: PengaturanBisnis["pembatalan"];
  bolehUbahNominal: boolean;
}) {
  const [tanggal, setTanggal] = useState(p.hariIni);
  const [pihak, setPihak] = useState("klien");
  const [alasan, setAlasan] = useState("");
  const [nominal, setNominal] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  const h = p.tanggalAcara && tanggal ? hitungRefund({ tanggalAcara: p.tanggalAcara, tanggalBatal: tanggal, dibayar: p.dibayar, aturan: p.aturan }) : null;
  const final = nominal === null ? (h?.refund ?? 0) : Number(nominal || 0);
  const diubah = h !== null && final !== h.refund;

  if (!p.tanggalAcara) {
    return <p className="mt-4 rounded-2xl border border-perhatian-garis bg-perhatian-halus p-4 text-perhatian">Tanggal acara belum diisi — isi dulu di quotation/invoice supaya refund bisa dihitung.</p>;
  }

  const kirim = () => {
    const a = bacaAlasanPembatalan(alasan);
    if (!a.ok) return toast.error(a.pesan);
    if (diubah && catatan.trim().length < 5) return toast.error("Tulis alasan nominal refund diubah.");
    mulai(async () => {
      try {
        await batalkanEvent(p.id, { tanggal, pihak, alasan, nominal: diubah ? final : null, catatanNominal: catatan });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal membatalkan.");
      }
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-2">
          <Label>Tanggal klien membatalkan</Label>
          <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} aria-label="Tanggal batal" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Siapa yang membatalkan</Label>
          <PilihanChip
            label="Siapa yang membatalkan"
            nilai={pihak}
            onPilih={setPihak}
            pilihan={[
              { nilai: "klien", label: "Klien membatalkan" },
              { nilai: "force_majeure", label: "Force majeure / kesepakatan khusus" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="alasan">Alasan</Label>
          <Textarea id="alasan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. Acara diundur tanpa tanggal pengganti" rows={3} />
        </div>
      </section>

      {h ? (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 className="eyebrow">Hitungan refund</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Tanggal acara</dt>
            <dd className="text-right">{tgl(p.tanggalAcara)}</dd>
            <dt className="text-muted-foreground">Jarak dari tanggal batal</dt>
            <dd className="text-right tabular-nums">{h.hari >= 0 ? `H-${h.hari}` : `${-h.hari} hari sesudah acara`}</dd>
            <dt className="text-muted-foreground">Sudah dibayar klien</dt>
            <dd className="text-right tabular-nums">{rp(p.dibayar)}</dd>
            <dt className="text-muted-foreground">Dikembalikan menurut S&K</dt>
            <dd className="text-right tabular-nums">
              {h.pct}% = <b>{rp(h.refund)}</b>
            </dd>
            <dt className="text-muted-foreground">Tidak dikembalikan</dt>
            <dd className="text-right tabular-nums">{rp(h.ditahan)}</dd>
          </dl>
          {h.ditahan > 0 ? <p className="text-xs text-muted-foreground">Yang tidak dikembalikan boleh dipakai klien untuk pesanan lain sampai {tgl(h.berlakuSampai)}.</p> : null}
          {pihak === "force_majeure" && !p.bolehUbahNominal ? (
            <p className="rounded-xl border border-perhatian-garis bg-perhatian-halus p-3 text-sm text-perhatian">Force majeure: nominal mengikuti S&K dulu; Finance/owner bisa menyesuaikannya sebelum menutup refund.</p>
          ) : null}
          {p.bolehUbahNominal ? (
            <div className="flex flex-col gap-2 border-t pt-3">
              <Label htmlFor="nominal">Nominal yang dikembalikan (Finance/owner boleh menyesuaikan)</Label>
              <IsianRupiah id="nominal" value={String(final)} onChange={(t) => setNominal(t.replace(/\D/g, ""))} />
              {diubah ? (
                <>
                  <Label htmlFor="catatan">Kenapa berbeda dari S&K ({rp(h.refund)})?</Label>
                  <Textarea id="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="mis. Owner setuju dikembalikan penuh karena force majeure" />
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="rounded-full" render={<Link href={`/event/${p.id}`} />}>
          Kembali
        </Button>
        <Button variant="destructive" className="rounded-full" disabled={menunggu || !h || final > p.dibayar} onClick={kirim}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Ban className="size-4" />}
          Batalkan event{final > 0 ? ` · refund ${rp(final)}` : ""}
        </Button>
      </div>
    </div>
  );
}
