"use client";

import { LoaderCircle, Pause, Pencil, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type JenisHadiah,
  type JenisProgram,
  kalimatAturan,
  SK_BAWAAN,
} from "@/lib/hitung/loyalti";
import type { ProgramLoyalti } from "@/lib/loyalti";

import { aktifkanProgramLoyalti, simpanProgramLoyalti } from "./actions";

type Isi = {
  id: string | null;
  nama: string;
  jenis: JenisProgram;
  syarat: string;
  minBelanja: string;
  minPax: string;
  jendelaHari: string;
  jenisHadiah: JenisHadiah;
  jumlahHadiah: string;
  hadiah: string;
  pilihan: string;
  berlakuHari: string;
  bolehGabung: boolean;
  sk: string;
  mulai: string;
};
const angka = (s: string) => s.replace(/\D/g, "");
const MASA = [
  { nilai: "90", label: "3 bulan" },
  { nilai: "182", label: "6 bulan" },
  { nilai: "365", label: "1 tahun" },
  { nilai: "", label: "Tanpa batas" },
];

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border p-4">
      <legend className="px-1 text-sm font-semibold">{judul}</legend>
      {children}
    </fieldset>
  );
}

/** Tombol "Program baru" / "Ubah" + dialog aturan & syarat-ketentuan (D-131, D-134). Semua angka bebas diatur. */
export function TombolProgram({
  program,
  hariIni,
}: {
  program?: ProgramLoyalti;
  hariIni: string;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menunggu, mulai] = useTransition();
  const awal: Isi = program
    ? {
        id: program.id,
        nama: program.nama,
        jenis: program.jenis,
        syarat: String(program.syarat),
        minBelanja: program.minBelanja ? String(program.minBelanja) : "",
        minPax: program.minPax ? String(program.minPax) : "",
        jendelaHari: program.jendelaHari ? String(program.jendelaHari) : "",
        jenisHadiah: program.jenisHadiah,
        jumlahHadiah: program.jumlahHadiah ? String(program.jumlahHadiah) : "1",
        hadiah: program.hadiah,
        pilihan: program.pilihan.join(", "),
        berlakuHari: program.berlakuHari ? String(program.berlakuHari) : "",
        bolehGabung: program.bolehGabung,
        sk: program.sk ?? "",
        mulai: program.mulai,
      }
    : {
        id: null,
        nama: "Kartu Setia Ikut Menu Pesta",
        jenis: "stempel",
        syarat: "5",
        minBelanja: "",
        minPax: "",
        jendelaHari: "182",
        jenisHadiah: "gratis_pax",
        jumlahHadiah: "1",
        hadiah: "Gratis 1 pax",
        pilihan: "",
        berlakuHari: "182",
        bolehGabung: false,
        sk: SK_BAWAAN,
        mulai: hariIni,
      };
  const [f, setF] = useState(awal);
  const ubah = <K extends keyof Isi>(k: K, v: Isi[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const stempel = f.jenis === "stempel";
  const contoh = kalimatAturan({
    id: "",
    jenis: f.jenis,
    syarat: Number(f.syarat) || 1,
    minBelanja: Number(f.minBelanja) || null,
    minPax: Number(f.minPax) || null,
    jendelaHari: Number(f.jendelaHari) || null,
    berlakuHari: Number(f.berlakuHari) || null,
    mulai: f.mulai,
    hadiah: f.hadiah || "(hadiah)",
  });

  return (
    <>
      <span className="flex gap-1">
        <Button
          type="button"
          size={program ? "sm" : "default"}
          variant={program ? "outline" : "default"}
          className="rounded-full"
          onClick={() => {
            setF(awal);
            setBuka(true);
          }}
        >
          {program ? (
            <Pencil className="size-3.5" />
          ) : (
            <Plus className="size-4" />
          )}
          {program ? "Ubah" : "Program baru"}
        </Button>
        {program ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => {
                const r = await aktifkanProgramLoyalti(
                  program.id,
                  !program.aktif,
                );
                if (r.ok) toast.success(r.pesan);
                else toast.error(r.pesan);
                router.refresh();
              })
            }
          >
            {program.aktif ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {program.aktif ? "Hentikan" : "Aktifkan"}
          </Button>
        ) : null}
      </span>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {program ? "Ubah program loyalti" : "Program loyalti baru"}
            </DialogTitle>
            <DialogDescription>
              Yang dihitung: pesanan Ikut Menu Pesta. Mengubah syarat menghitung
              ulang kartu semua pembeli.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nama program
              <Input
                value={f.nama}
                onChange={(e) => ubah("nama", e.target.value)}
                maxLength={120}
              />
            </label>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Jenis program
              <PilihanChip
                label="Jenis program"
                nilai={f.jenis}
                onPilih={(n) =>
                  setF((x) => ({
                    ...x,
                    jenis: n as JenisProgram,
                    // Bonus tiap pesanan selalu ikut di setiap pesanan: S&K "ditukar di pesanan berikutnya / tidak digabung" tidak berlaku.
                    ...(n === "tiap_pesanan"
                      ? {
                          jenisHadiah: "bonus",
                          hadiah:
                            x.jenisHadiah === "bonus"
                              ? x.hadiah
                              : "1 botol minuman 120 ml (sampel)",
                          minPax: x.minPax || "4",
                          bolehGabung: true,
                          sk: x.sk === SK_BAWAAN ? "" : x.sk,
                        }
                      : { bolehGabung: false, sk: x.sk || SK_BAWAAN }),
                  }))
                }
                pilihan={[
                  {
                    nilai: "stempel",
                    label: "Kartu stempel — pesan N kali dapat hadiah",
                  },
                  {
                    nilai: "tiap_pesanan",
                    label: "Bonus tiap pesanan (mis. sampel minuman)",
                  },
                ]}
                kecil
              />
            </div>

            <Bagian judul="Syarat">
              <div className="grid gap-4 sm:grid-cols-3">
                {stempel ? (
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Pesan berapa kali
                    <Input
                      inputMode="numeric"
                      value={f.syarat}
                      onChange={(e) =>
                        ubah("syarat", angka(e.target.value).slice(0, 3))
                      }
                      className="font-mono tabular-nums"
                      aria-label="Jumlah pesanan untuk 1 hadiah"
                    />
                  </label>
                ) : null}
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Minimal pax / pesanan
                  <Input
                    inputMode="numeric"
                    value={f.minPax}
                    onChange={(e) =>
                      ubah("minPax", angka(e.target.value).slice(0, 4))
                    }
                    placeholder="berapa pun"
                    className="font-mono tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Minimal belanja / pesanan
                  <Input
                    inputMode="numeric"
                    value={
                      f.minBelanja
                        ? Number(f.minBelanja).toLocaleString("id-ID")
                        : ""
                    }
                    onChange={(e) =>
                      ubah("minBelanja", angka(e.target.value).slice(0, 12))
                    }
                    placeholder="Rp berapa pun"
                    className="text-right font-mono tabular-nums"
                    aria-label="Minimal belanja / pesanan (opsional)"
                  />
                </label>
              </div>
              {stempel ? (
                <div className="flex flex-col gap-1.5 text-sm font-medium">
                  Masa berlaku poin (harus terpenuhi dalam)
                  <div className="flex flex-wrap items-center gap-2">
                    <PilihanChip
                      label="Masa berlaku poin"
                      nilai={
                        MASA.some((x) => x.nilai === f.jendelaHari)
                          ? f.jendelaHari
                          : "lain"
                      }
                      onPilih={(n) => ubah("jendelaHari", n)}
                      pilihan={MASA}
                      kecil
                    />
                    <Input
                      inputMode="numeric"
                      value={f.jendelaHari}
                      onChange={(e) =>
                        ubah("jendelaHari", angka(e.target.value).slice(0, 4))
                      }
                      placeholder="hari"
                      className="w-24 font-mono tabular-nums"
                      aria-label="Harus terpenuhi dalam (hari)"
                    />
                    <span className="text-xs font-normal text-muted-foreground">
                      hari · poin tertua gugur bila lewat
                    </span>
                  </div>
                </div>
              ) : null}
            </Bagian>

            <Bagian judul={stempel ? "Hadiah" : "Bonus"}>
              {stempel ? (
                <PilihanChip
                  label="Jenis hadiah"
                  nilai={f.jenisHadiah}
                  onPilih={(n) =>
                    setF((x) => ({
                      ...x,
                      jenisHadiah: n as JenisHadiah,
                      hadiah:
                        n === "gratis_pax"
                          ? `Gratis ${x.jumlahHadiah || 1} pax`
                          : x.jenisHadiah === "gratis_pax"
                            ? ""
                            : x.hadiah,
                    }))
                  }
                  pilihan={[
                    {
                      nilai: "gratis_pax",
                      label: "Gratis pax (invoice dipotong)",
                    },
                    { nilai: "bonus", label: "Bonus barang" },
                    { nilai: "teks", label: "Lainnya" },
                  ]}
                  kecil
                />
              ) : null}
              {stempel && f.jenisHadiah === "gratis_pax" ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Jumlah pax gratis
                  <Input
                    inputMode="numeric"
                    value={f.jumlahHadiah}
                    onChange={(e) =>
                      setF((x) => ({
                        ...x,
                        jumlahHadiah: angka(e.target.value).slice(0, 3),
                        hadiah: `Gratis ${angka(e.target.value) || 1} pax`,
                      }))
                    }
                    className="w-24 font-mono tabular-nums"
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Pembeli tetap menerima semua pax yang dipesan; tagihannya
                    dipotong harga {f.jumlahHadiah || 1} pax (mis. 4 pax
                    Rp200.000 → bayar Rp150.000 + PBJT).
                  </span>
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {stempel
                  ? "Hadiah (tertulis di kartu & catatan pesanan)"
                  : "Bonus (tertulis di catatan pesanan untuk dapur)"}
                <Input
                  value={f.hadiah}
                  onChange={(e) => ubah("hadiah", e.target.value)}
                  maxLength={300}
                  placeholder="mis. 4 botol minuman 120 ml"
                  aria-label="Hadiah"
                />
              </label>
              {f.jenisHadiah === "bonus" || !stempel ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Pilihan (opsional, pisahkan dengan koma)
                  <Input
                    value={f.pilihan}
                    onChange={(e) => ubah("pilihan", e.target.value)}
                    placeholder="mis. Lemon tea, Lychee ice tea, Teh sereh"
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    {stempel
                      ? "Admin wajib memilih salah satu saat memakai hadiah."
                      : "Isi bila bonusnya disesuaikan dengan minuman yang dijual di acara."}
                  </span>
                </label>
              ) : null}
              {stempel ? (
                <div className="flex flex-col gap-1.5 text-sm font-medium">
                  Hadiah berlaku
                  <div className="flex flex-wrap items-center gap-2">
                    <PilihanChip
                      label="Hadiah berlaku"
                      nilai={
                        MASA.some((x) => x.nilai === f.berlakuHari)
                          ? f.berlakuHari
                          : "lain"
                      }
                      onPilih={(n) => ubah("berlakuHari", n)}
                      pilihan={MASA}
                      kecil
                    />
                    <Input
                      inputMode="numeric"
                      value={f.berlakuHari}
                      onChange={(e) =>
                        ubah("berlakuHari", angka(e.target.value).slice(0, 4))
                      }
                      placeholder="hari"
                      className="w-24 font-mono tabular-nums"
                      aria-label="Hadiah berlaku (hari)"
                    />
                    <span className="text-xs font-normal text-muted-foreground">
                      hari sejak didapat
                    </span>
                  </div>
                </div>
              ) : null}
            </Bagian>

            <Bagian judul="Syarat & ketentuan">
              {stempel ? (
                <PilihanChip
                  label="Boleh digabung"
                  nilai={f.bolehGabung ? "ya" : "tidak"}
                  onPilih={(n) => ubah("bolehGabung", n === "ya")}
                  pilihan={[
                    {
                      nilai: "tidak",
                      label: "Tidak bisa digabung dengan hadiah lain",
                    },
                    { nilai: "ya", label: "Boleh digabung" },
                  ]}
                  kecil
                />
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Teks syarat & ketentuan (tampil di halaman pembeli)
                <Textarea
                  value={f.sk}
                  onChange={(e) => ubah("sk", e.target.value)}
                  maxLength={2000}
                  rows={4}
                />
              </label>
              {stempel ? (
                <p className="text-xs text-muted-foreground">
                  Hadiah barang & gratis pax selalu ditukar di pesanan
                  berikutnya (dijaga aplikasi).
                </p>
              ) : null}
            </Bagian>

            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Mulai dihitung dari pesanan yang dikirim tanggal
              <PilihTanggal
                value={f.mulai}
                onChange={(t) => ubah("mulai", t)}
                bisaHapus={false}
                aria-label="Mulai dihitung"
              />
            </div>
            <p className="rounded-xl bg-muted px-3 py-2.5 text-sm">{contoh}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => setBuka(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={
                menunggu || !f.hadiah.trim() || (stempel && !Number(f.syarat))
              }
              onClick={() =>
                mulai(async () => {
                  const r = await simpanProgramLoyalti({
                    ...f,
                    syarat: stempel ? Number(f.syarat) : 1,
                    jendelaHari: stempel ? f.jendelaHari : "",
                    berlakuHari: stempel ? f.berlakuHari : "",
                    jumlahHadiah:
                      f.jenisHadiah === "gratis_pax" && stempel
                        ? f.jumlahHadiah
                        : "",
                    pilihan: f.pilihan
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  });
                  if (!r.ok) return void toast.error(r.pesan);
                  toast.success(r.pesan);
                  setBuka(false);
                  router.refresh();
                })
              }
            >
              {menunggu ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Simpan program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
