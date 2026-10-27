"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { HasilPindah, IsiSekarang } from "@/lib/pindah-data-lama";
import type { KelompokKembar, Keputusan } from "@/lib/pindah-data-rencana";
import { rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { pindahkanDataLama } from "./actions";

type Props = {
  sudahPernah: boolean;
  sekarang: IsiSekarang;
  lama: {
    customer: number;
    quotation: number;
    invoice: number;
    payment: number;
    totalInvoice: number;
    totalPayment: number;
  };
  userLama: {
    id: string;
    nama: string;
    username: string;
    dok: number;
    saran: string | null;
  }[];
  userBaru: { id: string; label: string; sub: string }[];
  ttdLama: { id: string; nama: string; dok: number; saran: string }[];
  ttdBaru: { id: string; name: string; adaGambar: boolean }[];
  customer: { id: string; nama: string; hp: string; dok: number }[];
  kembar: KelompokKembar[];
};

const LANGKAH = ["Mulai", "Akun", "Penandatangan", "Customer kembar", "Periksa & jalankan"];
const KATA_KUNCI = "PINDAHKAN";
const KOSONGKAN = { id: "", label: "Kosongkan (tanpa nama pembuat)" };

export function WizardPindah(p: Props) {
  const [langkah, setLangkah] = useState(0);
  const [hapusOperasional, setHapusOperasional] = useState(true);
  const [user, setUser] = useState<Record<string, string | null>>(() => Object.fromEntries(p.userLama.map((u) => [u.id, u.saran])));
  const [ttd, setTtd] = useState<Record<string, string>>(() => Object.fromEntries(p.ttdLama.map((t) => [t.id, t.saran])));
  const [gabung, setGabung] = useState(() => p.kembar.map((g) => g.saran));
  const [ketik, setKetik] = useState("");
  const [hasil, setHasil] = useState<HasilPindah | null>(null);
  const [uji, setUji] = useState<HasilPindah | null>(null);
  const [menunggu, mulai] = useTransition();

  const cust = new Map(p.customer.map((c) => [c.id, c]));
  const digabung = gabung.reduce((a, g) => a + g.ikut.length, 0);
  const pindah = (n: number) => {
    setLangkah(n);
    window.scrollTo({ top: 0 });
  };

  const jalankan = (cobaSaja: boolean) =>
    mulai(async () => {
      const k: Keputusan = {
        user,
        penandatangan: ttd,
        gabung: gabung.filter((g) => g.ikut.length),
        hapusOperasional,
      };
      const r = await pindahkanDataLama(k, cobaSaja);
      if (!r.ok) toast.error(r.pesan);
      else if (cobaSaja) setUji(r.hasil);
      else setHasil(r.hasil);
    });

  if (hasil) return <Hasil h={hasil} />;

  return (
    <div className="flex flex-col gap-3.5">
      <ol className="flex flex-wrap gap-1.5" aria-label="Langkah">
        {LANGKAH.map((l, i) => (
          <li
            key={l}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              i === langkah ? "border-primary bg-primary font-medium text-primary-foreground" : i < langkah ? "bg-secondary" : "bg-card text-muted-foreground",
            )}
          >
            <span className="font-mono text-xs">{i + 1}</span>
            {l}
          </li>
        ))}
      </ol>

      {langkah === 0 && (
        <BagianForm nomor={1} judul="Apa yang akan terjadi" keterangan="Baca dulu. Tidak ada yang berubah sampai tombol terakhir di langkah 5 ditekan.">
          {p.sudahPernah && (
            <Peringatan>
              Data lama <b>sudah pernah dipindah</b>. Menjalankan lagi akan menghapus semua quotation, invoice, payment, dan event yang dibuat sesudahnya di
              aplikasi ini, lalu mengambil ulang dari aplikasi lama.
            </Peringatan>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-semibold text-destructive">Dihapus dari Tiska Ops (data uji coba)</p>
              <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem]">
                <li>{p.sekarang.customer.length} customer</li>
                <li>
                  {p.sekarang.quotation} quotation · {p.sekarang.invoice} invoice · {p.sekarang.payment} payment
                </li>
                <li>
                  {p.sekarang.event} event (kloter, tim, BAST, honor ikut) · {p.sekarang.lead} lead
                </li>
              </ul>
              {p.sekarang.customer.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.sekarang.customer.map((c) => (
                    <span key={c.id} className="rounded-full border bg-card px-2.5 py-0.5 text-xs">
                      {c.nama}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-[14px] border border-primary/25 bg-secondary/50 p-4">
              <p className="font-semibold text-primary-strong">Diambil dari aplikasi lama</p>
              <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem]">
                <li>{p.lama.customer} customer</li>
                <li>
                  {p.lama.quotation} quotation · {p.lama.invoice} invoice ({rupiah(p.lama.totalInvoice)})
                </li>
                <li>
                  {p.lama.payment} payment ({rupiah(p.lama.totalPayment)}) beserta semua rinciannya
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Nomor dokumen, tanggal, dan angka disalin persis. Aplikasi lama tidak diubah.</p>
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-[14px] border p-4">
            <Checkbox checked={hapusOperasional} onCheckedChange={(v) => setHapusOperasional(Boolean(v))} className="mt-1" />
            <span className="text-[0.9375rem]">
              <b className="font-semibold">Ikut hapus data operasional uji coba</b> ({p.sekarang.operasional} baris: PR, nota belanja, PO, stok & opname,
              kasbon, log kirim pricelist). Disarankan, karena semuanya milik event uji yang ikut terhapus.
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Tetap aman: user, resep, bahan & harganya, menu, paket, pricelist, peralatan, kendaraan, supplier, S&K, angka bisnis, dan pengaturan company.
            Sebelum menghapus, sistem menyimpan cadangan dulu.
          </p>
        </BagianForm>
      )}

      {langkah === 1 && (
        <BagianForm
          nomor={2}
          judul="Cocokkan akun"
          keterangan="Akun di aplikasi lama yang tercatat sebagai pembuat dokumen. Pilih akun Tiska Ops yang sama orangnya. Belum ada? Buat dulu di menu User, lalu muat ulang halaman ini."
        >
          {p.userLama.map((u) => {
            const pilih = user[u.id];
            return (
              <div
                key={u.id}
                className="grid grid-cols-1 items-center gap-2 border-b pb-4 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
              >
                <div>
                  <p className="font-semibold">{u.nama}</p>
                  <p className="text-sm text-muted-foreground">
                    @{u.username} · {u.dok} dokumen/customer
                  </p>
                </div>
                <div>
                  <PilihCari
                    semuaSaatKosong
                    pilihan={[KOSONGKAN, ...p.userBaru]}
                    nilai={pilih ? p.userBaru.find((b) => b.id === pilih) : KOSONGKAN}
                    onPilih={(o) => setUser((x) => ({ ...x, [u.id]: o.id || null }))}
                  />
                  {!pilih && <p className="mt-1 text-sm text-perhatian">Tanpa akun: dokumennya tampil tanpa nama pembuat.</p>}
                </div>
              </div>
            );
          })}
        </BagianForm>
      )}

      {langkah === 2 && (
        <BagianForm
          nomor={3}
          judul="Cocokkan penandatangan"
          keterangan="Nama & tanda tangan yang tercetak di quotation/invoice lama. Pilih yang sudah ada di Tiska Ops, atau buat baru — gambar tanda tangannya ikut disalin."
        >
          {p.ttdLama.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0">
              <p>
                <b className="font-semibold">{t.nama}</b> <span className="text-sm text-muted-foreground">· di {t.dok} dokumen</span>
              </p>
              <PilihanChip
                label={`Penandatangan untuk ${t.nama}`}
                nilai={ttd[t.id]}
                onPilih={(v) => setTtd((x) => ({ ...x, [t.id]: v }))}
                pilihan={[
                  ...p.ttdBaru.map((b) => ({
                    nilai: b.id,
                    label: b.adaGambar ? b.name : `${b.name} (tanda tangan diambil dari yang lama)`,
                  })),
                  { nilai: "baru", label: "Buat baru dari aplikasi lama" },
                ]}
              />
            </div>
          ))}
        </BagianForm>
      )}

      {langkah === 3 && (
        <BagianForm
          nomor={4}
          judul="Customer kembar"
          keterangan="Customer di aplikasi lama yang namanya atau nomor HP-nya sama. Centang yang memang orang/perusahaan yang sama supaya riwayatnya jadi satu. Yang cuma sama HP-nya tidak dicentang otomatis."
        >
          {p.kembar.length === 0 && <p className="text-muted-foreground">Tidak ada customer kembar.</p>}
          {p.kembar.map((g, i) => (
            <div key={g.anggota.join()} className="flex flex-col gap-2 rounded-[14px] border p-4">
              {g.anggota.map((id) => {
                const c = cust.get(id)!;
                const utama = gabung[i].utama === id;
                const ikut = gabung[i].ikut.includes(id);
                return (
                  <div key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {utama ? (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Utama</span>
                    ) : (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={ikut}
                          onCheckedChange={(v) =>
                            setGabung((x) =>
                              x.map((y, j) =>
                                j !== i
                                  ? y
                                  : {
                                      ...y,
                                      ikut: v ? [...y.ikut, id] : y.ikut.filter((z) => z !== id),
                                    },
                              ),
                            )
                          }
                        />
                        Gabungkan
                      </label>
                    )}
                    <span className={cn("font-medium", !utama && !ikut && "text-muted-foreground")}>{c.nama}</span>
                    <span className="text-sm text-muted-foreground">
                      {c.hp || "tanpa HP"} · {c.dok} dokumen
                    </span>
                    {!utama && (
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() =>
                          setGabung((x) =>
                            x.map((y, j) =>
                              j !== i
                                ? y
                                : {
                                    utama: id,
                                    ikut: y.ikut.filter((z) => z !== id).concat(ikut ? [y.utama] : []),
                                  },
                            ),
                          )
                        }
                      >
                        Jadikan utama
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </BagianForm>
      )}

      {langkah === 4 && (
        <BagianForm
          nomor={5}
          judul="Periksa & jalankan"
          keterangan="Ringkasan keputusan Anda. Semua dikerjakan sekaligus; kalau ada yang gagal di tengah, tidak ada yang berubah."
        >
          <ul className="flex flex-col gap-1.5 text-[0.9375rem]">
            <li>
              🗑 Hapus {p.sekarang.customer.length} customer, {p.sekarang.quotation} quotation, {p.sekarang.invoice} invoice, {p.sekarang.payment} payment,{" "}
              {p.sekarang.event} event uji coba
              {hapusOperasional ? ` + ${p.sekarang.operasional} data operasional uji` : ""}
            </li>
            <li>
              📥 Ambil {p.lama.customer - digabung} customer
              {digabung ? ` (${digabung} digabung)` : ""}, {p.lama.quotation} quotation, {p.lama.invoice} invoice, {p.lama.payment} payment
            </li>
            <li>
              👤 {p.userLama.filter((u) => user[u.id]).length} dari {p.userLama.length} akun dicocokkan
              {p.userLama.some((u) => !user[u.id])
                ? ` (${p.userLama
                    .filter((u) => !user[u.id])
                    .map((u) => u.nama)
                    .join(", ")} dikosongkan)`
                : ""}
            </li>
            <li>✍️ {Object.values(ttd).filter((v) => v === "baru").length} penandatangan baru dibuat</li>
            <li>
              💰 Pembuktian: total invoice harus tetap {rupiah(p.lama.totalInvoice)} dan payment {rupiah(p.lama.totalPayment)}
            </li>
          </ul>
          <div className="flex flex-col gap-2 rounded-[14px] border p-4">
            <p className="font-semibold">Langkah A — Coba dulu</p>
            <p className="text-sm text-muted-foreground">
              Semua langkah dijalankan sampai pengecekan angka, lalu dibatalkan. Tidak ada yang terhapus atau tersimpan.
            </p>
            <div>
              <Button type="button" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => jalankan(true)}>
                {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                Coba dulu (tidak disimpan)
              </Button>
            </div>
            {uji && (
              <p className="flex items-start gap-2 text-[0.9375rem] text-lunas">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Uji coba berhasil: {uji.dipindah.customer} customer, {uji.dipindah.invoice} invoice ({rupiah(uji.dipindah.totalInvoice)}),{" "}
                {uji.dipindah.payment} payment ({rupiah(uji.dipindah.totalPayment)}) cocok dengan aplikasi lama. Belum ada yang berubah.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-[14px] border border-destructive/30 p-4">
            <p className="font-semibold">Langkah B — Jalankan sungguhan</p>
            <div className="flex max-w-md flex-col gap-2">
              <label htmlFor="kata-kunci" className="text-sm">
                Ketik <b className="font-mono">{KATA_KUNCI}</b> untuk memastikan
              </label>
              <Input id="kata-kunci" value={ketik} onChange={(e) => setKetik(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="rounded-full"
                disabled={ketik.trim().toUpperCase() !== KATA_KUNCI || menunggu}
                onClick={() => jalankan(false)}
              >
                {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {menunggu ? "Memproses… (±1 menit, jangan tutup halaman)" : "Hapus data uji & pindahkan data lama"}
              </Button>
            </div>
          </div>
        </BagianForm>
      )}

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" className="rounded-full" disabled={langkah === 0 || menunggu} onClick={() => pindah(langkah - 1)}>
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
        {langkah < LANGKAH.length - 1 && (
          <Button type="button" className="rounded-full" onClick={() => pindah(langkah + 1)}>
            Lanjut
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Peringatan({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-[14px] border border-perhatian/40 bg-perhatian/10 p-4 text-[0.9375rem]">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-perhatian" />
      <p>{children}</p>
    </div>
  );
}

function Hasil({ h }: { h: HasilPindah }) {
  return (
    <BagianForm judul="Selesai — data lama sudah dipindah" keterangan="Jumlah baris dan total uang sudah dicocokkan otomatis dengan aplikasi lama.">
      <div className="flex gap-3 rounded-[14px] border border-lunas/40 bg-lunas/10 p-4 text-[0.9375rem]">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lunas" />
        <div>
          <p>
            Masuk: {h.dipindah.customer} customer, {h.dipindah.quotation} quotation, {h.dipindah.invoice} invoice ({rupiah(h.dipindah.totalInvoice)}),{" "}
            {h.dipindah.payment} payment ({rupiah(h.dipindah.totalPayment)}).
          </p>
          <p className="text-muted-foreground">
            Terhapus: {h.dihapus.customer.length} customer uji, {h.dihapus.quotation} quotation, {h.dihapus.invoice} invoice, {h.dihapus.event} event. Cadangan:{" "}
            {h.cadangan}
          </p>
        </div>
      </div>
      {h.acaraMendatang.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Acara yang akan datang</p>
          <p className="text-sm text-muted-foreground">
            Yang sudah disetujui: buka quotation-nya lalu tekan &quot;Buat event&quot; supaya masuk jadwal dapur & tim. Yang masih menunggu jawaban klien:
            lanjutkan follow-up dari sini.
          </p>
          <ul className="flex flex-col gap-1">
            {h.acaraMendatang.map((a) => (
              <li key={a.id}>
                <Link href={`/penawaran/${a.id}`} className="text-primary hover:underline">
                  {a.nomor}
                </Link>{" "}
                · {a.customer} · {a.tanggal} · {a.disetujui ? "disetujui" : "menunggu jawaban klien"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/pelanggan" />} className="rounded-full">
          Lihat customer
        </Button>
        <Button render={<Link href="/tagihan" />} variant="outline" className="rounded-full">
          Lihat invoice
        </Button>
      </div>
    </BagianForm>
  );
}
