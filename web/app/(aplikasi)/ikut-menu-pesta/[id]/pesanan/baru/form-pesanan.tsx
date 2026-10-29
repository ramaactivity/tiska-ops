"use client";

import { LoaderCircle, Minus, Plus, Save, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { PilihJam } from "@/components/pilih-jam";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASAL_PESANAN, type AsalPesanan, CARA_BAYAR, cekPesanan } from "@/lib/hitung/ikut-menu-pesta";
import { hitungTotalDokumen, rupiah } from "@/lib/uang";

import { simpanPesanan } from "../../../pesanan-actions";

const angka = (t: string) => Number(t.replace(/\D/g, "")) || 0;

export function FormPesanan({
  idProgram,
  paket,
  harga,
  minPax,
  area,
  pbjtPct,
  ongkirLuar,
  telat,
}: {
  idProgram: string;
  paket: { id: string; judul: string; isi: string[] }[];
  harga: number;
  minPax: number;
  area: string;
  pbjtPct: number;
  ongkirLuar: number;
  telat: string | null;
}) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [pax, setPax] = useState<Record<string, number>>({});
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [maps, setMaps] = useState("");
  const [jam, setJam] = useState("");
  const [catatan, setCatatan] = useState("");
  const [asal, setAsal] = useState<Exclude<AsalPesanan, "online">>("wa");
  const [bayar, setBayar] = useState<"transfer" | "cod">("transfer");
  const [luar, setLuar] = useState(false);
  const [ongkir, setOngkir] = useState(String(ongkirLuar));

  const daftarPax = paket.map((p) => pax[p.id] ?? 0);
  const total = hitungTotalDokumen({
    // Paket 0 pax dibuang: di mesin hitung pax kosong berarti SATU (lib/uang), sama seperti server.
    items: paket.filter((p) => (pax[p.id] ?? 0) > 0).map((p) => ({ qty: 1, pax: pax[p.id], price: harga, charge_pb1: true, charge_service: false })),
    pb1_enabled: true,
    pb1_percent: pbjtPct,
    delivery_amount: luar ? angka(ongkir) : 0,
  });
  const masalah = cekPesanan({ pax: daftarPax, minPax, maksPax: null, paxTerpakai: 0 });
  const ubahPax = (id: string, n: number) => setPax((x) => ({ ...x, [id]: Math.max(0, n) }));

  const simpan = () =>
    mulai(async () => {
      const r = await simpanPesanan({
        idProgram,
        nama,
        hp,
        alamat,
        maps,
        jam,
        catatan,
        asal,
        bayar,
        luarArea: luar,
        ongkir: angka(ongkir),
        paket: paket.map((p) => ({ idSet: p.id, pax: pax[p.id] ?? 0 })),
      });
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      toast.success(r.telat ? "Pesanan tercatat (ditandai telat) — invoice dibuat." : "Pesanan tercatat — invoice dibuat.");
      router.push(`/ikut-menu-pesta/${idProgram}`);
    });

  return (
    <div className="flex flex-col gap-3.5">
      {telat ? (
        <p className="flex items-start gap-2 rounded-2xl border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Batas order sudah lewat ({telat}). Pesanan tetap bisa dicatat dan diberi tanda &quot;telat&quot;.
        </p>
      ) : null}

      <BagianForm nomor={1} judul="Paket & jumlah" keterangan={`${rupiah(harga)} per pax + PBJT ${pbjtPct}%. Minimal ${minPax} pax per pesanan (boleh campur paket).`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paket.map((p) => (
            <div key={p.id} className="flex min-w-0 flex-col gap-3 rounded-[14px] border p-4">
              <div>
                <p className="font-semibold">{p.judul}</p>
                <p className="text-sm text-muted-foreground">{p.isi.join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon-lg" className="rounded-full" aria-label={`Kurangi ${p.judul}`} onClick={() => ubahPax(p.id, (pax[p.id] ?? 0) - 1)}>
                  <Minus className="size-4" />
                </Button>
                <Input
                  aria-label={`Jumlah pax ${p.judul}`}
                  inputMode="numeric"
                  className="h-11 w-20 text-center font-mono text-lg"
                  value={String(pax[p.id] ?? 0)}
                  onChange={(e) => ubahPax(p.id, angka(e.target.value))}
                />
                <Button type="button" variant="outline" size="icon-lg" className="rounded-full" aria-label={`Tambah ${p.judul}`} onClick={() => ubahPax(p.id, (pax[p.id] ?? 0) + 1)}>
                  <Plus className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">pax</span>
              </div>
            </div>
          ))}
        </div>
      </BagianForm>

      <BagianForm nomor={2} judul="Pembeli & alamat kirim" keterangan="Pembeli yang nomor HP-nya sudah ada otomatis dikenali sebagai langganan.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nama">Nama penerima</Label>
            <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hp">Nomor HP / WA</Label>
            <Input id="hp" inputMode="tel" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="alamat">Alamat kirim</Label>
            <Textarea id="alamat" className="min-h-16" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maps">Link Google Maps (opsional)</Label>
            <Input id="maps" value={maps} onChange={(e) => setMaps(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jam terima (opsional)</Label>
            <PilihJam value={jam} onChange={setJam} aria-label="Jam terima" />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-[12px] border p-3.5">
          <Checkbox checked={luar} onCheckedChange={(v) => setLuar(Boolean(v))} className="mt-1" />
          <span className="text-[0.9375rem]">
            Alamat di luar area {area} — <b className="font-semibold">perlu persetujuan Mba Ari</b> sebelum dijadwalkan kirim
          </span>
        </label>
        {luar ? (
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="ongkir">Delivery Fee</Label>
            <Input id="ongkir" inputMode="numeric" value={ongkir} onChange={(e) => setOngkir(e.target.value)} />
            <p className="text-sm text-muted-foreground">Bawaan zona Jabodetabek dari Angka Bisnis; boleh diubah.</p>
          </div>
        ) : null}
      </BagianForm>

      <BagianForm nomor={3} judul="Bayar & asal pesanan">
        <div className="flex flex-col gap-1.5">
          <Label>Cara bayar</Label>
          <PilihanChip label="Cara bayar" nilai={bayar} onPilih={(v) => setBayar(v as "transfer" | "cod")} pilihan={Object.entries(CARA_BAYAR).map(([nilai, label]) => ({ nilai, label }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Pesan dari</Label>
          <PilihanChip label="Asal pesanan" nilai={asal} onPilih={(v) => setAsal(v as Exclude<AsalPesanan, "online">)} pilihan={Object.entries(ASAL_PESANAN).filter(([nilai]) => nilai !== "online").map(([nilai, label]) => ({ nilai, label }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="catatan">Catatan (opsional)</Label>
          <Textarea id="catatan" className="min-h-10" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
      </BagianForm>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border bg-card px-5 py-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[0.9375rem]">
          <div>
            <dt className="text-sm text-muted-foreground">Subtotal</dt>
            <dd className="font-mono tabular-nums">{rupiah(total.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">PBJT {pbjtPct}%</dt>
            <dd className="font-mono tabular-nums">{rupiah(total.pb1_amount)}</dd>
          </div>
          {luar ? (
            <div>
              <dt className="text-sm text-muted-foreground">Delivery Fee</dt>
              <dd className="font-mono tabular-nums">{rupiah(total.delivery_amount)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm text-muted-foreground">Total</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{rupiah(total.grand_total)}</dd>
          </div>
        </dl>
        <div className="flex flex-col items-end gap-1">
          <Button type="button" size="lg" className="rounded-full" disabled={menunggu || Boolean(masalah)} onClick={simpan}>
            {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Simpan pesanan & buat invoice
          </Button>
          {masalah ? <p className="text-sm text-perhatian">{masalah}</p> : null}
        </div>
      </div>
    </div>
  );
}
