"use client";

import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KATEGORI_VENDOR } from "@/lib/hitung/rekanan";

import { simpanSupplier } from "../po/actions";

export type IsiSupplier = {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  payment_term_days: number;
  bank_account: string;
  notes: string;
  active: boolean;
  address: string;
  instagram: string;
  rating: number | null;
  rekanan: OpsiCari | null;
};

const PILIHAN_KATEGORI = Object.entries(KATEGORI_VENDOR).map(([nilai, label]) => ({ nilai, label }));
const PILIHAN_NILAI = [{ nilai: "", label: "Belum dinilai" }, ...[1, 2, 3, 4, 5].map((n) => ({ nilai: String(n), label: "★".repeat(n) }))];

/** Tambah / ubah vendor & supplier (D-083, D-133). Tempo bayar menentukan jatuh tempo hutang tiap penerimaan PO. */
export function TombolVendor({ s, opsiRekanan }: { s?: IsiSupplier; opsiRekanan: OpsiCari[] }) {
  const [buka, setBuka] = useState(false);
  const router = useRouter();
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const kirim = (data: FormData) =>
    mulai(async () => {
      const r = await simpanSupplier({}, data);
      if (!r.sukses) return setPesan(r.pesan ?? "Gagal menyimpan.");
      toast.success(r.pesan);
      setPesan(null);
      setBuka(false);
      router.refresh();
    });
  const [kategori, setKategori] = useState(s?.category || "bahan_baku");
  const [nilai, setNilai] = useState(s?.rating ? String(s.rating) : "");
  const [aktif, setAktif] = useState(s ? (s.active ? "on" : "off") : "on");
  const [rekanan, setRekanan] = useState<OpsiCari | null>(s?.rekanan ?? null);
  const isian = (nama: keyof IsiSupplier, label: string, placeholder = "", lebar = false) => (
    <label className={`flex flex-col gap-1.5 text-sm font-medium${lebar ? " sm:col-span-2" : ""}`}>
      {label}
      <Input name={nama} defaultValue={String(s?.[nama] ?? "")} placeholder={placeholder} />
    </label>
  );
  return (
    <>
      <Button type="button" variant={s ? "outline" : "default"} className={s ? "rounded-full bg-card" : "rounded-full"} onClick={() => {
          // Mulai dari isian vendor ini (atau kosong) — pilihan chip dialog sebelumnya tidak terbawa.
          setKategori(s?.category || "bahan_baku");
          setNilai(s?.rating ? String(s.rating) : "");
          setAktif(s ? (s.active ? "on" : "off") : "on");
          setRekanan(s?.rekanan ?? null);
          setPesan(null);
          setBuka(true);
        }}>
        {s ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {s ? "Ubah" : "Vendor baru"}
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{s ? "Ubah vendor" : "Vendor baru"}</DialogTitle>
            <DialogDescription>Supplier bahan dan vendor yang dipakai Tiska: roti, sewa mobil, sewa alat, venue, dekorasi, tenaga tambahan, percetakan.</DialogDescription>
          </DialogHeader>
          <form action={kirim} className="flex flex-col gap-4">
            {s ? <input type="hidden" name="id" value={s.id} /> : null}
            <input type="hidden" name="partner_id" value={rekanan?.id ?? ""} />
            {pesan ? <p role="alert" className="text-sm text-destructive">{pesan}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {isian("name", "Nama vendor", "mis. MEY Bakery", true)}
              <div className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Kategori
                <PilihanChip pilihan={PILIHAN_KATEGORI} nilai={kategori} onPilih={setKategori} label="Kategori vendor" nama="category" kecil />
              </div>
              {isian("contact_name", "Nama kontak")}
              {isian("phone", "Nomor WhatsApp", "08…")}
              {isian("address", "Alamat", "", true)}
              {isian("instagram", "Instagram / website")}
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Tempo bayar (hari)
                <Input name="payment_term_days" defaultValue={s?.payment_term_days ?? 0} inputMode="numeric" className="font-mono" />
              </label>
              {isian("bank_account", "Rekening", "mis. BCA 123… a.n. …", true)}
              <div className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Penilaian (tepat waktu, kualitas)
                <PilihanChip pilihan={PILIHAN_NILAI} nilai={nilai} onPilih={setNilai} label="Penilaian" nama="rating" kecil />
              </div>
              <div className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Juga rekanan pembawa klien? (opsional)
                <PilihCari nilai={rekanan ?? undefined} pilihan={opsiRekanan} onPilih={setRekanan} placeholder="mis. venue yang juga merekomendasikan Tiska" />
                {rekanan ? (
                  <button type="button" className="self-start text-xs font-normal text-muted-foreground underline-offset-4 hover:underline" onClick={() => setRekanan(null)}>
                    Lepas
                  </button>
                ) : null}
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Catatan
                <Textarea name="notes" defaultValue={s?.notes ?? ""} placeholder="mis. harga sewa per hari, minimal order, jam operasional" />
              </label>
              <div className="sm:col-span-2">
                <PilihanChip kecil label="Status vendor" nama="active" nilai={aktif} onPilih={setAktif} pilihan={[{ nilai: "on", label: "Aktif" }, { nilai: "off", label: "Nonaktif" }]} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setBuka(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={sedang} className="rounded-full">
                {sedang ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
