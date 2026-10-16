import { type PilihanAvatar, urlAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Avatar orang gaya Notionists (D-061), dipotong kepala saja seperti
 * referensi desain. Customer/perusahaan tetap memakai inisial.
 */
export function AvatarOrang({ pilihan, nama, className }: { pilihan: PilihanAvatar; nama: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={nama}
      className={cn("block shrink-0 overflow-hidden rounded-full border bg-card bg-no-repeat", className)}
      // Hijab lebih tinggi dari rambut: potongannya dilonggarkan supaya puncaknya tidak terpotong.
      style={{ backgroundImage: `url("${urlAvatar(pilihan)}")`, backgroundSize: pilihan.hijab ? "155%" : "180%", backgroundPosition: pilihan.hijab ? "50% 26%" : "50% 22.5%" }}
    />
  );
}
