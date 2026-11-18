"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IsianRupiah } from "@/components/isian-rupiah";
import { CONTOH_TAGIHAN, KATEGORI_TAGIHAN, ULANGI } from "@/lib/hitung/pengingat-bayar";

import { FotoNota } from "../uang-muka/foto-nota";
import { simpanTagihan } from "./actions";

export type IsiTagihan = Omit<Parameters<typeof simpanTagihan>[0], "idPic" | "idEvent"> & { pic: OpsiCari | null; acara: OpsiCari | null };

const PILIHAN_KATEGORI = Object.entries(KATEGORI_TAGIHAN).map(([nilai, label]) => ({ nilai, label }));
const PILIHAN_ULANGI = Object.entries(ULANGI).map(([nilai, label]) => ({ nilai, label }));
const PILIHAN_INGAT = ["1", "3", "7", "14"].map((n) => ({ nilai: n, label: `H-${n}` }));
const tglPanjang = (t: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** Tagihan baru / ubah (D-128): yang pasti (nama, jadwal, nominal) + detail bebas (kode bayar, rekening, PIC, foto). */
export function FormTagihan({ awal, opsiPic, opsiAcara }: { awal: IsiTagihan; opsiPic: OpsiCari[]; opsiAcara: OpsiCari[] }) {
  const router = useRouter();
  const [f, setF] = useState(awal);
  const [menunggu, mulai] = useTransition();
  const ubah = <K extends keyof IsiTagihan>(k: K, v: IsiTagihan[K]) => setF((x) => ({ ...x, [k]: v }));
  const rutin = f.ulangi !== "0";

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {!awal.id ? (
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Isi cepat
          <div className="flex flex-wrap gap-1.5">
            {CONTOH_TAGIHAN.map((c) => (
              <button
                key={c.nama}
                type="button"
                onClick={() => setF((x) => ({ ...x, nama: c.nama, kategori: c.kategori, ulangi: c.ulangi }))}
                className="min-h-8 rounded-full border border-dashed bg-card px-3 text-xs hover:bg-accent"
              >
                + {c.nama}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nama tagihan
        <Input value={f.nama} onChange={(e) => ubah("nama", e.target.value)} maxLength={120} placeholder="mis. Wifi kantor, Sewa chafing dish Agro, Pelunasan DW 31 Okt" />
      </label>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Kategori
        <PilihanChip pilihan={PILIHAN_KATEGORI} nilai={f.kategori} onPilih={(n) => ubah("kategori", n as IsiTagihan["kategori"])} label="Kategori" kecil />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Bayar
          <PilihanChip pilihan={PILIHAN_ULANGI} nilai={f.ulangi} onPilih={(n) => ubah("ulangi", n as IsiTagihan["ulangi"])} label="Ulangi" kecil />
        </div>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          {rutin ? "Jatuh tempo berikutnya" : "Jatuh tempo"}
          <PilihTanggal value={f.jatuhTempo} onChange={(t) => ubah("jatuhTempo", t)} bisaHapus={false} aria-label="Jatuh tempo" />
          {rutin && f.jatuhTempo ? (
            <span className="text-xs font-normal text-muted-foreground">
              Selanjutnya {ULANGI[f.ulangi].toLowerCase()} tanggal {tglPanjang(f.jatuhTempo)} (bulan pendek: akhir bulan).
            </span>
          ) : null}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nominal {rutin ? "(kira-kira, boleh kosong kalau berubah-ubah)" : "(boleh kosong)"}
          <IsianRupiah value={f.nominal} onChange={(t) => ubah("nominal", t.replace(/\D/g, "").slice(0, 13))} placeholder="0" className="text-right font-mono" />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Ingatkan mulai
          <PilihanChip pilihan={PILIHAN_INGAT} nilai={String(f.ingatkan)} onPilih={(n) => ubah("ingatkan", Number(n))} label="Ingatkan" kecil />
          <span className="text-xs font-normal text-muted-foreground">Notifikasi HP tiap pagi 06.00 sampai dicatat dibayar.</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        PIC yang membayar (opsional — ikut menerima pengingat)
        <PilihCari nilai={f.pic ?? undefined} pilihan={opsiPic} onPilih={(p) => ubah("pic", p)} placeholder="Ketik nama…" semuaSaatKosong />
        {f.pic ? (
          <button type="button" className="self-start text-xs font-normal text-muted-foreground underline-offset-4 hover:underline" onClick={() => ubah("pic", null)}>
            Kosongkan PIC
          </button>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          ID pelanggan / kode bayar (opsional)
          <Input value={f.kodeBayar} onChange={(e) => ubah("kodeBayar", e.target.value)} maxLength={120} placeholder="mis. ID PLN 5321…, kode billing pajak" className="font-mono" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Rekening tujuan / cara bayar (opsional)
          <Input value={f.tujuanBayar} onChange={(e) => ubah("tujuanBayar", e.target.value)} maxLength={300} placeholder="mis. BCA 123… a.n. Budi / bayar lewat m-banking" />
        </label>
      </div>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Terkait acara (opsional)
        <PilihCari nilai={f.acara ?? undefined} pilihan={opsiAcara} onPilih={(p) => ubah("acara", p)} placeholder="mis. sewa alat untuk acara tertentu" />
        {f.acara ? (
          <button type="button" className="self-start text-xs font-normal text-muted-foreground underline-offset-4 hover:underline" onClick={() => ubah("acara", null)}>
            Lepas dari acara
          </button>
        ) : null}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Catatan (opsional)
        <Textarea value={f.catatan} onChange={(e) => ubah("catatan", e.target.value)} maxLength={1000} placeholder="mis. denda Rp10.000 kalau lewat tgl 20, kontak vendor 0812…" />
      </label>
      <FotoNota jalur={f.foto} onUbah={(j) => ubah("foto", j)} maks={5} label="Foto tagihan" />
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          className="rounded-full"
          disabled={menunggu || !f.nama.trim() || !f.jatuhTempo}
          onClick={() =>
            mulai(async () => {
              const { pic, acara, ...isi } = f;
              const r = await simpanTagihan({ ...isi, idPic: pic?.id ?? null, idEvent: acara?.id ?? null });
              if (!r.ok) return void toast.error(r.pesan);
              toast.success(r.pesan);
              router.push(`/pengingat-bayar/${r.id}`);
            })
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Simpan tagihan
        </Button>
        <Button type="button" variant="ghost" className="rounded-full" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </div>
  );
}
