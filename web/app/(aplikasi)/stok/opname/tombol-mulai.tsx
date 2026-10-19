"use client";

import { ClipboardCheck, LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { mulaiOpname } from "./actions";

export function TombolMulaiOpname() {
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          try {
            await mulaiOpname();
          } catch (e) {
            if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
            toast.error(e instanceof Error ? e.message : "Gagal.");
          }
        })
      }
    >
      {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
      Mulai opname bulan ini
    </Button>
  );
}
