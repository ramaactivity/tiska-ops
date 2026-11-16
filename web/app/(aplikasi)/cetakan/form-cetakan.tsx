"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihDropdown } from "@/components/pilih-dropdown";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Cetakan } from "@/lib/cetakan";
import { GRUP_CETAKAN, JENIS_CETAKAN } from "@/lib/hitung/cetakan";
import { cn } from "@/lib/utils";

import { simpanCetakan } from "./actions";

/** "11,5" → 11.5; kosong → null; bukan angka → NaN (ditolak server dengan pesan jelas). */
const angka = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));
const cmKeMm = (s: string) => {
  const n = angka(s);
  return n == null || Number.isNaN(n) ? n : Math.round(n * 100) / 10;
};
const mmKeCm = (mm: number | null) => (mm == null ? "" : String(mm / 10).replace(".", ","));

export function FormCetakan({ awal, percetakan, onSelesai }: { awal: Cetakan | null; percetakan: { id: string; label: string }[]; onSelesai: () => void }) {
  const [isi, setIsi] = useState({
    nama: awal?.nama ?? "",
    grup: awal?.grup ?? "",
    jenis: awal?.jenis ?? "stok",
    bentuk: awal?.bentuk ?? "persegi",
    lebar: mmKeCm(awal?.lebarMm ?? null),
    tinggi: mmKeCm(awal?.tinggiMm ?? null),
    bahan: awal?.bahan ?? "",
    finishing: awal?.finishing ?? "",
    isiPerA3: awal?.isiPerA3 ? String(awal.isiPerA3) : "",
    hargaPerA3: awal?.hargaPerA3 != null ? String(awal.hargaPerA3) : "",
    catatanHarga: awal?.catatanHarga ?? "",
    judulChat: awal && awal.judulChat !== awal.nama ? awal.judulChat : "",
    ukuranChat: awal && awal.ukuranChat !== awal.ukuran ? awal.ukuranChat : "",
    canva: awal?.canva ?? "",
    catatan: awal?.catatan ?? "",
    percetakanId: awal?.percetakan?.id ?? percetakan[0]?.id ?? "",
    satuanStok: awal?.satuanStok ?? "lembar",
    stokMin: awal?.stokMin != null ? String(awal.stokMin) : "",
  });
  const [sedang, mulai] = useTransition();
  const ganti = (k: keyof typeof isi) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setIsi((s) => ({ ...s, [k]: e.target.value }));

  function simpan() {
    mulai(async () => {
      const h = await simpanCetakan({
        id: awal?.id ?? null,
        nama: isi.nama,
        grup: isi.grup as never,
        jenis: isi.jenis as "stok" | "pesanan",
        bentuk: isi.bentuk as "persegi" | "lingkaran",
        lebarMm: cmKeMm(isi.lebar),
        tinggiMm: cmKeMm(isi.tinggi),
        bahan: isi.bahan,
        finishing: isi.finishing,
        isiPerA3: angka(isi.isiPerA3),
        hargaPerA3: angka(isi.hargaPerA3),
        catatanHarga: isi.catatanHarga,
        judulChat: isi.judulChat,
        ukuranChat: isi.ukuranChat,
        canva: isi.canva.trim(),
        catatan: isi.catatan,
        percetakanId: isi.percetakanId || null,
        satuanStok: isi.satuanStok as "lembar" | "pcs",
        stokMin: angka(isi.stokMin),
      });
      if (h.ok) {
        toast.success(h.pesan);
        onSelesai();
      } else toast.error(h.pesan);
    });
  }

  return (
    <>
      <div>
        <DialogTitle className="text-lg font-semibold">{awal ? `Ubah ${awal.nama}` : "Cetakan baru"}</DialogTitle>
        <DialogDescription className="mt-1">Data ini yang dipakai untuk teks pesan ke percetakan.</DialogDescription>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Nama cetakan *" className="sm:col-span-2">
          <Input value={isi.nama} onChange={ganti("nama")} placeholder="mis. Stiker Minuman Kecil" />
        </Bidang>
        <Bidang label="Kelompok *">
          <PilihDropdown nilai={isi.grup} onPilih={(g) => setIsi((s) => ({ ...s, grup: g }))} kelompok={[{ opsi: Object.entries(GRUP_CETAKAN).map(([id, label]) => ({ id, label })) }]} />
        </Bidang>
        <Bidang label="Percetakan">
          <PilihDropdown nilai={isi.percetakanId} onPilih={(id) => setIsi((s) => ({ ...s, percetakanId: id }))} kelompok={[{ opsi: percetakan }]} placeholder="Belum diatur" />
        </Bidang>
        <Bidang label="Jenis">
          <Pil nilai={isi.jenis} opsi={Object.entries(JENIS_CETAKAN)} onPilih={(v) => setIsi((s) => ({ ...s, jenis: v }))} />
        </Bidang>
        <Bidang label="Bentuk potong">
          <Pil nilai={isi.bentuk} opsi={[["persegi", "Persegi"], ["lingkaran", "Lingkaran"]]} onPilih={(v) => setIsi((s) => ({ ...s, bentuk: v }))} />
        </Bidang>
        {isi.jenis === "stok" ? (
          <>
            <Bidang label="Stok dihitung per">
              <Pil nilai={isi.satuanStok} opsi={[["lembar", "Lembar A3"], ["pcs", "Pcs (sudah dipotong)"]]} onPilih={(v) => setIsi((s) => ({ ...s, satuanStok: v }))} />
            </Bidang>
            <Bidang label="Stok minimum" petunjuk="Di bawah angka ini kartu bertanda Menipis">
              <Input value={isi.stokMin} onChange={ganti("stokMin")} inputMode="numeric" placeholder="mis. 2" className="angka tabular-nums" />
            </Bidang>
          </>
        ) : null}
        <Bidang label="Lebar (cm)">
          <Input value={isi.lebar} onChange={ganti("lebar")} inputMode="decimal" placeholder="mis. 11" className="angka tabular-nums" />
        </Bidang>
        <Bidang label="Tinggi (cm)">
          <Input value={isi.tinggi} onChange={ganti("tinggi")} inputMode="decimal" placeholder="mis. 6,6" className="angka tabular-nums" />
        </Bidang>
        <Bidang label="Bahan">
          <Input value={isi.bahan} onChange={ganti("bahan")} placeholder="mis. BW Carton, Sticker Chromo glossy" />
        </Bidang>
        <Bidang label="Finishing">
          <Input value={isi.finishing} onChange={ganti("finishing")} placeholder="mis. Potong pas ukuran, Half cut" />
        </Bidang>
        <Bidang label="Isi per lembar A3 (pcs)">
          <Input value={isi.isiPerA3} onChange={ganti("isiPerA3")} inputMode="numeric" placeholder="mis. 12" className="angka tabular-nums" />
        </Bidang>
        <Bidang label="Harga per lembar A3 (Rp)">
          <Input value={isi.hargaPerA3} onChange={ganti("hargaPerA3")} inputMode="numeric" placeholder="mis. 8500" className="angka tabular-nums" />
        </Bidang>
        <Bidang label="Asal harga" className="sm:col-span-2">
          <Input value={isi.catatanHarga} onChange={ganti("catatanHarga")} placeholder="mis. Nota Oke Print 26245, 23 Okt 2026" />
        </Bidang>
        <Bidang label="Judul di chat" petunjuk={`Kosong = "${isi.nama || "nama cetakan"}"`}>
          <Input value={isi.judulChat} onChange={ganti("judulChat")} placeholder="mis. Sticker Tiska Besar 7x7cm" />
        </Bidang>
        <Bidang label="Ukuran di chat" petunjuk="Kosong = dari lebar × tinggi">
          <Input value={isi.ukuranChat} onChange={ganti("ukuranChat")} placeholder="mis. Diameter 7 cm" />
        </Bidang>
        <Bidang label="Link Canva" className="sm:col-span-2">
          <Input value={isi.canva} onChange={ganti("canva")} inputMode="url" placeholder="https://www.canva.com/design/…" />
        </Bidang>
        <Bidang label="Catatan" className="sm:col-span-2">
          <Textarea value={isi.catatan} onChange={ganti("catatan")} rows={2} placeholder="mis. Satu menu dicetak 1 pcs; dipisah per set menu" />
        </Bidang>
      </div>
      <DialogFooter>
        <Button variant="ghost" className="rounded-full" onClick={onSelesai}>
          Batal
        </Button>
        <Button className="rounded-full px-6" onClick={simpan} disabled={sedang}>
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : "Simpan"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Bidang({ label, petunjuk, className, children }: { label: string; petunjuk?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {petunjuk ? <span className="text-xs text-muted-foreground">{petunjuk}</span> : null}
    </div>
  );
}

function Pil({ nilai, opsi, onPilih }: { nilai: string; opsi: [string, string][]; onPilih: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {opsi.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={nilai === v}
          onClick={() => onPilih(v)}
          className={cn(
            "min-h-10 rounded-full border px-4 text-sm transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97]",
            nilai === v ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:border-primary/40",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
