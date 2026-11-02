"use client";

import { MoreHorizontal, PencilLine, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { OpsiCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ubahStatusPelanggan } from "./actions";
import { DialogPelanggan, type Pelanggan } from "./dialog-pelanggan";

export function AksiBaris({ pelanggan, aktif, opsiRekanan }: { pelanggan: Pelanggan; aktif: boolean; opsiRekanan: OpsiCari[] }) {
  const [bukaUbah, setBukaUbah] = useState(false);
  const [menunggu, mulai] = useTransition();

  function gantiStatus() {
    mulai(async () => {
      try {
        await ubahStatusPelanggan(pelanggan.id);
        toast.success(
          aktif
            ? `${pelanggan.name} dinonaktifkan.`
            : `${pelanggan.name} diaktifkan kembali.`,
        );
      } catch {
        toast.error("Status gagal diubah. Coba lagi.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={menunggu}
              aria-label={`Tindakan untuk ${pelanggan.name}`}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setBukaUbah(true)}>
            <PencilLine className="size-4" />
            Ubah data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={gantiStatus}>
            <Power className="size-4" />
            {aktif ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogPelanggan
        opsiRekanan={opsiRekanan}
        pelanggan={pelanggan}
        terbuka={bukaUbah}
        onTerbukaChange={setBukaUbah}
      />
    </>
  );
}
