"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { AvatarOrang } from "@/components/avatar-orang";
import { PilihanChip } from "@/components/pilihan-chip";
import { berkasWajah, KELOMPOK_WAJAH, uraiAvatar, wajahKelompok } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Pemilih avatar (D-108): 96 wajah Tiska dalam 6 kelompok. Avatar lama
 * (Notionists) tetap bisa dipertahankan selama tidak diganti.
 * Untuk form biasa — nilainya di input tersembunyi `name`.
 */
export function PilihAvatar({ username, defaultValue, name = "avatar" }: { username: string; defaultValue: string | null; name?: string }) {
  // Belum pernah memilih = wajah Notionists dari username; tetap ditawarkan sebagai "avatar lama".
  const sekarang = defaultValue || username;
  const lama = !berkasWajah(sekarang.split("|")[0]) ? sekarang : null;
  const [nilai, setNilai] = useState(sekarang);
  const awalKelompok = berkasWajah(nilai) ? nilai[2] : "l";
  const [kelompok, setKelompok] = useState<string>(awalKelompok);

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
      <AvatarOrang pilihan={uraiAvatar(v, username)} nama="" className="size-12" />
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
      <PilihanChip kecil label="Kelompok wajah" nilai={kelompok} onPilih={setKelompok} pilihan={KELOMPOK_WAJAH.map((k) => ({ nilai: k.kode, label: k.label }))} />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Pilih wajah">
        {lama ? tombol(lama, "Avatar lama") : null}
        {wajahKelompok(kelompok).map((v, i) => tombol(v, `${KELOMPOK_WAJAH.find((k) => k.kode === kelompok)?.label} ${i + 1}`))}
      </div>
      {lama ? <p className="text-xs text-muted-foreground">Kotak pertama = avatar lama. Pilih wajah lain untuk menggantinya.</p> : null}
    </div>
  );
}
