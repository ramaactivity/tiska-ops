"use client";

import { GitMerge, LoaderCircle, MoreHorizontal, PencilLine, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { customerMirip } from "@/lib/hitung/rekanan";

import { gabungkanPelanggan, ringkasPelanggan, ubahStatusPelanggan } from "./actions";
import { DialogPelanggan, type Pelanggan } from "./dialog-pelanggan";

type Pembanding = { id: string; nama: string; kode: string };

export function AksiBaris({ pelanggan, aktif, opsiRekanan, pembanding = [] }: { pelanggan: Pelanggan; aktif: boolean; opsiRekanan: OpsiCari[]; pembanding?: Pembanding[] }) {
  const [bukaUbah, setBukaUbah] = useState(false);
  const [bukaGabung, setBukaGabung] = useState(false);
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

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={() => setBukaUbah(true)}>
            <PencilLine className="size-4" />
            Ubah data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={gantiStatus}>
            <Power className="size-4" />
            {aktif ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
          {aktif ? (
            <DropdownMenuItem onClick={() => setBukaGabung(true)}>
              <GitMerge className="size-4" />
              Gabungkan ke customer lain…
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogPelanggan
        opsiRekanan={opsiRekanan}
        pelanggan={pelanggan}
        terbuka={bukaUbah}
        onTerbukaChange={setBukaUbah}
      />
      {bukaGabung ? <DialogGabung sumber={pelanggan} pembanding={pembanding} onTutup={() => setBukaGabung(false)} /> : null}
    </>
  );
}

/**
 * Gabungkan customer kembar (D-201): pilih customer yang dipertahankan, lihat berapa data yang pindah, lalu
 * gabungkan. Sumber dinonaktifkan, tidak dihapus.
 */
function DialogGabung({ sumber, pembanding, onTutup }: { sumber: Pelanggan; pembanding: Pembanding[]; onTutup: () => void }) {
  const router = useRouter();
  const [tujuan, setTujuan] = useState<OpsiCari | null>(null);
  const [jumlah, setJumlah] = useState<Awaited<ReturnType<typeof ringkasPelanggan>> | null>(null);
  const [menunggu, mulai] = useTransition();
  useEffect(() => {
    ringkasPelanggan(sumber.id).then(setJumlah, () => toast.error("Jumlah data gagal dihitung."));
  }, [sumber.id]);

  const lain = pembanding.filter((p) => p.id !== sumber.id);
  const mirip = new Set(customerMirip(sumber.name, lain, 5).map((p) => p.id));
  // Yang namanya mirip di urutan teratas — biasanya itulah kembarannya.
  const opsi: OpsiCari[] = [...lain]
    .sort((a, b) => Number(mirip.has(b.id)) - Number(mirip.has(a.id)))
    .map((p) => ({ id: p.id, label: p.nama, sub: `${p.kode}${mirip.has(p.id) ? " · nama mirip" : ""}` }));
  const rincian = jumlah
    ? [
        jumlah.quotation && `${jumlah.quotation} quotation`,
        jumlah.invoice && `${jumlah.invoice} invoice`,
        jumlah.payment && `${jumlah.payment} payment`,
        jumlah.lainnya && `${jumlah.lainnya} data lain (event, lead, catatan tagih, retail)`,
      ].filter(Boolean)
    : [];

  function gabungkan() {
    if (!tujuan) return;
    mulai(async () => {
      const h = await gabungkanPelanggan(sumber.id, tujuan.id);
      if (!h.ok) {
        toast.error(h.pesan);
        return;
      }
      toast.success(`${sumber.name} digabung ke ${tujuan.label} — ${h.pindah} data dipindahkan.`);
      onTutup();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => (!v ? onTutup() : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gabungkan {sumber.name}</DialogTitle>
          <DialogDescription>Untuk customer yang sama tetapi terdaftar dua kali. Pilih kartu yang dipertahankan.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Gabungkan ke (dipertahankan)</span>
            <PilihCari id="tujuan-gabung" nilai={tujuan ?? undefined} pilihan={opsi} onPilih={setTujuan} placeholder="Ketik nama atau kode customer…" />
          </div>
          <div className="rounded-[12px] bg-muted/60 px-4 py-3 text-sm leading-relaxed">
            {jumlah === null ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Menghitung data…
              </span>
            ) : (
              <ul className="flex list-disc flex-col gap-1 pl-4">
                <li>
                  {rincian.length ? (
                    <>
                      {rincian.join(", ")} milik <b className="font-medium">{sumber.name}</b> pindah ke{" "}
                    </>
                  ) : (
                    <>
                      <b className="font-medium">{sumber.name}</b> belum punya dokumen — hanya kartunya yang digabung ke{" "}
                    </>
                  )}
                  <b className="font-medium">{tujuan?.label ?? "customer tujuan"}</b>.
                </li>
                <li>Alamat, telepon, PIC, email, atau NPWP yang kosong di tujuan diisi dari {sumber.name}.</li>
                <li>{sumber.name} dinonaktifkan (tidak dihapus). Dokumen lamanya tercetak dengan nama &amp; alamat customer tujuan.</li>
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onTutup} disabled={menunggu}>
            Batal
          </Button>
          <Button onClick={gabungkan} disabled={!tujuan || menunggu || jumlah === null}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
            Gabungkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
