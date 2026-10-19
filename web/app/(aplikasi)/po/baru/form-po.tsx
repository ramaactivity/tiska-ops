"use client";

import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { totalNota } from "@/lib/hitung/uang-muka";
import { rupiah } from "@/lib/uang";

import { DaftarBarang, keAngka, keBaris, type Barang, type Baris } from "../../uang-muka/daftar-barang";
import { buatPo } from "../actions";

type OpsiPr = { id: string; label: string; tanggal: string; barang: Barang[] };

/** PO ke supplier tempo (D-083): supplier, tanggal kirim, barang (dari PR atau manual), harga sepakat. */
export function FormPo({ hariIni, prAwal, supplier, pr, bahan }: { hariIni: string; prAwal: string; supplier: OpsiCari[]; pr: OpsiPr[]; bahan: OpsiCari[] }) {
  const awal = pr.find((p) => p.id === prAwal);
  const [sup, setSup] = useState<OpsiCari | undefined>();
  const [prPilih, setPrPilih] = useState(awal?.id ?? "");
  const [baris, setBaris] = useState<Baris[]>(() => (awal ? awal.barang.map(keBaris) : []));
  const [tanggal, setTanggal] = useState(hariIni);
  const [kirim, setKirim] = useState(awal?.tanggal ?? "");
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  const total = totalNota(baris.map((b) => ({ qty: keAngka(b.qty), harga: keAngka(b.harga) })).filter((b) => b.qty > 0 && b.harga >= 0)).toNumber();

  function simpan() {
    if (!sup) return toast.error("Pilih supplier dulu.");
    const kosong = baris.find((b) => !(keAngka(b.qty) > 0) || b.harga.trim() === "");
    if (kosong) return toast.error(`Isi jumlah & harga ${kosong.nama} (0 bila belum tahu), atau hapus barisnya.`);
    mulai(async () => {
      try {
        await buatPo({
          supplierId: sup.id,
          prId: prPilih || null,
          tanggal,
          tanggalKirim: kirim || null,
          catatan,
          baris: baris.map((b) => ({ idBahan: b.idBahan, prItemId: b.prItemId, nama: b.nama, qty: keAngka(b.qty), satuan: b.satuan, harga: keAngka(b.harga) })),
        });
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label>Supplier</Label>
          {supplier.length ? (
            <PilihCari nilai={sup} pilihan={supplier} onPilih={setSup} placeholder="Cari supplier…" semuaSaatKosong={supplier.length <= 12} />
          ) : (
            <p className="text-sm text-perhatian">
              Belum ada supplier.{" "}
              <Link href="/supplier" className="underline">
                Tambah supplier dulu
              </Link>
              .
            </p>
          )}
        </div>
        {pr.length ? (
          <div className="flex flex-col gap-1.5">
            <Label>Dari PR (barang yang belum dibeli/dipesan terisi otomatis)</Label>
            <PilihanChip
              label="PR"
              nilai={prPilih}
              onPilih={(v) => {
                const p = pr.find((x) => x.id === v);
                const lepas = v === prPilih;
                setPrPilih(lepas ? "" : v);
                setBaris((s) => [...s.filter((b) => !b.prItemId), ...(lepas || !p ? [] : p.barang.map(keBaris))]);
                if (p && !lepas && !kirim) setKirim(p.tanggal);
              }}
              pilihan={pr.map((p) => ({ nilai: p.id, label: p.label }))}
            />
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Tanggal pesan</Label>
            <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Dikirim supplier tanggal</Label>
            <PilihTanggal value={kirim} onChange={setKirim} />
          </div>
        </div>
      </section>

      <DaftarBarang baris={baris} setBaris={setBaris} bahan={bahan} kosong="Belum ada barang. Pilih PR di atas atau tambah barang di bawah. Harga = harga sepakat per satuan." />

      <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan untuk supplier (ikut di pesan PO), mis. potong 12 bagian" aria-label="Catatan PO" />

      <div className="sticky bottom-0 z-20 rounded-[14px] border bg-card/95 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total PO · {baris.length} barang</p>
            <p className="uang truncate text-lg">{rupiah(total)}</p>
          </div>
          <Button className="h-11 shrink-0 px-5" disabled={menunggu || !baris.length} onClick={simpan}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Simpan PO
          </Button>
        </div>
      </div>
    </div>
  );
}
