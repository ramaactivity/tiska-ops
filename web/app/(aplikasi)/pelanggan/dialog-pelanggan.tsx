"use client";

import { Building2, Landmark, LoaderCircle, Plus, School, User, Users } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JENIS_KLIEN, type JenisKlien, tebakJenisKlien } from "@/lib/hitung/rekanan";
import { cn } from "@/lib/utils";

import { type KeadaanPelanggan, simpanPelanggan } from "./actions";

export type Pelanggan = {
  id: string;
  customer_code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  npwp: string | null;
  pic_name: string | null;
  is_test?: boolean;
  client_type?: string | null;
  rekanan?: OpsiCari | null;
};

/** Ikon tiap jenis klien — kartu pilihan, bukan deretan chip yang turun ke baris kedua (Rama, 18 Nov 2026). */
const IKON_JENIS: Record<JenisKlien, typeof User> = {
  perorangan: User,
  kelompok: Users,
  perusahaan: Building2,
  organisasi: School,
  instansi: Landmark,
};

const keadaanAwal: KeadaanPelanggan = {};

export function DialogPelanggan({
  pelanggan,
  terbuka: terbukaLuar,
  onTerbukaChange,
  opsiRekanan,
}: {
  pelanggan?: Pelanggan;
  /** Rekanan aktif untuk "Dibawa oleh rekanan" (D-132). */
  opsiRekanan: OpsiCari[];
  /** Diisi kalau dialog dibuka dari menu aksi baris, bukan dari tombolnya sendiri. */
  terbuka?: boolean;
  onTerbukaChange?: (nilai: boolean) => void;
}) {
  const [terbukaDalam, setTerbukaDalam] = useState(false);
  const [keadaan, kirim, sedangKirim] = useActionState(simpanPelanggan, keadaanAwal);
  const sedangUbah = Boolean(pelanggan);
  const [nama, setNama] = useState(pelanggan?.name ?? "");
  // Kosong = belum dipilih sendiri → mengikuti tebakan dari nama.
  const [jenis, setJenis] = useState(pelanggan?.client_type ?? "");
  const [rekanan, setRekanan] = useState<OpsiCari | null>(pelanggan?.rekanan ?? null);
  const [npwp, setNpwp] = useState(pelanggan?.npwp ?? "");
  const jenisTerpakai = (jenis || tebakJenisKlien(nama)) as JenisKlien;

  const dikendalikan = terbukaLuar !== undefined;
  const terbuka = dikendalikan ? terbukaLuar : terbukaDalam;
  const setTerbuka = dikendalikan ? (onTerbukaChange ?? (() => {})) : setTerbukaDalam;

  useEffect(() => {
    if (keadaan.sukses) {
      toast.success(keadaan.pesan);
      setTerbuka(false);
    }
    // setTerbuka stabil di kedua mode; tidak perlu ikut sebagai kebergantungan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      {dikendalikan ? null : (
        <DialogTrigger
          render={
            <Button size="sm">
              <Plus className="size-4" />
              Tambah customer
            </Button>
          }
        />
      )}

      {/* Lebar & pendek (Rama, 18 Nov): isian berdampingan dua kolom supaya popup tidak setinggi layar; selalu ada
          jarak atas-bawah (maks. tinggi layar − 6rem, isi bisa digulir). HP tetap lembar bawah satu kolom. */}
      <DialogContent className="sm:max-w-3xl lg:max-w-[880px]">
        <DialogHeader>
          <DialogTitle>{sedangUbah ? "Ubah customer" : "Customer baru"}</DialogTitle>
          <DialogDescription>
            {sedangUbah
              ? `Kode ${pelanggan!.customer_code} tidak bisa diubah.`
              : "Kode customer dibuat otomatis setelah disimpan."}
          </DialogDescription>
        </DialogHeader>

        <form action={kirim} className="flex flex-col gap-4" noValidate>
          {pelanggan ? <input type="hidden" name="id" value={pelanggan.id} /> : null}

          {keadaan.pesan && !keadaan.sukses ? (
            <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {keadaan.pesan}
            </p>
          ) : null}

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Bidang label="Nama customer" nama="name" galat={keadaan.galat?.name} wajib>
              <Input
                id="name"
                name="name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                autoFocus
                placeholder="PT Contoh Sejahtera"
                aria-invalid={Boolean(keadaan.galat?.name)}
              />
            </Bidang>

            <div className="flex flex-col gap-2">
              <Label>Dibawa oleh rekanan (opsional)</Label>
              <input type="hidden" name="partner_id" value={rekanan?.id ?? ""} />
              <PilihCari nilai={rekanan ?? undefined} pilihan={opsiRekanan} onPilih={setRekanan} placeholder="EO / WO / MC / venue" />
              {rekanan ? (
                <button type="button" className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setRekanan(null)}>
                  Bukan dari rekanan
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>
                Jenis klien
                {!jenis ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">· ditebak dari nama, ketuk untuk mengganti</span> : null}
              </Label>
              <input type="hidden" name="client_type" value={jenisTerpakai} />
              <div role="radiogroup" aria-label="Jenis klien" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(Object.keys(JENIS_KLIEN) as JenisKlien[]).map((j) => {
                  const Ikon = IKON_JENIS[j];
                  const aktif = jenisTerpakai === j;
                  return (
                    <button
                      key={j}
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      onClick={() => setJenis(j)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-200",
                        aktif
                          ? "border-primary bg-primary/[0.06] shadow-[inset_0_0_0_1px_var(--primary)]"
                          : "bg-card hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      <Ikon className={cn("size-[18px] shrink-0", aktif ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
                      <span className={cn("text-[0.8125rem] leading-tight", aktif ? "font-semibold text-primary-strong" : "text-foreground")}>{JENIS_KLIEN[j]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t sm:col-span-2" />

            <Bidang label="Nama PIC" nama="pic_name" galat={keadaan.galat?.pic_name}>
              <Input id="pic_name" name="pic_name" defaultValue={pelanggan?.pic_name ?? ""} placeholder="Ibu Sari" />
            </Bidang>

            <Bidang label="Telepon" nama="phone" galat={keadaan.galat?.phone}>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                defaultValue={pelanggan?.phone ?? ""}
                placeholder="0812…"
                aria-invalid={Boolean(keadaan.galat?.phone)}
              />
            </Bidang>

            <Bidang label="Email" nama="email" galat={keadaan.galat?.email}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={pelanggan?.email ?? ""}
                placeholder="nama@perusahaan.com"
                aria-invalid={Boolean(keadaan.galat?.email)}
              />
            </Bidang>

            <Bidang label="NPWP" nama="npwp" galat={keadaan.galat?.npwp}>
              {/* Polos 16 digit seperti di Coretax DJP — tempelan bertitik/strip langsung dibersihkan. */}
              <Input
                id="npwp"
                name="npwp"
                inputMode="numeric"
                value={npwp}
                onChange={(e) => setNpwp(e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder="16 digit, tanpa titik"
                aria-invalid={Boolean(keadaan.galat?.npwp)}
                className="font-mono tabular-nums"
              />
              {npwp.length === 15 ? (
                <p className="text-xs text-muted-foreground">
                  Format lama 15 digit. Coretax memakai 16 digit
                  {jenisTerpakai === "perorangan" ? " — untuk perorangan isi NIK." : ": "}
                  {jenisTerpakai !== "perorangan" ? (
                    <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setNpwp(`0${npwp}`)}>
                      tambah 0 di depan
                    </button>
                  ) : null}
                </p>
              ) : null}
            </Bidang>

            <div className="sm:col-span-2">
              <Bidang label="Alamat" nama="address" galat={keadaan.galat?.address}>
                <Textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={pelanggan?.address ?? ""}
                  placeholder="Alamat lengkap untuk dicetak di quotation dan invoice"
                />
              </Bidang>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-dashed px-3.5 py-2.5 text-sm has-[[data-checked]]:border-perhatian-garis has-[[data-checked]]:bg-perhatian-halus">
            <Checkbox name="is_test" value="ya" defaultChecked={pelanggan?.is_test ?? false} />
            <span>
              <b className="font-medium">Ini data tes / percobaan</b>
              <span className="text-muted-foreground"> — ikut terhapus saat &quot;Hapus semua data tes&quot; (Pengaturan company).</span>
            </span>
          </label>

          <DialogFooter className="mt-1">
            <Button type="button" variant="ghost" onClick={() => setTerbuka(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={sedangKirim}>
              {sedangKirim ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan…
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Bidang({
  label,
  nama,
  galat,
  wajib,
  children,
}: {
  label: string;
  nama: string;
  galat?: string;
  wajib?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nama}>
        {label}
        {wajib ? <span className="text-muted-foreground"> *</span> : null}
      </Label>
      {children}
      {galat ? <p className="text-xs text-destructive">{galat}</p> : null}
    </div>
  );
}
