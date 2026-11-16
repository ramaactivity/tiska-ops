"use client";

import { Copy, ExternalLink, ImageOff, MessageCircle, Minus, PencilLine, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { Cetakan } from "@/lib/cetakan";
import { type BarisPesan, GRUP_CETAKAN, JENIS_CETAKAN, perkiraanBiaya, tautanWhatsApp, teksPesanCetak } from "@/lib/hitung/cetakan";
import { cn } from "@/lib/utils";

import { FormCetakan } from "./form-cetakan";

/** Pesanan yang sedang disusun: id cetakan → (id varian | "_") → lembar A3. */
type Keranjang = Record<string, Record<string, number>>;
const KUNCI_SIMPAN = "cetakan-keranjang";
const TANPA_VARIAN = "_";

const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const jumlahDi = (k: Keranjang, id: string) => Object.values(k[id] ?? {}).reduce((s, n) => s + n, 0);

export function KatalogCetakan({
  semua,
  grupAktif,
  lihatHarga,
  percetakan,
}: {
  semua: Cetakan[];
  grupAktif: string;
  lihatHarga: boolean;
  percetakan: { id: string; label: string }[];
}) {
  const [keranjang, setKeranjang] = useState<Keranjang>({});
  const [buka, setBuka] = useState<Cetakan | null>(null);
  const [ubah, setUbah] = useState<Cetakan | "baru" | null>(null);
  const [pesan, setPesan] = useState(false);

  // Pesanan yang belum dikirim diingat per browser (kenyamanan saja; aman kalau penyimpanan diblokir).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KUNCI_SIMPAN);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- baca sekali dari penyimpanan browser setelah hidrasi
      if (v) setKeranjang(JSON.parse(v) as Keranjang);
    } catch {}
  }, []);
  const simpanKeranjang = (k: Keranjang) => {
    setKeranjang(k);
    try {
      window.localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(k));
    } catch {}
  };
  const atur = (id: string, varian: string, lembar: number) => {
    const isi = { ...(keranjang[id] ?? {}), [varian]: Math.max(0, lembar) };
    if (!isi[varian]) delete isi[varian];
    const baru = { ...keranjang, [id]: isi };
    if (!Object.keys(isi).length) delete baru[id];
    simpanKeranjang(baru);
  };

  const tampil = grupAktif ? semua.filter((c) => c.grup === grupAktif) : semua;
  const perGrup = new Map<string, number>();
  for (const c of semua) perGrup.set(c.grup, (perGrup.get(c.grup) ?? 0) + 1);

  const dipesan = semua.filter((c) => jumlahDi(keranjang, c.id) > 0);
  const totalLembar = dipesan.reduce((s, c) => s + jumlahDi(keranjang, c.id), 0);
  const totalBiaya = dipesan.reduce((s, c) => s + (perkiraanBiaya(jumlahDi(keranjang, c.id), c.hargaPerA3) ?? 0), 0);
  const adaTanpaHarga = dipesan.some((c) => c.hargaPerA3 == null);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SaringStatus
          parameter="grup"
          pilihan={[
            { nilai: "", label: "Semua", jumlah: semua.length },
            ...Object.entries(GRUP_CETAKAN)
              .filter(([g]) => perGrup.has(g))
              .map(([g, label]) => ({ nilai: g, label, jumlah: perGrup.get(g) })),
          ]}
        />
        <Button variant="outline" className="rounded-full" onClick={() => setUbah("baru")}>
          <Plus className="size-4" /> Tambah cetakan
        </Button>
      </div>

      {tampil.length === 0 ? (
        <p className="kartu px-5 py-10 text-center text-muted-foreground">Belum ada cetakan di kelompok ini.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {tampil.map((c) => {
            const n = jumlahDi(keranjang, c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setBuka(c)}
                  className={cn(
                    "kartu flex h-full w-full flex-col overflow-hidden text-left transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
                    n > 0 && "ring-2 ring-primary/60",
                  )}
                >
                  <div className="relative aspect-[4/3] bg-muted/60">
                    <KotakGambar src={c.gambar} alt={c.nama} className="inset-3 sm:inset-5" />
                    <span className="absolute top-2 left-2 rounded-full bg-card/95 px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums shadow-sm sm:top-3 sm:left-3 sm:px-2.5 sm:text-xs">
                      {c.ukuran}
                    </span>
                    {n > 0 ? (
                      <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums sm:top-3 sm:right-3 sm:text-xs">
                        {n} lbr
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                    <p className="leading-snug font-semibold">{c.nama}</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">{[c.bahan, c.finishing].filter(Boolean).join(" · ") || "Bahan belum diisi"}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-muted-foreground">
                      <span>{c.varian.length ? `${c.varian.length} varian` : JENIS_CETAKAN[c.jenis as keyof typeof JENIS_CETAKAN]}</span>
                      {lihatHarga && c.hargaPerA3 != null ? <span className="font-medium text-foreground tabular-nums">{rupiah(c.hargaPerA3)}/A3</span> : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ringkasan pesanan menempel di bawah selama ada isinya. */}
      {totalLembar > 0 ? (
        <div className="sticky bottom-4 z-20 mt-6 flex justify-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border bg-card/95 py-2 pr-2 pl-5 shadow-[0_12px_32px_-12px_rgb(31_42_92/0.35)] backdrop-blur max-sm:pl-4">
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <p className="font-semibold">
                {dipesan.length} cetakan · {totalLembar} lembar A3
              </p>
              {lihatHarga && totalBiaya > 0 ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  ± {rupiah(totalBiaya)}
                  {adaTanpaHarga ? " + yang belum ada harganya" : ""}
                </p>
              ) : null}
            </div>
            <Button className="rounded-full px-5" onClick={() => setPesan(true)}>
              <MessageCircle className="size-4" /> Susun pesan
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={buka !== null} onOpenChange={(o) => (o ? null : setBuka(null))}>
        {buka ? (
          <DialogContent className="sm:max-w-3xl">
            <Rincian
              c={buka}
              isi={keranjang[buka.id] ?? {}}
              lihatHarga={lihatHarga}
              onAtur={(v, n) => atur(buka.id, v, n)}
              onUbah={() => {
                setUbah(buka);
                setBuka(null);
              }}
            />
            <DialogFooter>
              <Button onClick={() => setBuka(null)} className="rounded-full px-6">
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={pesan} onOpenChange={setPesan}>
        <DialogContent className="sm:max-w-2xl">
          <SusunPesan
            dipesan={dipesan}
            keranjang={keranjang}
            onKosongkan={() => {
              simpanKeranjang({});
              setPesan(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={ubah !== null} onOpenChange={(o) => (o ? null : setUbah(null))}>
        {ubah ? (
          <DialogContent className="sm:max-w-2xl">
            <FormCetakan awal={ubah === "baru" ? null : ubah} percetakan={percetakan} onSelesai={() => setUbah(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

/** Gambar di dalam kotak ber-rasio tetap: bingkai absolut memberi tinggi pasti, jadi gambar tegak/bulat tidak meluber. */
function KotakGambar({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={cn("absolute flex items-center justify-center", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- gambar R2 publik, ukuran kecil; next/image butuh domain terdaftar
        <img src={src} alt={alt} loading="lazy" className="max-h-full max-w-full rounded-[6px] object-contain drop-shadow-[0_4px_10px_rgb(31_42_92/0.18)]" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <ImageOff className="size-6" aria-hidden="true" /> Belum ada gambar
        </span>
      )}
    </div>
  );
}

function Stepper({ nilai, onUbah, label }: { nilai: number; onUbah: (n: number) => void; label: string }) {
  const tombol = "flex size-11 items-center justify-center rounded-full transition-[transform,background-color] duration-150 ease-out active:scale-[0.94] disabled:opacity-35";
  return (
    <div className="inline-flex items-center rounded-full border bg-card" role="group" aria-label={label}>
      <button type="button" className={cn(tombol, "hover:bg-muted")} disabled={nilai <= 0} onClick={() => onUbah(nilai - 1)} aria-label={`Kurangi ${label}`}>
        <Minus className="size-4" />
      </button>
      <span className="min-w-9 text-center font-semibold tabular-nums" aria-live="polite">
        {nilai}
      </span>
      <button type="button" className={cn(tombol, "bg-primary/10 text-primary hover:bg-primary/15")} onClick={() => onUbah(nilai + 1)} aria-label={`Tambah ${label}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Rincian({
  c,
  isi,
  lihatHarga,
  onAtur,
  onUbah,
}: {
  c: Cetakan;
  isi: Record<string, number>;
  lihatHarga: boolean;
  onAtur: (varian: string, lembar: number) => void;
  onUbah: () => void;
}) {
  const lembar = Object.values(isi).reduce((s, n) => s + n, 0);
  const spesifikasi: [string, React.ReactNode][] = [
    ["Ukuran", c.ukuran],
    ["Bahan", c.bahan ?? "—"],
    ["Finishing", c.finishing ?? "—"],
    ["Isi per A3", c.isiPerA3 ? `± ${c.isiPerA3} pcs` : "—"],
    ...(lihatHarga ? ([["Harga per A3", c.hargaPerA3 != null ? rupiah(c.hargaPerA3) : "—"]] as [string, React.ReactNode][]) : []),
    ["Percetakan", c.percetakan?.nama ?? "—"],
  ];
  return (
    <>
      <div className="pr-8">
        <DialogTitle className="text-lg font-semibold">{c.nama}</DialogTitle>
        <DialogDescription className="mt-1">
          {GRUP_CETAKAN[c.grup as keyof typeof GRUP_CETAKAN]} · {JENIS_CETAKAN[c.jenis as keyof typeof JENIS_CETAKAN]}
        </DialogDescription>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] rounded-2xl bg-muted/60">
          <KotakGambar src={c.gambar} alt={c.nama} className="inset-5" />
        </div>
        <div className="flex flex-col gap-4">
          <dl className="divide-y divide-dashed rounded-2xl border px-4">
            {spesifikasi.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <dt className="shrink-0 text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {c.canva ? (
              <Button variant="outline" className="rounded-full" render={<a href={c.canva} target="_blank" rel="noreferrer" />}>
                <ExternalLink className="size-4" /> Buka di Canva
              </Button>
            ) : null}
            <Button variant="ghost" className="rounded-full" onClick={onUbah}>
              <PencilLine className="size-4" /> Ubah data
            </Button>
          </div>
          {c.catatan ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.catatan}</p> : null}
        </div>
      </div>

      <section className="border-t pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{c.varian.length ? "Mau cetak yang mana?" : "Mau cetak berapa?"}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {lembar} lembar A3{c.isiPerA3 && lembar ? ` ≈ ${lembar * c.isiPerA3} pcs` : ""}
            {lihatHarga && c.hargaPerA3 != null && lembar ? ` · ± ${rupiah(lembar * c.hargaPerA3)}` : ""}
          </p>
        </div>
        {c.varian.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {c.varian.map((v) => {
              const n = isi[v.id] ?? 0;
              return (
                <li key={v.id} className={cn("flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors", n > 0 && "border-primary/50 bg-primary/5")}>
                  <div className="relative aspect-[4/3] w-full">
                    <KotakGambar src={v.gambar ?? c.gambar} alt={v.nama} className="inset-0" />
                  </div>
                  <p className="text-sm leading-snug font-medium">{v.nama}</p>
                  <Stepper nilai={n} onUbah={(x) => onAtur(v.id, x)} label={`lembar A3 ${v.nama}`} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3">
            <Stepper nilai={isi[TANPA_VARIAN] ?? 0} onUbah={(x) => onAtur(TANPA_VARIAN, x)} label="lembar A3" />
            <span className="text-sm text-muted-foreground">lembar A3</span>
          </div>
        )}
      </section>
    </>
  );
}

function SusunPesan({ dipesan, keranjang, onKosongkan }: { dipesan: Cetakan[]; keranjang: Keranjang; onKosongkan: () => void }) {
  // Satu pesan per percetakan; cetakan tanpa percetakan dikelompokkan sendiri (hanya bisa disalin).
  const kelompok = useMemo(() => {
    const peta = new Map<string, { nama: string; telepon: string | null; baris: BarisPesan[] }>();
    for (const c of dipesan) {
      const k = c.percetakan?.id ?? "";
      const g = peta.get(k) ?? { nama: c.percetakan?.nama ?? "Percetakan belum diatur", telepon: c.percetakan?.telepon ?? null, baris: [] };
      const isi = keranjang[c.id] ?? {};
      g.baris.push({
        judul: c.judulChat,
        ukuran: c.ukuranChat,
        bahan: c.bahan,
        finishing: c.finishing,
        jumlah: c.varian.length ? c.varian.map((v) => ({ varian: v.nama, lembar: isi[v.id] ?? 0 })) : [{ varian: null, lembar: isi[TANPA_VARIAN] ?? 0 }],
      });
      peta.set(k, g);
    }
    return [...peta.values()];
  }, [dipesan, keranjang]);

  return (
    <>
      <div>
        <DialogTitle className="text-lg font-semibold">Pesan ke percetakan</DialogTitle>
        <DialogDescription className="mt-1">Teks sudah tersusun. Salin, atau langsung buka WhatsApp — Anda sendiri yang menekan kirim.</DialogDescription>
      </div>
      {kelompok.map((g) => {
        const teks = teksPesanCetak(g.baris);
        const wa = tautanWhatsApp(g.telepon, teks);
        return (
          <section key={g.nama} className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Printer className="size-4 text-muted-foreground" aria-hidden="true" /> {g.nama}
            </p>
            <pre className="max-h-[45dvh] overflow-y-auto rounded-2xl rounded-tr-md bg-lunas-halus px-4 py-3 font-sans text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-foreground">{teks}</pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  navigator.clipboard.writeText(teks).then(
                    () => toast.success("Teks pesan disalin."),
                    () => toast.error("Gagal menyalin — tekan lama teksnya lalu salin manual."),
                  )
                }
              >
                <Copy className="size-4" /> Salin teks
              </Button>
              {wa ? (
                <Button className="rounded-full" render={<a href={wa} target="_blank" rel="noreferrer" />}>
                  <MessageCircle className="size-4" /> Buka WhatsApp
                </Button>
              ) : null}
            </div>
          </section>
        );
      })}
      <p className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Jangan lupa lampirkan file desainnya di chat yang sama: <b className="font-medium text-foreground">Buka di Canva → Bagikan → Unduh → PDF Cetak</b>.
      </p>
      <DialogFooter>
        <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={onKosongkan}>
          <Trash2 className="size-4" /> Kosongkan pesanan
        </Button>
      </DialogFooter>
    </>
  );
}
