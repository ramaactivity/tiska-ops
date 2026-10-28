"use client";

import { Camera, Check, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { unggahFotoProfil } from "@/app/(aplikasi)/pengguna/actions";

import { AvatarOrang } from "@/components/avatar-orang";
import { Button } from "@/components/ui/button";
import { PilihanChip } from "@/components/pilihan-chip";
import { berkasWajah, fotoAsli, type JenisKelamin, KELOMPOK_WAJAH, uraiAvatar, wajahUntuk } from "@/lib/avatar";
import { fotoProfilPersegi } from "@/lib/foto";
import { cn } from "@/lib/utils";

/**
 * Pemilih avatar (D-108): 96 wajah Tiska dalam 6 kelompok, atau foto asli
 * (D-113). Avatar lama (Notionists) tetap bisa dipertahankan selama tidak diganti.
 * Untuk form biasa — nilainya di input tersembunyi `name`.
 */
export function PilihAvatar({
  username,
  defaultValue,
  jenisKelamin,
  name = "avatar",
}: {
  username: string;
  defaultValue: string | null;
  /** D-111: hanya wajah yang sesuai (+ netral). Belum diisi = semua. */
  jenisKelamin?: JenisKelamin | null;
  name?: string;
}) {
  // Belum pernah memilih = wajah bawaan (sesuai jenis kelamin bila diisi); Notionists lama ditawarkan sebagai "avatar lama".
  const sekarang = defaultValue || uraiAvatar(null, username, jenisKelamin).seed;
  const [foto, setFoto] = useState(fotoAsli(sekarang) ? sekarang : null);
  const lama = !berkasWajah(sekarang.split("|")[0]) && !fotoAsli(sekarang) ? sekarang : null;
  const [nilai, setNilai] = useState(sekarang);
  const [mengunggah, setMengunggah] = useState(false);
  const pemilihBerkas = useRef<HTMLInputElement>(null);

  async function unggah(berkas: File | undefined) {
    if (!berkas) return;
    setMengunggah(true);
    try {
      const isi = new FormData();
      isi.set("foto", await fotoProfilPersegi(berkas));
      const v = await unggahFotoProfil(isi);
      setFoto(v);
      setNilai(v);
      toast.success("Foto siap. Tekan Simpan untuk memakainya.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto gagal diunggah.");
    } finally {
      setMengunggah(false);
      if (pemilihBerkas.current) pemilihBerkas.current.value = "";
    }
  }
  const kelompokAda = KELOMPOK_WAJAH.filter((k) => wajahUntuk(k.kode, jenisKelamin).length > 0);
  const [pilihKelompok, setKelompok] = useState<string>(berkasWajah(nilai) ? nilai[2] : "l");
  // Jenis kelamin diganti → kelompok yang tidak ada wajahnya pindah ke kelompok pertama yang ada.
  const kelompok = kelompokAda.some((k) => k.kode === pilihKelompok) ? pilihKelompok : (kelompokAda[0]?.kode ?? "x");

  const tombol = (v: string, label: string) => (
    <button
      key={v}
      type="button"
      role="radio"
      aria-checked={v === nilai}
      aria-label={label}
      onClick={() => setNilai(v)}
      className={cn("relative mx-auto rounded-full p-0.5 transition-shadow", v === nilai ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border-strong")}
    >
      <AvatarOrang pilihan={uraiAvatar(v, username, jenisKelamin)} nama="" className="size-12" />
      {v === nilai ? (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={nilai} />
      <div className="flex flex-wrap items-center gap-3">
        {foto ? <div>{tombol(foto, "Foto asli")}</div> : null}
        <Button type="button" size="sm" variant="outline" disabled={mengunggah} onClick={() => pemilihBerkas.current?.click()}>
          {mengunggah ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {foto ? "Ganti foto asli" : "Pakai foto asli"}
        </Button>
        <input ref={pemilihBerkas} type="file" accept="image/*" hidden onChange={(e) => unggah(e.target.files?.[0])} />
      </div>
      <PilihanChip kecil label="Kelompok wajah" nilai={kelompok} onPilih={setKelompok} pilihan={kelompokAda.map((k) => ({ nilai: k.kode, label: k.label }))} />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Pilih wajah">
        {lama ? tombol(lama, "Avatar lama") : null}
        {wajahUntuk(kelompok, jenisKelamin).map((v) => tombol(v, `${KELOMPOK_WAJAH.find((k) => k.kode === kelompok)?.label} ${Number(v.slice(3))}`))}
      </div>
      {lama ? <p className="text-xs text-muted-foreground">Kotak pertama = avatar lama. Pilih wajah lain untuk menggantinya.</p> : null}
    </div>
  );
}
