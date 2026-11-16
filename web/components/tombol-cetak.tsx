"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Cetak ke printer lewat dialog browser. PDF langsung ada di TombolPdf. */
export function TombolCetak() {
  return (
    <Button size="lg" variant="outline" className="h-11 w-full justify-between rounded-[12px] bg-card text-[0.9375rem]" onClick={() => window.print()}>
      <span className="flex items-center gap-2.5">
        <Printer className="size-[18px]" strokeWidth={1.75} />
        Cetak ke printer
      </span>
      <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">Ctrl / ⌘ P</kbd>
    </Button>
  );
}
