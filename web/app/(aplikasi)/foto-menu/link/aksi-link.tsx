"use client";

import { Copy, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { matikanLinkGaleri } from "../actions";

export function AksiLink({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  return (
    <span className="inline-flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${location.origin}/galeri/${token}`);
            toast.success("Link disalin.");
          } catch {
            toast.error("Gagal menyalin.");
          }
        }}
      >
        <Copy className="size-3.5" />
        Salin
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="rounded-full"
        disabled={menunggu}
        onClick={() =>
          mulai(async () => {
            const r = await matikanLinkGaleri(id);
            if (r.ok) toast.success(r.pesan);
            else toast.error(r.pesan);
            router.refresh();
          })
        }
      >
        <Power className="size-3.5" />
        Matikan
      </Button>
    </span>
  );
}
