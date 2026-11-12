"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TombolCetak() {
  return (
    <Button size="lg" className="h-12 w-full justify-between rounded-[12px] text-base" onClick={() => window.print()}>
      <span className="flex items-center gap-2.5">
        <Printer className="size-5" strokeWidth={1.75} />
        Cetak
      </span>
      <kbd className="rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-xs font-medium text-primary-foreground/85">Ctrl / ⌘ P</kbd>
    </Button>
  );
}
