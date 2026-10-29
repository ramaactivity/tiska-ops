"use client";

import { LoaderCircle, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KATEGORI_MENU, LABEL_DAPUR } from "@/lib/menu";

import { type KeadaanMenu, simpanMenu } from "../actions";

const awal: KeadaanMenu = {};

export function FormMenu({
  menu,
  resep,
}: {
  /** id kosong = menu baru. */
  menu: { id: string; name: string; category: string | null; kitchen: string | null; recipeId: string | null; faktor: string; active: boolean };
  /** Daftar resep (kode + nama, TANPA biaya). */
  resep: OpsiCari[];
}) {
  const [keadaan, kirim, sedang] = useActionState(simpanMenu, awal);
  const [resepId, setResepId] = useState(menu.recipeId ?? "");
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);
  const g = keadaan.galat ?? {};
  const terpilih = resep.find((r) => r.id === resepId);

  return (
    <form action={kirim} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={menu.id} />
      <input type="hidden" name="recipe_id" value={resepId} />
      {keadaan.pesan && !keadaan.sukses ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {keadaan.pesan}
        </p>
      ) : null}

      <Bidang label="Nama menu" galat={g.name}>
        <Input key={keadaan.nama ?? "awal"} name="name" defaultValue={keadaan.nama ?? menu.name} aria-invalid={Boolean(g.name)} />
        {keadaan.mirip ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="beda_menu" value="ya" />
            Ini memang menu berbeda
          </label>
        ) : null}
      </Bidang>

      <Bidang label="Resep" galat={g.recipe_id}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <PilihCari nilai={terpilih} pilihan={resep} onPilih={(r) => setResepId(r.id)} placeholder="Ketik nama atau kode resep…" />
          </div>
          {resepId ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Lepas resep" onClick={() => setResepId("")}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          Kalau terhubung, HPP menu di paket dihitung dari resep ini dan ikut harga bahan terbaru.
        </span>
      </Bidang>

      <Bidang label="Faktor porsi" galat={g.portion_factor}>
        <Input name="portion_factor" inputMode="decimal" defaultValue={Number(menu.faktor).toLocaleString("id-ID")} className="angka w-28 tabular-nums" />
        <span className="text-xs text-muted-foreground">
          Berapa porsi resep untuk satu sajian. Biasanya 1; &quot;Telur Balado ½&quot; = 0,5.
        </span>
      </Bidang>

      <Bidang label="Kategori" galat={g.category}>
        <Pilihan nama="category" nilai={menu.category ?? ""} opsi={[["", "Belum diisi"], ...Object.entries(KATEGORI_MENU)]} />
      </Bidang>

      <Bidang label="Dapur" galat={g.kitchen}>
        <Pilihan nama="kitchen" nilai={menu.kitchen ?? ""} opsi={[["", "Belum diisi"], ...Object.entries(LABEL_DAPUR)]} />
      </Bidang>

      <Bidang label="Status">
        <Pilihan nama="active" nilai={menu.active ? "ya" : "tidak"} opsi={[["ya", "Aktif"], ["tidak", "Tidak dijual"]]} />
      </Bidang>

      <div>
        <Button type="submit" disabled={sedang} className="rounded-full px-5">
          {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {sedang ? "Menyimpan…" : menu.id ? "Simpan menu" : "Tambah menu"}
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
