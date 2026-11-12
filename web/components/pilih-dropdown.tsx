"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type OpsiDropdown = { id: string; label: string };
export type KelompokDropdown = { judul?: string; opsi: OpsiDropdown[] };

/**
 * Dropdown pilih untuk daftar tetap yang pendek (kategori menu, jenis acara) — tanpa mengetik (D-166).
 * Pengganti <select> bawaan browser: daftar muncul DI BAWAH kotak (tidak menutupi kotaknya), dikelompokkan,
 * baris lega, pilihan aktif bertanda centang.
 */
export function PilihDropdown({
  id,
  nilai,
  kelompok,
  onPilih,
  placeholder = "Pilih…",
  className,
}: {
  id?: string;
  nilai: string;
  kelompok: KelompokDropdown[];
  onPilih: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const label = kelompok.flatMap((k) => k.opsi).find((o) => o.id === nilai)?.label;
  return (
    <SelectPrimitive.Root value={nilai || null} onValueChange={(v) => onPilih(String(v ?? ""))}>
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-left text-base outline-none transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-ring md:text-[0.9375rem]",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !label && "text-muted-foreground")}>{label ?? placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 in-data-popup-open:rotate-180" aria-hidden="true" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="isolate z-50">
          <SelectPrimitive.Popup className="max-h-[min(22rem,var(--available-height))] w-(--anchor-width) min-w-60 origin-(--transform-origin) overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-[0_12px_32px_-12px_rgba(31,42,92,0.28)] transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <SelectPrimitive.List>
              {kelompok.map((k, i) => (
                <SelectPrimitive.Group key={k.judul ?? i} className={cn(i > 0 && "mt-1 border-t pt-1")}>
                  {k.judul ? (
                    <SelectPrimitive.GroupLabel className="px-2.5 pt-1.5 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      {k.judul}
                    </SelectPrimitive.GroupLabel>
                  ) : null}
                  {k.opsi.map((o) => (
                    <SelectPrimitive.Item
                      key={o.id}
                      value={o.id}
                      className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[0.9375rem] outline-none select-none data-highlighted:bg-accent data-selected:font-medium data-selected:text-primary-strong"
                    >
                      <SelectPrimitive.ItemText className="min-w-0 flex-1">{o.label}</SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator>
                        <Check className="size-4 text-primary" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Group>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
