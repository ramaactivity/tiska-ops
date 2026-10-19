"use client";

import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nilaiBarisNota, totalNota } from "@/lib/hitung/uang-muka";
import { rupiah } from "@/lib/uang";

import { simpanBelanja } from "../../actions";
import { FotoNota } from "../../foto-nota";

type Barang = { prItemId: string | null; idBahan: string | null; nama: string; qty: number; satuan: string };
type Baris = Omit<Barang, "qty"> & { kunci: string; qty: string; harga: string };
type OpsiPr = { id: string; label: string; barang: Barang[] };

// "1,5" (kebiasaan Indonesia) dan "1.5" sama-sama diterima.
const keAngka = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));
const tampilQty = (n: number) => String(n).replace(".", ",");
const keBaris = (b: Barang): Baris => ({ ...b, kunci: crypto.randomUUID(), qty: tampilQty(b.qty), harga: "" });

/** Nota belanja di HP: pola Google Sheets yang biasa dipakai — Jumlah × Harga = Total per baris. */
export function FormBelanja({
  saya,
  saldo,
  hariIni,
  prAwal,
  pemegang,
  pr,
  bahan,
}: {
  saya: string;
  saldo: Record<string, number>;
  hariIni: string;
  prAwal: string;
  pemegang: OpsiCari[];
  pr: OpsiPr[];
  bahan: OpsiCari[];
}) {
  const awal = pr.find((p) => p.id === prAwal);
  const [orang, setOrang] = useState<OpsiCari | undefined>(pemegang.find((p) => p.id === saya));
  const [prPilih, setPrPilih] = useState(awal?.id ?? "");
  const [baris, setBaris] = useState<Baris[]>(() => (awal ? awal.barang.map(keBaris) : []));
  const [tanggal, setTanggal] = useState(hariIni);
  const [toko, setToko] = useState("");
  const [nota, setNota] = useState<string[]>([]);
  const [tanpaNota, setTanpaNota] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [lain, setLain] = useState({ nama: "", satuan: "" });
  const [menunggu, mulai] = useTransition();

  const idPemegang = orang?.id ?? saya;
  const sisa = saldo[idPemegang] ?? 0;
  // Total berjalan: baris yang jumlah & harganya sudah terisi (sisanya menyusul sambil belanja).
  const terisi = baris.map((b) => ({ qty: keAngka(b.qty), harga: keAngka(b.harga) })).filter((b) => b.qty > 0 && b.harga >= 0);
  const total = totalNota(terisi).toNumber();
  const lebih = total > sisa;
  const ganti = (kunci: string, isi: Partial<Baris>) => setBaris((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)));

  function simpan() {
    const kosong = baris.find((b) => !(keAngka(b.qty) > 0) || b.harga.trim() === "");
    if (kosong) return toast.error(`Isi jumlah & harga ${kosong.nama}, atau hapus barisnya.`);
    if (!nota.length && !tanpaNota) return toast.error("Foto notanya dulu, atau pilih “Tidak ada nota”.");
    mulai(async () => {
      try {
        await simpanBelanja({
          pemegang: idPemegang,
          prId: prPilih || null,
          tanggal,
          toko,
          nota: tanpaNota ? [] : nota,
          tanpaNota: tanpaNota ? alasan : "",
          catatan,
          baris: baris.map((b) => ({
            idBahan: b.idBahan,
            prItemId: b.prItemId,
            nama: b.nama,
            qty: keAngka(b.qty),
            satuan: b.satuan,
            harga: keAngka(b.harga),
          })),
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
        {pemegang.length ? (
          <div className="flex flex-col gap-1.5">
            <Label>Pemegang uang muka</Label>
            <PilihCari nilai={orang} pilihan={pemegang} onPilih={setOrang} />
          </div>
        ) : null}
        <p className="text-sm">
          Saldo uang muka: <b className="font-mono tabular-nums">{rupiah(sisa)}</b>
        </p>
        {pr.length ? (
          <div className="flex flex-col gap-1.5">
            <Label>Belanja untuk PR (barang terisi otomatis)</Label>
            <PilihanChip
              label="PR"
              nilai={prPilih}
              onPilih={(v) => {
                const p = pr.find((x) => x.id === v);
                const lepas = v === prPilih;
                setPrPilih(lepas ? "" : v);
                // Barang dari PR sebelumnya diganti; barang tambahan sendiri tetap.
                setBaris((s) => [...s.filter((b) => !b.prItemId), ...(lepas || !p ? [] : p.barang.map(keBaris))]);
              }}
              pilihan={pr.map((p) => ({ nilai: p.id, label: p.label }))}
            />
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Tanggal belanja</Label>
            <PilihTanggal value={tanggal} onChange={setTanggal} bisaHapus={false} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="toko">Toko / pedagang</Label>
            <Input id="toko" value={toko} onChange={(e) => setToko(e.target.value)} placeholder="mis. Pasar Bogor — Bu Imas" />
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border bg-card">
        <h2 className="eyebrow border-b p-4">Barang · {baris.length}</h2>
        {!baris.length ? <p className="p-4 text-sm text-muted-foreground">Belum ada barang. Pilih PR di atas atau tambah barang di bawah.</p> : null}
        <ul className="divide-y">
          {baris.map((b) => {
            const q = keAngka(b.qty);
            const h = keAngka(b.harga);
            return (
              <li key={b.kunci} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{b.nama}</p>
                  <Button variant="ghost" size="icon" aria-label={`Hapus ${b.nama}`} onClick={() => setBaris((s) => s.filter((x) => x.kunci !== b.kunci))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={b.qty} inputMode="decimal" onChange={(e) => ganti(b.kunci, { qty: e.target.value })} className="w-20 text-right font-mono tabular-nums" aria-label={`Jumlah ${b.nama}`} />
                  <Input value={b.satuan} onChange={(e) => ganti(b.kunci, { satuan: e.target.value })} className="w-24" placeholder="satuan" aria-label={`Satuan ${b.nama}`} />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    value={b.harga ? Number(b.harga).toLocaleString("id-ID") : ""}
                    inputMode="numeric"
                    onChange={(e) => ganti(b.kunci, { harga: e.target.value.replace(/\D/g, "") })}
                    className="w-32 text-right font-mono tabular-nums"
                    placeholder="Harga"
                    aria-label={`Harga ${b.nama}`}
                  />
                  <span className="ml-auto font-mono tabular-nums">= {q > 0 && h >= 0 ? rupiah(nilaiBarisNota(q, h)) : "—"}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 border-t p-4">
          <PilihCari pilihan={bahan} placeholder="+ Tambah bahan dari master…" onPilih={(p) => setBaris((s) => [...s, keBaris({ prItemId: null, idBahan: p.id, nama: p.label, qty: 1, satuan: p.sub?.split(" · ").at(-1) ?? "" })])} />
          <div className="flex flex-wrap gap-2">
            <Input value={lain.nama} onChange={(e) => setLain({ ...lain, nama: e.target.value })} placeholder="Barang lain (gas, es batu, …)" className="min-w-0 basis-full sm:flex-1 sm:basis-auto" aria-label="Nama barang lain" />
            <Input value={lain.satuan} onChange={(e) => setLain({ ...lain, satuan: e.target.value })} placeholder="Satuan" className="min-w-0 flex-1 sm:w-24 sm:flex-none" aria-label="Satuan barang lain" />
            <Button
              variant="outline"
              disabled={!lain.nama.trim()}
              onClick={() => {
                setBaris((s) => [...s, keBaris({ prItemId: null, idBahan: null, nama: lain.nama.trim(), qty: 1, satuan: lain.satuan.trim() })]);
                setLain({ nama: "", satuan: "" });
              }}
            >
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
        <Label>Nota</Label>
        {!tanpaNota ? <FotoNota jalur={nota} onUbah={setNota} /> : null}
        <PilihanChip
          kecil
          label="Nota"
          nilai={tanpaNota ? "tanpa" : "ada"}
          onPilih={(v) => setTanpaNota(v === "tanpa")}
          pilihan={[
            { nilai: "ada", label: "Ada nota" },
            { nilai: "tanpa", label: "Tidak ada nota" },
          ]}
        />
        {tanpaNota ? (
          <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan, mis. pedagang pasar tidak memberi nota" aria-label="Alasan tanpa nota" />
        ) : null}
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan (opsional)" aria-label="Catatan belanja" />
      </section>

      {/* Bilah total menempel di bawah — dipakai di HP sambil belanja. */}
      <div className="sticky bottom-0 z-20 rounded-[14px] border bg-card/95 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className={`text-xs ${lebih ? "text-tempo" : "text-muted-foreground"}`}>{lebih ? `Melebihi saldo ${rupiah(sisa)}` : `Sisa saldo sesudah ini ${rupiah(sisa - total)}`}</p>
            <p className="uang truncate text-lg">{rupiah(total)}</p>
          </div>
          <Button className="h-11 shrink-0 px-5" disabled={menunggu || !baris.length || lebih} onClick={simpan}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Simpan nota
          </Button>
        </div>
      </div>
    </div>
  );
}
