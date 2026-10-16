"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { AvatarOrang } from "@/components/avatar-orang";
import { uraiAvatar, variasiSeed } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Pemilih avatar (D-061): 12 variasi wajah Notionists + saklar hijab.
 * Untuk form biasa — nilainya di input tersembunyi `name`.
 */
export function PilihAvatar({ username, defaultValue, name = "avatar" }: { username: string; defaultValue: string | null; name?: string }) {
  const awal = uraiAvatar(defaultValue, username);
  const [seed, setSeed] = useState(awal.seed);
  const [hijab, setHijab] = useState(awal.hijab);
  const pilihan = variasiSeed(username);
  if (!pilihan.includes(awal.seed)) pilihan[pilihan.length - 1] = awal.seed;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={`${seed}${hijab ? "|hijab" : ""}`} />
      <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Pilih wajah">
        {pilihan.map((s, i) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === seed}
            aria-label={`Wajah ${i + 1}`}
            onClick={() => setSeed(s)}
            className={cn(
              "relative mx-auto rounded-full p-0.5 transition-shadow",
              s === seed ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border-strong",
            )}
          >
            <AvatarOrang pilihan={{ seed: s, hijab }} nama="" className="size-12" />
            {s === seed ? (
              <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Penutup kepala">
        {[
          [false, "Tanpa hijab"],
          [true, "Pakai hijab"],
        ].map(([v, label]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={hijab === v}
            onClick={() => setHijab(v as boolean)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
              hijab === v ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {label as string}
          </button>
        ))}
      </div>
    </div>
  );
}
