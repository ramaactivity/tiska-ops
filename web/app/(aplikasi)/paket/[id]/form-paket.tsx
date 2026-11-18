"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { InputSaran } from "@/components/input-saran";
import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IsianRupiahForm } from "@/components/isian-rupiah";

import { type KeadaanPaket, simpanPaket } from "../actions";

const awal: KeadaanPaket = {};
type Baris = { kunci: number; menuId: string; note: string };

export function FormPaket({
  paket,
  isi: isiAwal,
  menu,
  bentuk,
  lini,
}: {
  /** id kosong = paket baru. */
  paket: { id: string; name: string; line: string | null; price: string | null; serviceFormId: string | null; status: string; notes: string | null };
  isi: { menuId: string; note: string }[];
  /** Pilihan menu (nama saja, tanpa biaya). */
  menu: OpsiCari[];
  bentuk: { id: string; name: string }[];
  /** Lini yang sudah ada, untuk saran (kode paket baru mengikuti lini). */
  lini: string[];
}) {
  const [keadaan, kirim, sedang] = useActionState(simpanPaket, awal);
  const urut = useRef(isiAwal.length);
  const [isi, setIsi] = useState<Baris[]>(isiAwal.map((x, i) => ({ kunci: i, ...x })));
  const [linePaket, setLinePaket] = useState(paket.line ?? "");
  const peta = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  const g = keadaan.galat ?? {};
  const ubah = (kunci: number, x: Partial<Baris>) => setIsi((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...x } : b)));

  return (
    <form action={kirim} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={paket.id} />
      <input type="hidden" name="line" value={linePaket} />
      <input type="hidden" name="isi" value={JSON.stringify(isi.map(({ menuId, note }) => ({ menuId, note })))} />
      {keadaan.pesan && !keadaan.sukses ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {keadaan.pesan}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Nama paket" galat={g.name}>
          <Input name="name" defaultValue={paket.name} aria-invalid={Boolean(g.name)} />
        </Bidang>
        <Bidang label="Harga jual / porsi" galat={g.price}>
          <IsianRupiahForm name="price" nilaiAwal={paket.price ? Number(paket.price).toString() : ""} aria-invalid={Boolean(g.price)} />
        </Bidang>
        <Bidang label="Lini">
          <InputSaran value={linePaket} onChange={setLinePaket} saran={lini} placeholder="mis. Basic Style Lunch Box" aria-label="Lini" />
        </Bidang>
        {paket.id ? null : (
          <Bidang label="Kode" galat={g.code}>
            <Input name="code" placeholder="Kosongkan = otomatis mengikuti lini (mis. BS-25)" className="nomor-dokumen" aria-invalid={Boolean(g.code)} />
          </Bidang>
        )}
      </div>

      <Bidang label="Bentuk penyajian">
        <Pilihan nama="service_form_id" nilai={paket.serviceFormId ?? ""} opsi={[["", "Belum diisi"], ...bentuk.map((b) => [b.id, b.name] as const)]} />
      </Bidang>
      <Bidang label="Status">
        <Pilihan nama="status" nilai={paket.status} opsi={[["aktif", "Aktif"], ["arsip", "Arsip (tidak dijual)"]]} />
      </Bidang>

      <div className="flex flex-col gap-2">
        <Label>Isi paket</Label>
        <ol className="flex flex-col gap-2">
          {isi.map((b, i) => (
            <li key={b.kunci} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 sm:flex-nowrap">
              <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <PilihCari nilai={peta.get(b.menuId)} pilihan={menu} onPilih={(m) => ubah(b.kunci, { menuId: m.id })} placeholder="Ketik nama menu…" />
              </div>
              <Input
                value={b.note}
                onChange={(e) => ubah(b.kunci, { note: e.target.value })}
                placeholder="catatan (opsional)"
                aria-label={`Catatan baris ${i + 1}`}
                className="sm:w-44"
              />
              <Button type="button" variant="ghost" size="icon" aria-label={`Hapus baris ${i + 1}`} onClick={() => setIsi((s) => s.filter((x) => x.kunci !== b.kunci))}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
        <div>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsi((s) => [...s, { kunci: ++urut.current, menuId: "", note: "" }])}>
            <Plus className="size-4" /> Tambah menu
          </Button>
        </div>
      </div>

      <Bidang label="Catatan">
        <Textarea name="notes" rows={2} defaultValue={paket.notes ?? ""} />
      </Bidang>

      <div>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : paket.id ? "Simpan paket" : "Tambah paket"}
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
          key={v || "kosong"}
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
