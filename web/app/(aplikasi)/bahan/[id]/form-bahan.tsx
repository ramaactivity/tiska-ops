"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KATEGORI_BAHAN, LABEL_STATUS_BAHAN } from "@/lib/bahan";

import { type KeadaanForm, simpanBahan, tambahHarga } from "../actions";

export type DataBahan = {
  /** Kosong = bahan baru. */
  id: string;
  name: string;
  category: string;
  brand: string | null;
  variant: string | null;
  purchase_qty: string | null;
  purchase_unit: string | null;
  usage_qty_per_pack: string | null;
  usage_unit: string | null;
  status: string;
};

const awal: KeadaanForm = {};
const ID_FORM_HARGA = "form-harga";

/**
 * Harga punya form & tombol sendiri ("Catat harga baru"), tetapi orang biasanya
 * mengisi harga lalu menekan "Simpan data bahan" — harganya hilang diam-diam
 * (laporan Reza 29 Okt). Jadi harga yang sudah diketik ikut dikirim. Urutan
 * kedua aksi tidak masalah: kalau konversi juga berubah, simpanBahan membuat
 * ulang harga per satuan dari harga kemasan terakhir.
 */
function kirimHargaTertunda() {
  const f = document.getElementById(ID_FORM_HARGA);
  if (f instanceof HTMLFormElement && String(new FormData(f).get("price_per_pack") ?? "").trim()) f.requestSubmit();
}
const tampilAngka = (s: string | null) => (s ? Number(s).toLocaleString("id-ID", { maximumFractionDigits: 6 }) : "");

export function FormBahan({ bahan }: { bahan: DataBahan }) {
  const [keadaan, kirim, sedang] = useActionState(simpanBahan, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  const g = keadaan.galat ?? {};

  return (
    <form action={kirim} onSubmit={kirimHargaTertunda} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={bahan.id} />
      {keadaan.pesan && !keadaan.sukses ? <Galat>{keadaan.pesan}</Galat> : null}

      <div className={bahan.id ? "grid gap-5" : "grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]"}>
        <Bidang label="Nama bahan" galat={g.name}>
          <Input name="name" defaultValue={bahan.name} aria-invalid={Boolean(g.name)} />
        </Bidang>
        {bahan.id ? null : (
          <Bidang label="Kode" galat={g.code}>
            <Input name="code" placeholder="otomatis" className="nomor-dokumen" aria-invalid={Boolean(g.code)} />
            {g.code ? null : <span className="text-xs text-muted-foreground">Kosongkan = otomatis sesuai kategori (Gcs-…, Mt-…)</span>}
          </Bidang>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Bidang label="Merk" galat={g.brand}>
          <Input name="brand" defaultValue={bahan.brand ?? ""} placeholder="opsional" />
        </Bidang>
        <Bidang label="Jenis / varian" galat={g.variant}>
          <Input name="variant" defaultValue={bahan.variant ?? ""} placeholder="opsional" />
        </Bidang>
      </div>

      <Bidang label="Kategori" galat={g.category}>
        <Pilihan nama="category" nilai={bahan.category} opsi={KATEGORI_BAHAN.map((k) => [k, k])} />
      </Bidang>

      <fieldset className="rounded-2xl border p-4">
        <legend className="px-1 text-sm font-medium">Kemasan beli & konversi</legend>
        <p className="pb-3 text-xs text-muted-foreground">
          Contoh: beli 25 Kilogram, di resep dipakai dalam Liter → isi per kemasan 33,25 Liter.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Isi kemasan beli" galat={g.purchase_qty}>
            <div className="flex gap-2">
              <Input name="purchase_qty" inputMode="decimal" defaultValue={tampilAngka(bahan.purchase_qty)} className="angka w-28 tabular-nums" placeholder="25" />
              <Input name="purchase_unit" defaultValue={bahan.purchase_unit ?? ""} placeholder="Kilogram" />
            </div>
          </Bidang>
          <Bidang label="= isi dalam satuan resep" galat={g.usage_qty_per_pack}>
            <div className="flex gap-2">
              <Input name="usage_qty_per_pack" inputMode="decimal" defaultValue={tampilAngka(bahan.usage_qty_per_pack)} className="angka w-28 tabular-nums" placeholder="33,25" />
              <Input name="usage_unit" defaultValue={bahan.usage_unit ?? ""} placeholder="Gram" />
            </div>
          </Bidang>
        </div>
      </fieldset>

      <Bidang label="Status data" galat={g.status}>
        <Pilihan nama="status" nilai={bahan.status} opsi={Object.entries(LABEL_STATUS_BAHAN)} />
      </Bidang>

      <div>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : bahan.id ? "Simpan data bahan" : "Tambah bahan"}
        </Button>
      </div>
    </form>
  );
}

/** Hanya dirender untuk owner/finance; server action-nya memeriksa ulang peran. */
export function FormHarga({ id, isiPerKemasan, satuan }: { id: string; isiPerKemasan: string | null; satuan: string | null }) {
  const [keadaan, kirim, sedang] = useActionState(tambahHarga, awal);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);

  if (!isiPerKemasan) {
    return <p className="text-sm text-muted-foreground">Isi dan simpan konversi kemasan dulu, baru harga bisa dicatat.</p>;
  }
  return (
    <form id={ID_FORM_HARGA} action={kirim} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={id} />
      {keadaan.pesan && !keadaan.sukses ? <Galat>{keadaan.pesan}</Galat> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Harga per kemasan beli" galat={keadaan.galat?.price_per_pack}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <Input name="price_per_pack" inputMode="numeric" placeholder="475.000" className="angka pl-9 tabular-nums" />
          </div>
          <span className="text-xs text-muted-foreground">
            Dibagi {Number(isiPerKemasan).toLocaleString("id-ID")} {satuan ?? ""} per kemasan = harga per {satuan ?? "satuan"}.
          </span>
        </Bidang>
        <Bidang label="Sumber / catatan">
          <Input name="source_note" placeholder="mis. nota pasar 14 Okt, supplier Sinar" />
        </Bidang>
      </div>
      <div>
        <Button type="submit" disabled={sedang} variant="outline" className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : "Catat harga baru"}
        </Button>
      </div>
    </form>
  );
}

function Pilihan({ nama, nilai, opsi }: { nama: string; nilai: string; opsi: (readonly [string, string])[] }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {opsi.map(([v, label]) => (
        <label
          key={v}
          className="flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:checked]:border-foreground/35 has-[:checked]:bg-accent has-[:checked]:font-medium"
        >
          <input type="radio" name={nama} value={v} defaultChecked={nilai === v} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

function Bidang({ label, galat, children }: { label: string; galat?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {galat ? <p className="text-xs text-destructive">{galat}</p> : null}
    </div>
  );
}

function Galat({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
