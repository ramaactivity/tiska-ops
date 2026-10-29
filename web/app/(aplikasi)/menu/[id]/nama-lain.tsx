"use client";

import { Combine, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { gabungkanMenu, hapusNamaLain, tambahNamaLain } from "../actions";

/** Nama lain (nama jual) sebuah menu dapur + gabungkan menu kembar ke sini (D-122). */
export function NamaLain({ idMenu, nama, namaLain, menuLain }: { idMenu: string; nama: string; namaLain: { id: string; name: string }[]; menuLain: OpsiCari[] }) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [baru, setBaru] = useState("");
  const [gabung, setGabung] = useState<OpsiCari | undefined>();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const jalan = (kerja: () => Promise<{ ok: boolean; pesan: string }>, sesudah?: () => void) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) toast.error(r.pesan);
      else {
        toast.success(r.pesan);
        sesudah?.();
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {namaLain.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {namaLain.map((a) => (
            <li key={a.id} className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
              {a.name}
              <button type="button" aria-label={`Hapus nama lain ${a.name}`} disabled={menunggu} onClick={() => jalan(() => hapusNamaLain(a.id))} className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada nama lain.</p>
      )}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (baru.trim()) jalan(() => tambahNamaLain(idMenu, baru), () => setBaru(""));
        }}
      >
        <Input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder="Nama di pricelist / paket, mis. Sambal (Sambal Bawang)" aria-label="Nama lain baru" className="min-w-56 flex-1" />
        <Button type="submit" size="sm" variant="outline" className="h-10 rounded-full" disabled={menunggu || !baru.trim()}>
          <Plus className="size-4" />
          Tambah nama lain
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t pt-3">
        <p className="text-sm text-muted-foreground">Ada menu lain yang sebenarnya sama? Gabungkan ke menu ini — namanya jadi nama lain, paket & dokumennya ikut pindah.</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs">
            <PilihCari nilai={gabung} pilihan={menuLain} onPilih={setGabung} placeholder="Cari menu yang sama…" />
          </div>
          <Button type="button" size="sm" className="rounded-full" disabled={menunggu || !gabung} onClick={() => setKonfirmasi(true)}>
            <Combine className="size-3.5" />
            Gabungkan ke sini
          </Button>
        </div>
      </div>
      <Dialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gabungkan &quot;{gabung?.label}&quot; ke &quot;{nama}&quot;?</DialogTitle>
            <DialogDescription>
              &quot;{gabung?.label}&quot; dinonaktifkan dan namanya menjadi nama lain menu ini. Paket, pilihan paket, quotation, invoice, dan Ikut Menu Pesta yang memakainya pindah
              ke sini. Teks dokumen yang sudah dicetak tidak berubah.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setKonfirmasi(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={menunggu || !gabung}
              onClick={() => {
                setKonfirmasi(false);
                if (gabung) jalan(() => gabungkanMenu(idMenu, [gabung.id], null), () => setGabung(undefined));
              }}
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Combine className="size-4" />}
              Gabungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
