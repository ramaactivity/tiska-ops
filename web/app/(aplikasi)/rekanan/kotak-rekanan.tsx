"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";

import { setelRekananOrder } from "./actions";

/**
 * Kotak "Rekanan" di detail Quotation / Invoice (D-132): rekanan yang membawa order ini → Partner Fee.
 * Invoice tanpa rekanan sendiri ikut quotation-nya (`warisan`). `usulan` = rekanan yang tercatat membawa customer.
 */
export function KotakRekanan({
  jenis,
  idDokumen,
  nilai,
  warisan,
  usulan,
  opsi,
  keterangan,
  terkunci,
}: {
  jenis: "quotation" | "invoice";
  idDokumen: string;
  nilai: OpsiCari | null;
  warisan?: OpsiCari | null;
  usulan: OpsiCari | null;
  opsi: OpsiCari[];
  keterangan?: string | null;
  terkunci?: boolean;
}) {
  const router = useRouter();
  const [ubah, setUbah] = useState(false);
  const [menunggu, mulai] = useTransition();
  const efektif = nilai ?? warisan ?? null;
  const setel = (id: string | null) =>
    mulai(async () => {
      const r = await setelRekananOrder(jenis, idDokumen, id);
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      setUbah(false);
      router.refresh();
    });

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="eyebrow pb-2.5">Rekanan</h2>
      {efektif ? (
        <p className="text-sm">
          Dibawa oleh{" "}
          <Link href={`/rekanan/${efektif.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {efektif.label}
          </Link>
          {!nilai && warisan ? <span className="text-muted-foreground"> (dari quotation)</span> : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Bukan dari rekanan.</p>
      )}
      {keterangan ? <p className="mt-1 text-xs text-muted-foreground">{keterangan}</p> : null}
      {terkunci ? (
        <p className="mt-2 text-xs text-muted-foreground">Partner Fee sudah dibayar — rekanan tidak bisa diganti.</p>
      ) : ubah ? (
        <div className="mt-2 flex flex-col gap-2">
          <PilihCari pilihan={opsi} onPilih={(o) => setel(o.id)} placeholder="Ketik nama EO / WO / MC…" autoFocus />
          <div className="flex flex-wrap gap-1">
            {efektif ? (
              <Button size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => setel(null)}>
                Bukan dari rekanan
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setUbah(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {!efektif && usulan ? (
            <Button size="sm" className="rounded-full" disabled={menunggu} onClick={() => setel(usulan.id)}>
              Tetapkan {usulan.label}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setUbah(true)}>
            {efektif ? "Ganti" : "Pilih rekanan"}
          </Button>
        </div>
      )}
      {!efektif && usulan && !ubah ? <p className="mt-1.5 text-xs text-muted-foreground">Customer ini tercatat dibawa {usulan.label}.</p> : null}
    </section>
  );
}
