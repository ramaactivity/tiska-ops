"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { tandaiInvoiceLama } from "./actions";

/** Kotak di detail invoice: invoice lama dihitung sebagai pesanan Ikut Menu Pesta untuk stempel loyalti. */
export function KotakInvoiceLama({ idInvoice, pax, saran, lunas }: { idInvoice: string; pax: number | null; saran: number; lunas: boolean }) {
  const router = useRouter();
  const [ubah, setUbah] = useState(false);
  const [n, setN] = useState(pax ?? saran);
  const [menunggu, mulai] = useTransition();
  const simpan = (nilai: number | null) =>
    mulai(async () => {
      const r = await tandaiInvoiceLama(idInvoice, nilai);
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      setUbah(false);
      router.refresh();
    });
  const atur = (x: number) => setN(Math.max(1, Math.min(1000, x || 1)));

  return (
    <section className="kartu p-4">
      <h2 className="eyebrow pb-2.5">Loyalti Ikut Menu Pesta</h2>
      {pax && !ubah ? (
        <>
          <p className="text-sm">
            Dihitung sebagai pesanan Ikut Menu Pesta · <span className="font-medium">{pax} pax</span>
          </p>
          {!lunas ? <p className="mt-1 text-sm text-muted-foreground">Jadi stempel setelah invoice lunas.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => setUbah(true)}>
              Ubah pax
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => simpan(null)}>
              Jangan dihitung
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Pesanan Ikut Menu Pesta sebelum programnya dicatat di Tiska Ops? Tandai supaya ikut jadi stempel loyalti.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="outline" size="icon-lg" className="rounded-full" aria-label="Kurangi pax" onClick={() => atur(n - 1)}>
              <Minus className="size-4" />
            </Button>
            <Input aria-label="Jumlah pax" inputMode="numeric" className="h-11 w-20 text-center font-mono text-lg" value={String(n)} onChange={(e) => atur(Number(e.target.value.replace(/\D/g, "")))} />
            <Button type="button" variant="outline" size="icon-lg" className="rounded-full" aria-label="Tambah pax" onClick={() => atur(n + 1)}>
              <Plus className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">pax</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" disabled={menunggu} onClick={() => simpan(n)}>
              Hitung untuk loyalti
            </Button>
            {ubah ? (
              <Button size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => setUbah(false)}>
                Batal
              </Button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
