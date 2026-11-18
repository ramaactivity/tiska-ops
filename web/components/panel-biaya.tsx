"use client";

import { LoaderCircle, Lock, LockOpen, PencilLine, Plus, Trash2, X } from "lucide-react";

import { Td, Th } from "@/components/halaman";
import { PilihanChip } from "@/components/pilihan-chip";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IsianRupiahForm } from "@/components/isian-rupiah";
import {
  type BarisBiaya,
  KATEGORI_BIAYA,
  kategoriDobelRab,
  type KeadaanBiaya,
  labelKategori,
  type Penguncian,
} from "@/lib/biaya";
import { rupiah } from "@/lib/uang";

const keadaanAwal: KeadaanBiaya = {};

/** Aktual − estimasi; 0 bila salah satunya belum ada (tidak ada yang dibandingkan). */
const selisihBaris = (b: BarisBiaya) =>
  Number(b.actual_amount ?? 0) > 0 && Number(b.estimated_amount ?? 0) > 0 ? Number(b.actual_amount) - Number(b.estimated_amount) : 0;
const teksSelisih = (b: BarisBiaya) => {
  if (!(Number(b.actual_amount ?? 0) > 0 && Number(b.estimated_amount ?? 0) > 0)) return "—";
  const s = selisihBaris(b);
  return `${s > 0 ? "+" : s < 0 ? "−" : ""}${rupiah(Math.abs(s))}`;
};
const jumlah = (biaya: BarisBiaya[], kolom: "estimated_amount" | "actual_amount" | "nilaiDipakai") =>
  biaya.reduce((t, b) => t + Number(b[kolom] ?? 0), 0);

/**
 * Panel pencatatan biaya, dipakai penawaran maupun tagihan.
 *
 * Tindakan penyimpanannya diterima sebagai prop, bukan diimpor langsung,
 * karena keduanya menulis ke tabel yang berbeda. `penguncian` diisi hanya
 * oleh tagihan: perkiraan biaya di penawaran memang tidak untuk difinalisasi.
 */
export function PanelBiaya({
  idDokumen,
  biaya,
  bolehUbah,
  simpan,
  hapus,
  penguncian = null,
}: {
  idDokumen: string;
  biaya: BarisBiaya[];
  bolehUbah: boolean;
  simpan: (sebelumnya: KeadaanBiaya, data: FormData) => Promise<KeadaanBiaya>;
  hapus: (idBiaya: string, idDokumen: string) => Promise<void>;
  penguncian?: Penguncian | null;
}) {
  const terkunci = penguncian?.terkunci ?? false;
  const [keadaan, kirim, sedangKirim] = useActionState(simpan, keadaanAwal);
  const [sedangUbah, setSedangUbah] = useState<BarisBiaya | null>(null);
  const dobel = kategoriDobelRab(biaya);
  const [menunggu, mulai] = useTransition();

  // Penyesuaian state saat render — pola yang dianjurkan React untuk
  // menanggapi perubahan dari luar, dan lebih tepat daripada effect: mode ubah
  // harus sudah tertutup pada gambar pertama setelah penyimpanan berhasil,
  // bukan sekejap sesudahnya.
  const [tandaTerakhir, setTandaTerakhir] = useState<string | undefined>(undefined);

  if (keadaan.tanda && keadaan.tanda !== tandaTerakhir) {
    setTandaTerakhir(keadaan.tanda);
    setSedangUbah(null);
  }

  // Toast berbicara ke sistem di luar React, jadi tempatnya memang di effect.
  useEffect(() => {
    if (keadaan.sukses) toast.success(keadaan.pesan);
  }, [keadaan]);

  function jalankan(kerja: () => Promise<void>, pesan: string) {
    mulai(async () => {
      try {
        await kerja();
        toast.success(pesan);
      } catch (galat) {
        toast.error(galat instanceof Error ? galat.message : "Tindakan gagal.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Daftar biaya */}
      <section>
        <div className="flex items-baseline justify-between pb-2.5">
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Rincian biaya</h2>
          {bolehUbah && penguncian ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={menunggu}
              onClick={() =>
                jalankan(
                  terkunci
                    ? () => penguncian.buka(idDokumen)
                    : () => penguncian.kunci(idDokumen),
                  terkunci ? "Margin dibuka kembali." : "Margin difinalisasi.",
                )
              }
            >
              {terkunci ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
              {terkunci ? "Buka kembali" : "Finalisasi margin"}
            </Button>
          ) : null}
        </div>

        <div className="overflow-hidden kartu">
          {biaya.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada biaya dicatat untuk acara ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <Th className="w-40">Kategori</Th>
                    <Th>Keterangan</Th>
                    <Th className="w-32 text-right">Estimasi</Th>
                    <Th className="w-32 text-right">Aktual</Th>
                    <Th className="w-32 text-right">Selisih</Th>
                    <Th className="w-32 text-right">Dipakai</Th>
                    {bolehUbah ? <Th className="w-20" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {biaya.map((b) => (
                    <tr key={b.id} className="border-b align-top last:border-0">
                      <Td className="text-muted-foreground">{labelKategori(b.category)}</Td>
                      <Td>
                        <span className="font-medium">{b.description}</span>
                        {b.notes ? (
                          <span className="block text-xs text-muted-foreground">{b.notes}</span>
                        ) : null}
                      </Td>
                      <Td className="angka text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {b.estimated_amount ? rupiah(b.estimated_amount) : "—"}
                      </Td>
                      <Td className="angka text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {b.actual_amount ? rupiah(b.actual_amount) : "—"}
                      </Td>
                      <Td className={`angka text-right whitespace-nowrap tabular-nums ${selisihBaris(b) > 0 ? "text-tempo" : "text-muted-foreground"}`}>
                        {teksSelisih(b)}
                      </Td>
                      <Td className="angka text-right font-medium whitespace-nowrap tabular-nums">
                        {rupiah(b.nilaiDipakai)}
                      </Td>
                      {bolehUbah ? (
                        <Td className="text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={terkunci || menunggu}
                            onClick={() => setSedangUbah(b)}
                            aria-label={`Ubah ${b.description}`}
                          >
                            <PencilLine className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={terkunci || menunggu}
                            onClick={() =>
                              jalankan(
                                () => hapus(b.id, idDokumen),
                                "Baris biaya dihapus.",
                              )
                            }
                            aria-label={`Hapus ${b.description}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <Td colSpan={2}>Total</Td>
                    <Td className="angka text-right whitespace-nowrap tabular-nums">{rupiah(jumlah(biaya, "estimated_amount"))}</Td>
                    <Td className="angka text-right whitespace-nowrap tabular-nums">{jumlah(biaya, "actual_amount") > 0 ? rupiah(jumlah(biaya, "actual_amount")) : "—"}</Td>
                    <Td />
                    <Td className="angka text-right whitespace-nowrap tabular-nums">{rupiah(jumlah(biaya, "nilaiDipakai"))}</Td>
                    {bolehUbah ? <Td /> : null}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {dobel.length ? (
          <p className="mt-3 rounded-lg border border-perhatian-garis bg-perhatian-halus p-3 text-sm text-perhatian">
            {dobel.map(labelKategori).join(", ")}: ada estimasi manual dan estimasi dari RAB sekaligus — kemungkinan terhitung dua kali. Hapus
            estimasi manualnya bila RAB sudah mewakili biaya itu.
          </p>
        ) : null}
        <p className="pt-3 text-xs text-muted-foreground">
          Kolom <strong>Dipakai</strong> memakai biaya aktual bila sudah terisi di atas nol;
          selebihnya memakai estimasi. <strong>Selisih</strong> = aktual − estimasi (plus = lebih mahal dari rencana).
          Baris berawalan &ldquo;RAB&rdquo; ditulis otomatis dari Belanja (PR) dan diperbarui setiap nota dicatat.
        </p>
      </section>

      {/* Formulir tambah / ubah */}
      {bolehUbah && !terkunci ? (
        <section className="kartu p-4">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-semibold tracking-[-0.01em]">
              {sedangUbah ? "Ubah baris biaya" : "Tambah baris biaya"}
            </h2>
            {sedangUbah ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSedangUbah(null)}
              >
                <X className="size-4" />
                Batal
              </Button>
            ) : null}
          </div>

          {/* Kunci menggabungkan dua hal: penanda penyimpanan terakhir, dan
              baris yang sedang diubah. Berubahnya salah satu membuat React
              memasang ulang formulir, sehingga isiannya termuat benar — kosong
              setelah simpan, terisi saat menekan Ubah pada sebuah baris. */}
          <form
            key={`${keadaan.tanda ?? "awal"}-${sedangUbah?.id ?? "baru"}`}
            action={kirim}
            className="flex flex-col gap-4"
            noValidate
          >
            <input type="hidden" name="id_dokumen" value={idDokumen} />
            {sedangUbah ? <input type="hidden" name="id" value={sedangUbah.id} /> : null}

            {keadaan.pesan && !keadaan.sukses ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {keadaan.pesan}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Bidang label="Kategori" nama="category" galat={keadaan.galat?.category} wajib>
                  <PilihKategori awal={sedangUbah?.category ?? "hpp_bahan_baku"} />
                </Bidang>
              </div>

              <div className="sm:col-span-2">
                <Bidang
                  label="Keterangan"
                  nama="description"
                  galat={keadaan.galat?.description}
                  wajib
                >
                  <Input
                    id="description"
                    name="description"
                    defaultValue={sedangUbah?.description ?? ""}
                    placeholder="Bahan baku buffet 300 pax"
                  />
                </Bidang>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Bidang
                label="Estimasi"
                nama="estimated_amount"
                galat={keadaan.galat?.estimated_amount}
              >
                <KotakRupiah
                  nama="estimated_amount"
                  nilaiAwal={sedangUbah?.estimated_amount ?? null}
                />
              </Bidang>
              <Bidang label="Aktual" nama="actual_amount" galat={keadaan.galat?.actual_amount}>
                <KotakRupiah
                  nama="actual_amount"
                  nilaiAwal={sedangUbah?.actual_amount ?? null}
                />
              </Bidang>
            </div>

            <Bidang label="Catatan" nama="notes">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={sedangUbah?.notes ?? ""}
                placeholder="Nama vendor, nomor nota, atau keterangan lain"
              />
            </Bidang>

            <Button type="submit" size="sm" className="self-start" disabled={sedangKirim}>
              {sedangKirim ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan…
                </>
              ) : (
                <>
                  {sedangUbah ? null : <Plus className="size-4" />}
                  {sedangUbah ? "Simpan perubahan" : "Tambah biaya"}
                </>
              )}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function KotakRupiah({ nama, nilaiAwal }: { nama: string; nilaiAwal: string | null }) {
  return (
    <IsianRupiahForm id={nama} name={nama} nilaiAwal={nilaiAwal ? Number(nilaiAwal).toString() : ""} placeholder="0" />
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

/** Kategori biaya sebagai chip; nilainya terkirim lewat input "category". Form-nya dipasang ulang per baris (key), jadi state awal cukup. */
function PilihKategori({ awal }: { awal: string }) {
  const [nilai, setNilai] = useState(awal);
  return <PilihanChip pilihan={KATEGORI_BIAYA} nilai={nilai} onPilih={setNilai} label="Kategori biaya" nama="category" kecil />;
}
