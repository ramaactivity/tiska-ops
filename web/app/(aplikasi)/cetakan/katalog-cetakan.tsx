"use client";

import { Copy, ExternalLink, History, ImageOff, MessageCircle, Minus, PencilLine, Plus, Printer, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihTanggal } from "@/components/pilih-tanggal";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Cetakan, Permintaan } from "@/lib/cetakan";
import {
  type BarisPesan,
  GRUP_CETAKAN,
  JENIS_CETAKAN,
  keadaanStok,
  LABEL_KEADAAN_STOK,
  perkiraanBiaya,
  tautanWhatsApp,
  teksPesanCetak,
} from "@/lib/hitung/cetakan";
import { cn } from "@/lib/utils";

import { catatStok, mintaCetak } from "./actions";
import { DaftarPermintaan } from "./daftar-permintaan";
import { FormCetakan } from "./form-cetakan";

/** Pesanan yang sedang disusun: id cetakan → (id varian | "_") → lembar A3. */
export type Keranjang = Record<string, Record<string, number>>;
const KUNCI_SIMPAN = "cetakan-keranjang";
export const TANPA_VARIAN = "_";

const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const jumlahDi = (k: Keranjang, id: string) => Object.values(k[id] ?? {}).reduce((s, n) => s + n, 0);
const satuan = (c: Cetakan) => (c.satuanStok === "pcs" ? "pcs" : "lembar");
/** Sisa total satu cetakan (jumlah varian yang sudah dihitung); null = belum pernah dihitung. */
const sisaTotal = (c: Cetakan) => {
  const angka = c.varian.length ? c.varian.map((v) => v.sisa).filter((x): x is number => x != null) : c.sisa == null ? [] : [c.sisa];
  return angka.length ? angka.reduce((s, n) => s + n, 0) : null;
};

export function KatalogCetakan({
  semua,
  permintaan,
  tab,
  grupAktif,
  lihatHarga,
  bolehUbah,
  idSaya,
  percetakan,
}: {
  semua: Cetakan[];
  permintaan: Permintaan[];
  tab: "katalog" | "permintaan";
  grupAktif: string;
  lihatHarga: boolean;
  /** Admin/owner: ubah katalog, putus permintaan, susun pesan ke percetakan. Peran lain: "Minta cetak". */
  bolehUbah: boolean;
  idSaya: string;
  percetakan: { id: string; label: string }[];
}) {
  const [keranjang, setKeranjang] = useState<Keranjang>({});
  const [bukaId, setBukaId] = useState<string | null>(null);
  const [ubah, setUbah] = useState<Cetakan | "baru" | null>(null);
  const [kirim, setKirim] = useState(false);

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
  /** Isi permintaan yang disetujui ditambahkan ke pesanan, lalu langsung dibuka susunan pesannya. */
  const masukkan = (baris: Permintaan["baris"]) => {
    const baru: Keranjang = structuredClone(keranjang);
    for (const b of baris) {
      const k = b.varianId ?? TANPA_VARIAN;
      baru[b.itemId] = { ...(baru[b.itemId] ?? {}), [k]: (baru[b.itemId]?.[k] ?? 0) + b.lembar };
    }
    simpanKeranjang(baru);
    setKirim(true);
  };

  const buka = bukaId ? (semua.find((c) => c.id === bukaId) ?? null) : null;
  const tampil = grupAktif ? semua.filter((c) => c.grup === grupAktif) : semua;
  const perGrup = new Map<string, number>();
  for (const c of semua) perGrup.set(c.grup, (perGrup.get(c.grup) ?? 0) + 1);
  const menunggu = permintaan.filter((p) => p.status === "diajukan" || p.status === "perlu_tanya").length;

  // "Sama seperti terakhir": permintaan terakhir saya per cetakan.
  const terakhir = useMemo(() => {
    const peta = new Map<string, Record<string, number>>();
    for (const p of permintaan.filter((x) => x.peminta.id === idSaya && x.status !== "batal")) {
      const per = new Map<string, Record<string, number>>();
      for (const b of p.baris) per.set(b.itemId, { ...(per.get(b.itemId) ?? {}), [b.varianId ?? TANPA_VARIAN]: b.lembar });
      for (const [id, isi] of per) if (!peta.has(id)) peta.set(id, isi);
    }
    return peta;
  }, [permintaan, idSaya]);

  const dipesan = semua.filter((c) => jumlahDi(keranjang, c.id) > 0);
  const totalLembar = dipesan.reduce((s, c) => s + jumlahDi(keranjang, c.id), 0);
  const totalBiaya = dipesan.reduce((s, c) => s + (perkiraanBiaya(jumlahDi(keranjang, c.id), c.hargaPerA3) ?? 0), 0);
  const adaTanpaHarga = dipesan.some((c) => c.hargaPerA3 == null);

  return (
    <>
      <div className="mb-5">
        <SaringStatus
          parameter="tab"
          pilihan={[
            { nilai: "", label: "Katalog", jumlah: semua.length },
            { nilai: "permintaan", label: bolehUbah ? "Permintaan" : "Permintaan saya", jumlah: menunggu || undefined },
          ]}
        />
      </div>

      {tab === "permintaan" ? (
        <DaftarPermintaan permintaan={permintaan} bolehUbah={bolehUbah} idSaya={idSaya} onMasukkan={masukkan} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SaringStatus
              parameter="grup"
              pilihan={[
                { nilai: "", label: "Semua" },
                ...Object.entries(GRUP_CETAKAN)
                  .filter(([g]) => perGrup.has(g))
                  .map(([g, label]) => ({ nilai: g, label, jumlah: perGrup.get(g) })),
              ]}
            />
            {bolehUbah ? (
              <Button variant="outline" className="rounded-full" onClick={() => setUbah("baru")}>
                <Plus className="size-4" /> Tambah cetakan
              </Button>
            ) : null}
          </div>

          {tampil.length === 0 ? (
            <p className="kartu px-5 py-10 text-center text-muted-foreground">Belum ada cetakan di kelompok ini.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {tampil.map((c) => (
                <li key={c.id}>
                  <KartuCetakan c={c} lembar={jumlahDi(keranjang, c.id)} lihatHarga={lihatHarga} onBuka={() => setBukaId(c.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
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
            <Button className="rounded-full px-5" onClick={() => setKirim(true)}>
              {bolehUbah ? <MessageCircle className="size-4" /> : <Send className="size-4" />} {bolehUbah ? "Susun pesan" : "Minta cetak"}
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={buka !== null} onOpenChange={(o) => (o ? null : setBukaId(null))}>
        {buka ? (
          <DialogContent className="sm:max-w-3xl">
            <Rincian
              c={buka}
              isi={keranjang[buka.id] ?? {}}
              terakhir={terakhir.get(buka.id) ?? null}
              lihatHarga={lihatHarga}
              bolehUbah={bolehUbah}
              onAtur={(v, n) => atur(buka.id, v, n)}
              onSamakan={(isi) => simpanKeranjang({ ...keranjang, [buka.id]: { ...isi } })}
              onUbah={() => {
                setUbah(buka);
                setBukaId(null);
              }}
            />
            <DialogFooter>
              <Button onClick={() => setBukaId(null)} className="rounded-full px-6">
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={kirim} onOpenChange={setKirim}>
        <DialogContent className="sm:max-w-2xl">
          {bolehUbah ? (
            <SusunPesan
              dipesan={dipesan}
              keranjang={keranjang}
              onKosongkan={() => {
                simpanKeranjang({});
                setKirim(false);
              }}
            />
          ) : (
            <FormMinta
              dipesan={dipesan}
              keranjang={keranjang}
              onTerkirim={() => {
                simpanKeranjang({});
                setKirim(false);
              }}
            />
          )}
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

function KartuCetakan({ c, lembar, lihatHarga, onBuka }: { c: Cetakan; lembar: number; lihatHarga: boolean; onBuka: () => void }) {
  const sisa = c.jenis === "stok" ? sisaTotal(c) : null;
  const keadaan = c.jenis === "stok" ? keadaanStok(sisa, c.stokMin) : null;
  return (
    <button
      type="button"
      onClick={onBuka}
      className={cn(
        "kartu flex h-full w-full flex-col overflow-hidden text-left transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
        lembar > 0 && "ring-2 ring-primary/60",
      )}
    >
      <div className="relative aspect-[4/3] bg-muted/60">
        <KotakGambar src={c.gambar} alt={c.nama} className="inset-3 sm:inset-5" />
        <span className="absolute top-2 left-2 rounded-full bg-card/95 px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums shadow-sm sm:top-3 sm:left-3 sm:px-2.5 sm:text-xs">{c.ukuran}</span>
        {lembar > 0 ? (
          <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums sm:top-3 sm:right-3 sm:text-xs">{lembar} lbr</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="leading-snug font-semibold">{c.nama}</p>
        <p className="text-xs text-muted-foreground sm:text-sm">{[c.bahan, c.finishing].filter(Boolean).join(" · ") || "Bahan belum diisi"}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-xs text-muted-foreground">
          {keadaan ? <LencanaStok keadaan={keadaan} sisa={sisa} satuan={satuan(c)} /> : <span>{c.varian.length ? `${c.varian.length} varian` : JENIS_CETAKAN[c.jenis as keyof typeof JENIS_CETAKAN]}</span>}
          {lihatHarga && c.hargaPerA3 != null ? <span className="font-medium text-foreground tabular-nums">{rupiah(c.hargaPerA3)}/A3</span> : null}
        </div>
      </div>
    </button>
  );
}

function LencanaStok({ keadaan, sisa, satuan }: { keadaan: ReturnType<typeof keadaanStok>; sisa: number | null; satuan: string }) {
  const gaya = { belum: "text-muted-foreground", aman: "bg-lunas-halus text-lunas", menipis: "bg-perhatian-halus text-perhatian", habis: "bg-destructive/10 text-destructive" }[keadaan];
  const teks = keadaan === "belum" ? LABEL_KEADAAN_STOK.belum : keadaan === "habis" ? "Habis" : `${keadaan === "menipis" ? "Menipis · " : "Sisa "}${sisa} ${satuan}`;
  return <span className={cn("rounded-full font-medium tabular-nums", keadaan !== "belum" && "px-2 py-0.5", gaya)}>{teks}</span>;
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

export function Stepper({ nilai, onUbah, label, min = 0 }: { nilai: number; onUbah: (n: number) => void; label: string; min?: number }) {
  const tombol = "flex size-11 items-center justify-center rounded-full transition-[transform,background-color] duration-150 ease-out active:scale-[0.94] disabled:opacity-35";
  return (
    <div className="inline-flex items-center rounded-full border bg-card" role="group" aria-label={label}>
      <button type="button" className={cn(tombol, "hover:bg-muted")} disabled={nilai <= min} onClick={() => onUbah(nilai - 1)} aria-label={`Kurangi ${label}`}>
        <Minus className="size-4" />
      </button>
      {/* Angka bisa diketik langsung (hitung 96 pcs tanpa menekan + 96 kali). 16px: iOS tidak memperbesar layar. */}
      <input
        value={nilai}
        inputMode="numeric"
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, "").slice(0, 6) || 0);
          onUbah(Math.max(min, n));
        }}
        className="w-12 bg-transparent text-center text-[16px] font-semibold tabular-nums outline-none"
      />
      <button type="button" className={cn(tombol, "bg-primary/10 text-primary hover:bg-primary/15")} onClick={() => onUbah(nilai + 1)} aria-label={`Tambah ${label}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Rincian({
  c,
  isi,
  terakhir,
  lihatHarga,
  bolehUbah,
  onAtur,
  onSamakan,
  onUbah,
}: {
  c: Cetakan;
  isi: Record<string, number>;
  terakhir: Record<string, number> | null;
  lihatHarga: boolean;
  bolehUbah: boolean;
  onAtur: (varian: string, lembar: number) => void;
  onSamakan: (isi: Record<string, number>) => void;
  onUbah: () => void;
}) {
  const lembar = Object.values(isi).reduce((s, n) => s + n, 0);
  const spesifikasi: [string, React.ReactNode][] = [
    ["Ukuran", c.ukuran],
    ["Bahan", c.bahan ?? "—"],
    ["Finishing", c.finishing ?? "—"],
    ["Isi per A3", c.isiPerA3 ? `± ${c.isiPerA3} pcs` : "—"],
    ...(lihatHarga ? ([["Harga per A3", c.hargaPerA3 != null ? rupiah(c.hargaPerA3) : "—"]] as [string, React.ReactNode][]) : []),
    ...(c.jenis === "stok" ? ([["Stok minimum", c.stokMin != null ? `${c.stokMin} ${satuan(c)}` : "—"]] as [string, React.ReactNode][]) : []),
  ];
  const ringkasTerakhir = terakhir
    ? Object.entries(terakhir)
        .map(([k, n]) => `${k === TANPA_VARIAN ? "" : `${c.varian.find((v) => v.id === k)?.nama ?? "?"} `}${n}`)
        .join(", ")
    : null;
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
          {bolehUbah ? (
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
          ) : null}
          {c.catatan ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.catatan}</p> : null}
        </div>
      </div>

      <section className="border-t pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">{c.varian.length ? "Mau cetak yang mana?" : "Mau cetak berapa?"}</h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              {lembar} lembar A3{c.isiPerA3 && lembar ? ` ≈ ${lembar * c.isiPerA3} pcs` : ""}
              {lihatHarga && c.hargaPerA3 != null && lembar ? ` · ± ${rupiah(lembar * c.hargaPerA3)}` : ""}
            </p>
          </div>
          {terakhir && ringkasTerakhir ? (
            <Button variant="outline" className="rounded-full" onClick={() => onSamakan(terakhir)}>
              <History className="size-4" /> Sama seperti terakhir ({ringkasTerakhir})
            </Button>
          ) : null}
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
                  {c.jenis === "stok" ? <LencanaStok keadaan={keadaanStok(v.sisa, c.stokMin)} sisa={v.sisa} satuan={satuan(c)} /> : null}
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

      {c.jenis === "stok" ? <PanelStok c={c} /> : null}
    </>
  );
}

const JENIS_CATAT = [
  ["pakai", "Pakai"],
  ["masuk", "Masuk"],
  ["koreksi", "Hitung ulang"],
] as const;

/** Stok sekarang per varian + catat pakai / masuk / hitung ulang, langsung di tempat (tanpa popup bertumpuk). */
function PanelStok({ c }: { c: Cetakan }) {
  const baris = c.varian.length ? c.varian.map((v) => ({ id: v.id, nama: v.nama, sisa: v.sisa })) : [{ id: null as string | null, nama: c.nama, sisa: c.sisa }];
  const [aktif, setAktif] = useState<string | null>(null);
  const [jenis, setJenis] = useState<(typeof JENIS_CATAT)[number][0]>("pakai");
  const [jumlah, setJumlah] = useState(1);
  const [sedang, mulai] = useTransition();
  const u = satuan(c);

  function simpan(varianId: string | null) {
    mulai(async () => {
      const h = await catatStok({ itemId: c.id, varianId, jenis, jumlah, catatan: "" });
      if (h.ok) {
        toast.success(h.pesan);
        setAktif(null);
      } else toast.error(h.pesan);
    });
  }

  return (
    <section className="border-t pt-4">
      <h3 className="font-semibold">Stok di rak</h3>
      <p className="mb-2 text-sm text-muted-foreground">Dihitung per {u}. Catat setiap kali dipakai, atau hitung ulang kalau angkanya beda dengan di rak.</p>
      <ul className="divide-y rounded-2xl border">
        {baris.map((b) => {
          const kunci = b.id ?? TANPA_VARIAN;
          const terbuka = aktif === kunci;
          return (
            <li key={kunci} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 text-sm font-medium">{b.nama}</span>
                <LencanaStok keadaan={keadaanStok(b.sisa, c.stokMin)} sisa={b.sisa} satuan={u} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setAktif(terbuka ? null : kunci);
                    setJenis(b.sisa == null ? "koreksi" : "pakai");
                    setJumlah(b.sisa == null ? 0 : 1);
                  }}
                >
                  {terbuka ? "Tutup" : "Ubah stok"}
                </Button>
              </div>
              {terbuka ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 pb-1">
                  <div className="inline-flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Jenis catatan stok">
                    {JENIS_CATAT.map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={jenis === v}
                        onClick={() => {
                          setJenis(v);
                          setJumlah(v === "koreksi" ? Math.max(b.sisa ?? 0, 0) : 1);
                        }}
                        className={cn("min-h-9 rounded-full px-3.5 text-sm transition-colors", jenis === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Stepper nilai={jumlah} onUbah={setJumlah} label={`${u} ${b.nama}`} min={jenis === "koreksi" ? 0 : 1} />
                  <span className="text-sm text-muted-foreground">{jenis === "koreksi" ? `${u} di rak sekarang` : u}</span>
                  <Button className="rounded-full px-5" disabled={sedang} onClick={() => simpan(b.id)}>
                    Simpan
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Baris pesanan dari keranjang (dipakai susun pesan & minta cetak). */
function barisDari(c: Cetakan, isi: Record<string, number>) {
  return c.varian.length ? c.varian.map((v) => ({ varian: v.nama, varianId: v.id as string | null, lembar: isi[v.id] ?? 0 })) : [{ varian: null, varianId: null, lembar: isi[TANPA_VARIAN] ?? 0 }];
}

function SusunPesan({ dipesan, keranjang, onKosongkan }: { dipesan: Cetakan[]; keranjang: Keranjang; onKosongkan: () => void }) {
  // Satu pesan per percetakan; cetakan tanpa percetakan dikelompokkan sendiri (hanya bisa disalin).
  const kelompok = useMemo(() => {
    const peta = new Map<string, { nama: string; telepon: string | null; baris: BarisPesan[] }>();
    for (const c of dipesan) {
      const k = c.percetakan?.id ?? "";
      const g = peta.get(k) ?? { nama: c.percetakan?.nama ?? "Percetakan belum diatur", telepon: c.percetakan?.telepon ?? null, baris: [] };
      g.baris.push({ judul: c.judulChat, ukuran: c.ukuranChat, bahan: c.bahan, finishing: c.finishing, jumlah: barisDari(c, keranjang[c.id] ?? {}) });
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

/** Tanggal WIB "YYYY-MM-DD" + n hari. */
function tanggalWib(tambahHari: number) {
  const d = new Date(Date.now() + 7 * 3_600_000 + tambahHari * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function FormMinta({ dipesan, keranjang, onTerkirim }: { dipesan: Cetakan[]; keranjang: Keranjang; onTerkirim: () => void }) {
  const cepat = [
    ["Hari ini", tanggalWib(0)],
    ["Besok", tanggalWib(1)],
    ["Lusa", tanggalWib(2)],
  ] as const;
  const [tanggal, setTanggal] = useState<string>(cepat[1][1]);
  const [catatan, setCatatan] = useState("");
  const [sedang, mulai] = useTransition();
  const baris = dipesan.flatMap((c) => barisDari(c, keranjang[c.id] ?? {}).filter((b) => b.lembar > 0).map((b) => ({ c, ...b })));

  function kirim() {
    mulai(async () => {
      const h = await mintaCetak({ tanggal, catatan, baris: baris.map((b) => ({ itemId: b.c.id, varianId: b.varianId, lembar: b.lembar })) });
      if (h.ok) {
        toast.success(h.pesan);
        onTerkirim();
      } else toast.error(h.pesan);
    });
  }

  return (
    <>
      <div>
        <DialogTitle className="text-lg font-semibold">Minta cetak</DialogTitle>
        <DialogDescription className="mt-1">Permintaan dikirim ke pemegang cetakan. Kabarnya muncul di tab Permintaan saya.</DialogDescription>
      </div>
      <ul className="divide-y rounded-2xl border">
        {baris.map((b) => (
          <li key={`${b.c.id}-${b.varianId ?? TANPA_VARIAN}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{b.varian ?? b.c.nama}</span>
              {b.varian ? <span className="block text-xs text-muted-foreground">{b.c.nama}</span> : null}
            </span>
            <span className="font-semibold tabular-nums">{b.lembar} lembar</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Dibutuhkan kapan?</p>
        <div className="flex flex-wrap items-center gap-2">
          {cepat.map(([label, t]) => (
            <button
              key={label}
              type="button"
              onClick={() => setTanggal(t)}
              aria-pressed={tanggal === t}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97]",
                tanggal === t ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
          <PilihTanggal value={tanggal} onChange={(t) => t && setTanggal(t)} bisaHapus={false} className="w-44" aria-label="Pilih tanggal dibutuhkan" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Catatan (opsional)</p>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="mis. diambil besok pagi, untuk event Unpak" />
      </div>
      <DialogFooter>
        <Button className="rounded-full px-6" onClick={kirim} disabled={sedang || !baris.length}>
          <Send className="size-4" /> {sedang ? "Mengirim…" : "Kirim permintaan"}
        </Button>
      </DialogFooter>
    </>
  );
}
