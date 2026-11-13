"use client";

import { CalendarClock, Phone, Send } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { nomorWa, pesanPengingat } from "@/lib/hitung/penagihan";

import { catatPenagihan } from "./actions";

export type DataPanel = {
  id: string;
  nama: string;
  kode: string;
  pic: string | null;
  hp: string | null;
  sisa: string;
  terlambatNilai: string;
  invoice: { id: string; nomor: string; tempo: string; sisa: string; terlambat: number }[];
  riwayat: { id: string; teks: string; kapan: string }[];
  bolehCatatBayar: boolean;
};

const rp = (v: string | number) => `Rp ${Math.round(Number(v)).toLocaleString("id-ID")}`;
const tgl = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/**
 * Panel kanan Kartu Piutang (D-060): sisa tagihan, invoice bercentang, riwayat,
 * draf pesan WhatsApp (bisa diubah) → buka WhatsApp, lalu tercatat sebagai
 * pengingat. Pengiriman tetap oleh admin sendiri — tidak ada pesan otomatis.
 */
export function PanelTagih({ d }: { d: DataPanel }) {
  const awal = d.invoice.filter((i) => i.terlambat > 0).map((i) => i.id);
  const [pilih, setPilih] = useState<string[]>(awal.length ? awal : d.invoice.map((i) => i.id));
  const terpilih = d.invoice.filter((i) => pilih.includes(i.id));
  const draf = useMemo(() => pesanPengingat(terpilih), [terpilih]);
  const [pesan, setPesan] = useState<string | null>(null);
  const [janji, setJanji] = useState("");
  const [bukaJanji, setBukaJanji] = useState(false);
  const [menunggu, mulai] = useTransition();
  const wa = nomorWa(d.hp);
  const teks = pesan ?? draf;
  const total = terpilih.reduce((s, i) => s + Number(i.sisa), 0);

  const catat = (jenis: string, catatan: string, tgl: string | null = null) =>
    mulai(async () => {
      try {
        await catatPenagihan(d.id, { jenis, catatan, janji: tgl, invoice: terpilih.map((i) => i.nomor) });
        toast.success(jenis === "janji_bayar" ? "Janji bayar tercatat" : jenis === "wa" ? "Pengingat tercatat" : "Tercatat");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mencatat.");
      }
    });

  return (
    <div className="flex flex-col divide-y divide-border-row">
      <div className="flex items-center gap-3 pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-sm font-semibold text-accent-foreground">
          {d.nama
            .split(/\s+/)
            .slice(0, 2)
            .map((x) => x[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <Link href={`/pelanggan/${d.id}`} className="block truncate font-semibold text-primary-strong hover:underline">
            {d.nama}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{[d.kode, d.pic].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="py-4">
        <p className="label-kecil">Sisa tagihan</p>
        <p className="uang mt-1 text-[1.625rem] font-bold">{rp(d.sisa)}</p>
        {Number(d.terlambatNilai) > 0 ? <p className="mt-1 text-sm font-medium text-tempo">⚠ {rp(d.terlambatNilai)} terlambat</p> : null}
        {Number(d.sisa) > Number(d.terlambatNilai) ? (
          <p className="text-sm text-muted-foreground">{rp(Number(d.sisa) - Number(d.terlambatNilai))} belum jatuh tempo</p>
        ) : null}
      </div>

      <div className="py-4">
        <p className="label-kecil pb-2">Invoice</p>
        <ul className="flex flex-col gap-3">
          {d.invoice.map((i) => (
            <li key={i.id} className="flex items-start gap-3">
              <Checkbox
                checked={pilih.includes(i.id)}
                onCheckedChange={(v) => setPilih((p) => (v ? [...p, i.id] : p.filter((x) => x !== i.id)))}
                aria-label={`Sertakan ${i.nomor} di pengingat`}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <Link href={`/tagihan/${i.id}`} className="nomor-dokumen text-primary hover:underline">
                  {i.nomor}
                </Link>
                <p className="text-xs text-muted-foreground">tempo {tgl(i.tempo)}</p>
              </div>
              <div className="text-right">
                <p className="uang text-sm">{rp(i.sisa)}</p>
                <p className={`font-mono text-xs ${i.terlambat > 0 ? "text-tempo" : "text-muted-foreground"}`}>
                  {i.terlambat > 0 ? `lewat ${i.terlambat} hari` : "belum jatuh tempo"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {d.riwayat.length ? (
        <div className="py-4">
          <p className="label-kecil pb-2">Riwayat</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {d.riwayat.map((r) => (
              <li key={r.id} className="text-muted-foreground">
                {r.teks} <span className="text-subtle-foreground">· {r.kapan}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pt-4">
        <div className="rounded-[12px] border border-info-garis bg-info-halus p-3">
          <p className="pb-1.5 text-sm font-medium text-primary-strong">Pesan WhatsApp</p>
          <Textarea
            value={teks}
            onChange={(e) => setPesan(e.target.value)}
            rows={6}
            aria-label="Draf pesan WhatsApp"
            className="bg-card text-sm"
          />
          {!wa ? <p className="mt-2 text-xs text-tempo">Nomor HP customer belum diisi — lengkapi di data Customer.</p> : null}
        </div>
        <Button
          className="h-11 w-full"
          disabled={!wa || !terpilih.length || menunggu}
          onClick={() => {
            window.open(`https://wa.me/${wa}?text=${encodeURIComponent(teks)}`, "_blank", "noopener");
            catat("wa", teks);
          }}
        >
          <Send className="size-4" />
          Kirim pengingat · {rp(total)}
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          {d.hp ? (
            <a href={`tel:${d.hp.replace(/[^\d+]/g, "")}`} onClick={() => catat("telepon", "Ditelepon")} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
              <Phone className="size-4" />
              Telepon
            </a>
          ) : null}
          <button type="button" onClick={() => setBukaJanji((x) => !x)} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
            <CalendarClock className="size-4" />
            Janji bayar
          </button>
          {d.bolehCatatBayar ? (
            <Link href={`/pembayaran/baru?tagihan=${(terpilih[0] ?? d.invoice[0]).id}`} className="font-medium text-primary hover:underline">
              Catat bayar
            </Link>
          ) : null}
        </div>
        {bukaJanji ? (
          <div className="flex flex-col gap-2 rounded-[12px] bg-muted/60 p-3">
            <PilihTanggal value={janji} onChange={setJanji} placeholder="Tanggal janji bayar" aria-label="Tanggal janji bayar" bisaHapus={false} />
            <Button
              size="sm"
              variant="outline"
              disabled={!janji || menunggu}
              onClick={() => {
                catat("janji_bayar", `Janji bayar ${tgl(janji)}`, janji);
                setBukaJanji(false);
                setJanji("");
              }}
            >
              Simpan janji bayar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
