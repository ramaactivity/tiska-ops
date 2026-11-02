"use client";

import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { aktifkanRekanan } from "./actions";

export function AktifRekanan({ id, aktif }: { id: string; aktif: boolean }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  return (
    <Button
      variant="ghost"
      className="rounded-full"
      disabled={menunggu}
      onClick={() =>
        mulai(async () => {
          const r = await aktifkanRekanan(id, !aktif);
          if (r.ok) toast.success(r.pesan);
          else toast.error(r.pesan);
          router.refresh();
        })
      }
    >
      {aktif ? <Pause className="size-4" /> : <Play className="size-4" />}
      {aktif ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}
