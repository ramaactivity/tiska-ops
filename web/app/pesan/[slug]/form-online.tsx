"use client";

import { CircleCheck, LoaderCircle, MessageCircle, Minus, Plus, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { PilihJam } from "@/components/pilih-jam";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARA_BAYAR, cekPesanan } from "@/lib/hitung/ikut-menu-pesta";
import { hitungTotalDokumen, rupiah } from "@/lib/uang";

import { pesanOnline } from "./actions";

const angka = (t: string) => Number(t.replace(/\D/g, "")) || 0;

/** Form pembeli retail — mesin hitung total sama dengan invoice (lib/uang). */
export function FormOnline({
  slug,
  paket,
  harga,
  minPax,
  area,
  pbjtPct,
  waAdmin,
}: {
  slug: string;
  paket: { id: string; judul: string; isi: string[] }[];
  harga: number;
  minPax: number;
  area: string;
  pbjtPct: number;
  waAdmin: string;
}) {
  const [menunggu, mulai] = useTransition();
  const [pax, setPax] = useState<Record<string, number>>({});
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [maps, setMaps] = useState("");
  const [jam, setJam] = useState("");
  const [catatan, setCatatan] = useState("");
  const [bayar, setBayar] = useState<"transfer" | "cod">("transfer");
  const [luar, setLuar] = useState(false);
  const [situs, setSitus] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);

  const isi = paket.filter((p) => (pax[p.id] ?? 0) > 0);
  const total = hitungTotalDokumen({
    // Paket 0 pax dibuang: di mesin hitung pax kosong berarti SATU (lib/uang), sama seperti server.
    items: isi.map((p) => ({ qty: 1, pax: pax[p.id], price: harga, charge_pb1: true, charge_service: false })),
    pb1_enabled: true,
    pb1_percent: pbjtPct,
    delivery_amount: 0,
  });
  const masalah = cekPesanan({ pax: paket.map((p) => pax[p.id] ?? 0), minPax, maksPax: null, paxTerpakai: 0 });
  const ubahPax = (id: string, n: number) => setPax((x) => ({ ...x, [id]: Math.min(300, Math.max(0, n)) }));

  const kirim = () =>
    mulai(async () => {
      setGalat(null);
      const r = await pesanOnline(slug, { nama, hp, alamat, maps, jam, catatan, bayar, luarArea: luar, situs, paket: paket.map((p) => ({ idSet: p.id, pax: pax[p.id] ?? 0 })) });
      if (!r.ok) setGalat(r.pesan);
      else {
        setTerkirim(true);
        window.scrollTo({ top: 0 });
      }
    });

  if (terkirim) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <CircleCheck className="size-8 text-lunas" />
        <h2 className="text-lg font-semibold">Pesanan Anda sudah kami terima</h2>
        <p className="text-[0.9375rem]">{isi.map((p) => `${p.judul} × ${pax[p.id]} pax`).join(" · ")}</p>
        <p className="text-[0.9375rem]">
          Total <span className="font-mono font-semibold tabular-nums">{rupiah(total.grand_total)}</span>
          <span className="text-muted-foreground"> (sudah PBJT{luar ? ", belum Delivery Fee luar area" : ""})</span>
        </p>
        <p className="text-[0.9375rem] text-muted-foreground">
          Admin Tiska akan menghubungi nomor WhatsApp {hp} untuk konfirmasi{bayar === "transfer" ? " dan info rekening" : ""}.
          {luar ? ` Karena alamat di luar area ${area}, ongkir dan jadwal kirim dikonfirmasi admin dulu.` : ""}
        </p>
        <a href={waAdmin} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-medium hover:bg-accent">
          <MessageCircle className="size-4" />
          Chat admin di WhatsApp
        </a>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">1. Pilih menu & jumlah</h2>
        <p className="-mt-1.5 text-sm text-muted-foreground">Minimal {minPax} pax per pesanan, boleh campur menu.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {paket.map((p) => (
            <div key={p.id} className="flex min-w-0 flex-col justify-between gap-3 rounded-[14px] border p-4">
              <div>
                <p className="font-semibold">{p.judul}</p>
                <ul className="mt-1 text-[0.9375rem] text-muted-foreground">
                  {p.isi.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon-lg" className="size-11 rounded-full" aria-label={`Kurangi ${p.judul}`} onClick={() => ubahPax(p.id, (pax[p.id] ?? 0) - 1)}>
                  <Minus className="size-4" />
                </Button>
                <Input
                  aria-label={`Jumlah pax ${p.judul}`}
                  inputMode="numeric"
                  className="h-11 w-16 text-center font-mono text-lg"
                  value={String(pax[p.id] ?? 0)}
                  onChange={(e) => ubahPax(p.id, angka(e.target.value))}
                />
                <Button type="button" variant="outline" size="icon-lg" className="size-11 rounded-full" aria-label={`Tambah ${p.judul}`} onClick={() => ubahPax(p.id, (pax[p.id] ?? 0) + 1)}>
                  <Plus className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">pax</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">2. Data penerima</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nama">Nama penerima</Label>
            <Input id="nama" autoComplete="name" className="h-11" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hp">Nomor WhatsApp</Label>
            <Input id="hp" inputMode="tel" autoComplete="tel" placeholder="0812xxxxxxx" className="h-11" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="alamat">Alamat kirim lengkap</Label>
            <Textarea id="alamat" autoComplete="street-address" className="min-h-20" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maps">Link Google Maps (opsional)</Label>
            <Input id="maps" className="h-11" value={maps} onChange={(e) => setMaps(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jam terima (opsional)</Label>
            <PilihJam value={jam} onChange={setJam} aria-label="Jam terima" />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-[12px] border p-3.5">
          <Checkbox checked={luar} onCheckedChange={(v) => setLuar(Boolean(v))} className="mt-1" />
          <span className="text-[0.9375rem]">
            Alamat saya di luar area {area}
            <span className="block text-sm text-muted-foreground">Tetap bisa pesan — ongkir & jadwal kirim dikonfirmasi admin dulu.</span>
          </span>
        </label>
        {/* Jebakan robot — tidak terlihat & tidak bisa difokus oleh manusia. */}
        <input type="text" name="situs" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={situs} onChange={(e) => setSitus(e.target.value)} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">3. Pembayaran</h2>
        <PilihanChip label="Cara bayar" nilai={bayar} onPilih={(v) => setBayar(v as "transfer" | "cod")} pilihan={Object.entries(CARA_BAYAR).map(([nilai, label]) => ({ nilai, label }))} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="catatan">Catatan (opsional)</Label>
          <Textarea id="catatan" className="min-h-12" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <dl className="flex flex-col gap-1 text-[0.9375rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono tabular-nums">{rupiah(total.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">PBJT {pbjtPct}%</dt>
            <dd className="font-mono tabular-nums">{rupiah(total.pb1_amount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Ongkir</dt>
            <dd>{luar ? "dikonfirmasi admin" : `Gratis area ${area}`}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{rupiah(total.grand_total)}</dd>
          </div>
        </dl>
        {galat ? <p className="rounded-[12px] bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{galat}</p> : null}
        <Button type="button" size="lg" className="min-h-12 w-full rounded-full text-base" disabled={menunggu || Boolean(masalah)} onClick={kirim}>
          {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          Kirim pesanan
        </Button>
        {masalah ? <p className="text-center text-sm text-muted-foreground">{masalah}</p> : null}
        <p className="text-center text-sm text-muted-foreground">
          Lebih suka lewat chat?{" "}
          <a href={waAdmin} target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-4">
            Pesan lewat admin WhatsApp
          </a>
        </p>
      </section>
    </div>
  );
}
