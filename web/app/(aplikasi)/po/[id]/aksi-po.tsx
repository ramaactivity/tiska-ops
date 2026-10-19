"use client";

import { Ban, Check, Copy, LoaderCircle, MessageCircle, PackageCheck, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DialogPembatalan } from "@/components/dialog-pembatalan";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nilaiBarisNota, totalNota } from "@/lib/hitung/uang-muka";
import { rupiah } from "@/lib/uang";

import { FotoNota } from "../../uang-muka/foto-nota";
import { batalkanPo, tandaiDipesan, terimaBarang } from "../actions";

const lewatkanRedirect = (e: unknown) => {
  if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
};

/**
 * Pesan PO disalin / dibuka di WA admin sendiri — tidak ada pesan yang
 * terkirim otomatis ke supplier (aturan: tidak ada pesan keluar tanpa orangnya).
 */
export function AksiPo({ id, status, pesan, wa }: { id: string; status: string; pesan: string; wa: string | null }) {
  const [menunggu, mulai] = useTransition();
  const [batal, setBatal] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5">
      <h2 className="eyebrow">Pesan ke supplier</h2>
      <pre className="rounded-[10px] bg-muted p-3 font-sans text-sm whitespace-pre-wrap">{pesan}</pre>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(pesan).then(() => toast.success("Pesan PO disalin."))}>
          <Copy className="size-4" />
          Salin pesan
        </Button>
        {wa ? (
          <Button variant="outline" render={<a href={`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`} target="_blank" rel="noreferrer" />}>
            <MessageCircle className="size-4" />
            Buka WA supplier
          </Button>
        ) : null}
        {status === "draft" ? (
          <Button
            disabled={menunggu}
            onClick={() =>
              mulai(async () => {
                try {
                  await tandaiDipesan(id);
                  toast.success("PO ditandai sudah dipesan.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal.");
                }
              })
            }
          >
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            Tandai sudah dipesan
          </Button>
        ) : null}
        {status === "draft" || status === "dikirim" ? (
          <Button variant="ghost" className="ml-auto" onClick={() => setBatal(true)}>
            <Ban className="size-4" />
            Batalkan PO
          </Button>
        ) : null}
      </div>
      <DialogPembatalan
        terbuka={batal}
        onTerbukaChange={setBatal}
        judul="Batalkan PO ini?"
        keterangan="PO tetap tersimpan sebagai batal. Barang PR-nya kembali bisa dibelanjakan atau dipesan lagi."
        labelTombol="Batalkan PO"
        onBatalkan={async (alasan) => {
          await batalkanPo(id, alasan);
          toast.success("PO dibatalkan.");
        }}
      />
    </section>
  );
}

type BarisTerima = { poItemId: string; nama: string; satuan: string; sisa: number; harga: number };

/** Penerimaan barang: jumlah bawaan = sisa pesanan, harga bawaan = harga PO (koreksi sesuai nota supplier). */
export function FormTerima({ id, hariIni, baris }: { id: string; hariIni: string; baris: BarisTerima[] }) {
  const [isi, setIsi] = useState(() => baris.map((b) => ({ ...b, qty: String(b.sisa).replace(".", ","), hargaTeks: String(b.harga) })));
  const [tanggal, setTanggal] = useState(hariIni);
  const [nota, setNota] = useState<string[]>([]);
  const [tanpaNota, setTanpaNota] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [menunggu, mulai] = useTransition();
  const angka = (t: string) => (t.trim() === "" ? 0 : Number(t.replace(",", ".")));
  const total = totalNota(isi.map((b) => ({ qty: angka(b.qty), harga: angka(b.hargaTeks) })).filter((b) => b.qty > 0 && b.harga >= 0)).toNumber();
  const ganti = (i: number, x: Partial<(typeof isi)[number]>) => setIsi((s) => s.map((b, j) => (j === i ? { ...b, ...x } : b)));

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5">
      <h2 className="eyebrow flex items-center gap-2">
        <PackageCheck className="size-4" />
        Terima barang
      </h2>
      <p className="text-sm text-muted-foreground">Isi jumlah yang benar-benar datang (0 = belum datang). Sisanya tetap bisa diterima nanti.</p>
      <ul className="divide-y rounded-[10px] border">
        {isi.map((b, i) => (
          <li key={b.poItemId} className="flex flex-col gap-2 p-3">
            <p className="font-medium">
              {b.nama} <span className="text-xs font-normal text-muted-foreground">sisa {String(b.sisa).replace(".", ",")} {b.satuan}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={b.qty} inputMode="decimal" onChange={(e) => ganti(i, { qty: e.target.value })} className="w-20 text-right font-mono tabular-nums" aria-label={`Diterima ${b.nama}`} />
              <span className="w-16 truncate text-sm text-muted-foreground">{b.satuan}</span>
              <span className="text-muted-foreground">×</span>
              <Input
                value={b.hargaTeks ? Number(b.hargaTeks).toLocaleString("id-ID") : ""}
                inputMode="numeric"
                onChange={(e) => ganti(i, { hargaTeks: e.target.value.replace(/\D/g, "") })}
                className="w-32 text-right font-mono tabular-nums"
                aria-label={`Harga ${b.nama}`}
              />
              <span className="ml-auto font-mono tabular-nums">= {rupiah(nilaiBarisNota(angka(b.qty), angka(b.hargaTeks)))}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label>Tanggal diterima</Label>
          <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Surat jalan / nota supplier</Label>
          {!tanpaNota ? <FotoNota jalur={nota} onUbah={setNota} label="Foto surat jalan" /> : null}
          <PilihanChip
            kecil
            label="Surat jalan"
            nilai={tanpaNota ? "tanpa" : "ada"}
            onPilih={(v) => setTanpaNota(v === "tanpa")}
            pilihan={[
              { nilai: "ada", label: "Ada" },
              { nilai: "tanpa", label: "Tidak ada" },
            ]}
          />
          {tanpaNota ? <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan, mis. nota menyusul" aria-label="Alasan tanpa surat jalan" /> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="font-mono tabular-nums">Total diterima {rupiah(total)}</span>
        <Button
          disabled={menunggu || total < 0}
          onClick={() =>
            mulai(async () => {
              try {
                await terimaBarang(id, {
                  tanggal,
                  nota: tanpaNota ? [] : nota,
                  tanpaNota: tanpaNota ? alasan : "",
                  baris: isi.map((b) => ({ poItemId: b.poItemId, qty: angka(b.qty), harga: angka(b.hargaTeks) })),
                });
              } catch (e) {
                lewatkanRedirect(e);
                toast.error(e instanceof Error ? e.message : "Gagal.");
              }
            })
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          Simpan penerimaan
        </Button>
      </div>
    </section>
  );
}
