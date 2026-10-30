"use client";

import { zipSync } from "fflate";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, ImagePlus, LoaderCircle, Maximize2, Send, Star, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { kecilkanGambar } from "@/lib/foto";
import type { FotoTampil } from "@/lib/foto-menu";
import { namaUnduhan, SAJIAN } from "@/lib/hitung/foto-menu";
import { cn } from "@/lib/utils";

import { aturFoto, hapusFoto, jadikanUtama, mintaUnggah, sembunyikanFoto, simpanFoto, tandaiFoto } from "./actions";

type Hasil = { ok: boolean; pesan: string };
const PILIHAN_SAJIAN = Object.entries(SAJIAN).map(([nilai, label]) => ({ nilai, label }));

async function berkasFoto(daftar: FotoTampil[], judul: string): Promise<File[]> {
  return Promise.all(
    daftar.map(async (f, i) => {
      const r = await fetch(f.utama);
      if (!r.ok) throw new Error("Foto gagal diambil. Periksa sinyal.");
      return new File([await r.blob()], namaUnduhan(f.tujuan ?? judul, i + 1), { type: "image/jpeg" });
    }),
  );
}

function unduhBlob(blob: Blob, nama: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Unduh: satu foto = JPG, beberapa = satu ZIP. */
async function unduh(daftar: FotoTampil[], judul: string) {
  const berkas = await berkasFoto(daftar, judul);
  if (berkas.length === 1) return unduhBlob(berkas[0], berkas[0].name);
  const isi = Object.fromEntries(await Promise.all(berkas.map(async (b) => [b.name, new Uint8Array(await b.arrayBuffer())] as const)));
  unduhBlob(new Blob([zipSync(isi, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: "application/zip" }), `${namaUnduhan(judul, 0).replace(/-0\.jpg$/, "")}.zip`);
}

/** Kirim lewat lembar bagikan HP (WhatsApp ada di sana). Laptop tanpa lembar bagikan → diunduh. */
async function kirim(daftar: FotoTampil[], judul: string): Promise<string> {
  const berkas = await berkasFoto(daftar, judul);
  if (navigator.canShare?.({ files: berkas })) {
    try {
      await navigator.share({ files: berkas });
    } catch (e) {
      if ((e as Error).name !== "AbortError") throw e;
    }
    return "";
  }
  await unduh(daftar, judul);
  return "Di laptop foto diunduh — lampirkan di WhatsApp Web.";
}

/**
 * Galeri foto satu menu / paket / "Belum ditandai" (D-124). Ketuk foto = pilih; ikon perbesar = lihat besar.
 * `tujuan` null = kotak masuk "Belum ditandai" (unggahan massal arsip Drive).
 */
export function Galeri({
  foto,
  judul,
  tujuan,
  opsiMenu,
  opsiPaket,
  bolehHapus,
}: {
  foto: FotoTampil[];
  judul: string;
  tujuan: { idMenu?: string; idPaket?: string } | null;
  opsiMenu: OpsiCari[];
  opsiPaket: OpsiCari[];
  bolehHapus: boolean;
}) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [pilih, setPilih] = useState<string[]>([]);
  const [lihatSembunyi, setLihatSembunyi] = useState(false);
  const [unggah, setUnggah] = useState<{ selesai: number; total: number } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [tandai, setTandai] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [besar, setBesar] = useState<number | null>(null);
  const masukan = useRef<HTMLInputElement>(null);

  const tampil = foto.filter((f) => lihatSembunyi || !f.sembunyi);
  const dipilih = foto.filter((f) => pilih.includes(f.id));
  const tersembunyi = foto.filter((f) => f.sembunyi).length;
  const jalan = (kerja: () => Promise<Hasil>, sesudah?: () => void) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) toast.error(r.pesan);
      else {
        toast.success(r.pesan);
        sesudah?.();
        router.refresh();
      }
    });
  const bagikan = async (daftar: FotoTampil[], cara: "kirim" | "unduh") => {
    const kirimDaftar = daftar.filter((f) => !f.sembunyi);
    if (!kirimDaftar.length) return toast.error("Foto tersembunyi tidak ikut dikirim.");
    setSibuk(true);
    try {
      const catatan = cara === "kirim" ? await kirim(kirimDaftar, judul) : (await unduh(kirimDaftar, judul), "");
      if (catatan) toast.success(catatan);
    } catch (e) {
      toast.error((e as Error).message || "Gagal. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  };

  async function unggahBerkas(berkas: File[]) {
    const gambar = berkas.filter((b) => b.type.startsWith("image/"));
    if (!gambar.length) return;
    setUnggah({ selesai: 0, total: gambar.length });
    let berhasil = 0;
    const gagal: string[] = [];
    for (let i = 0; i < gambar.length; i += 10) {
      const potong = gambar.slice(i, i + 10);
      try {
        const kecil = await Promise.all(
          potong.map(async (b) => ({ b, utama: await kecilkanGambar(b, 2048, 0.82), thumb: await kecilkanGambar(b, 480, 0.72) })).map((p) => p.catch(() => null)),
        );
        const siap = kecil.filter((k): k is NonNullable<typeof k> => k !== null);
        for (const [j, k] of kecil.entries()) if (!k) gagal.push(potong[j].name);
        if (!siap.length) continue;
        const slot = await mintaUnggah(siap.length);
        if (!slot.ok) throw new Error(slot.pesan);
        const terkirim = await Promise.all(
          siap.map(async (k, j) => {
            const s = slot.slot[j];
            const [a, t] = await Promise.all([
              fetch(s.urlUtama, { method: "PUT", body: k.utama.blob, headers: { "content-type": "image/jpeg" } }),
              fetch(s.urlThumb, { method: "PUT", body: k.thumb.blob, headers: { "content-type": "image/jpeg" } }),
            ]);
            if (!a.ok || !t.ok) {
              gagal.push(k.b.name);
              return null;
            }
            return { kunci: s.kunci, kunciThumb: s.kunciThumb, lebar: k.utama.lebar, tinggi: k.utama.tinggi, namaAsli: k.b.name.slice(0, 255), ...(tujuan ?? {}) };
          }),
        );
        const sah = terkirim.filter((x): x is NonNullable<typeof x> => x !== null);
        if (sah.length) {
          const r = await simpanFoto(sah);
          if (r.ok) berhasil += sah.length;
          else gagal.push(...sah.map((x) => x.namaAsli));
        }
      } catch (e) {
        gagal.push(...potong.map((b) => b.name));
        toast.error((e as Error).message);
      }
      setUnggah({ selesai: Math.min(i + 10, gambar.length), total: gambar.length });
    }
    setUnggah(null);
    if (berhasil) toast.success(`${berhasil} foto terunggah.`);
    if (gagal.length) toast.error(`${gagal.length} foto gagal: ${gagal.slice(0, 3).join(", ")}${gagal.length > 3 ? "…" : ""}`);
    router.refresh();
  }

  const f = besar !== null ? tampil[besar] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={masukan}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const b = [...(e.target.files ?? [])];
            e.target.value = "";
            void unggahBerkas(b);
          }}
        />
        <Button type="button" className="rounded-full" disabled={Boolean(unggah)} onClick={() => masukan.current?.click()}>
          {unggah ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {unggah ? `Mengunggah ${unggah.selesai}/${unggah.total}…` : tujuan ? "Unggah foto" : "Unggah banyak foto"}
        </Button>
        {tampil.length ? (
          <Button type="button" variant="outline" className="rounded-full bg-card" onClick={() => setPilih(pilih.length === tampil.length ? [] : tampil.map((x) => x.id))}>
            {pilih.length === tampil.length ? "Batal pilih semua" : "Pilih semua"}
          </Button>
        ) : null}
        {tersembunyi ? (
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setLihatSembunyi((x) => !x)}>
            {lihatSembunyi ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {lihatSembunyi ? "Sembunyikan yang tersembunyi" : `Lihat yang disembunyikan (${tersembunyi})`}
          </Button>
        ) : null}
      </div>

      {tampil.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tampil.map((x, i) => {
            const aktif = pilih.includes(x.id);
            return (
              <li key={x.id} className={cn("group relative overflow-hidden rounded-xl border bg-muted", aktif && "ring-3 ring-primary", x.sembunyi && "opacity-50")}>
                <button type="button" className="block w-full" aria-pressed={aktif} aria-label={`Pilih foto ${i + 1}`} onClick={() => setPilih((p) => (aktif ? p.filter((y) => y !== x.id) : [...p, x.id]))}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- berkas R2, sudah dikecilkan */}
                  <img src={x.thumb} alt={x.keterangan ?? x.tujuan ?? judul} loading="lazy" className="aspect-square w-full object-cover" />
                </button>
                <span className={cn("pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full border-2 border-white shadow", aktif ? "bg-primary" : "bg-black/20")}>
                  {aktif ? <span className="text-xs font-bold text-white">✓</span> : null}
                </span>
                <button type="button" aria-label="Lihat besar" onClick={() => setBesar(i)} className="absolute top-2 right-2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60">
                  <Maximize2 className="size-3.5" />
                </button>
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
                  {x.utamaMenu ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[0.6875rem] font-medium">
                      <Star className="size-3 fill-current text-amber-500" /> Utama
                    </span>
                  ) : null}
                  {x.sajian ? <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[0.6875rem]">{SAJIAN[x.sajian as keyof typeof SAJIAN] ?? x.sajian}</span> : null}
                  {!tujuan && x.tujuan ? <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[0.6875rem]">{x.tujuan}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-[14px] border bg-card px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">
          {tujuan ? "Belum ada foto. Tekan Unggah foto." : "Kotak masuk kosong — semua foto sudah ditandai ✅"}
        </p>
      )}

      {pilih.length ? (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-2.5 shadow-lg backdrop-blur">
          <span className="px-2 text-sm font-medium">{pilih.length} dipilih</span>
          <Button type="button" size="sm" className="rounded-full" disabled={sibuk} onClick={() => bagikan(dipilih, "kirim")}>
            {sibuk ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Kirim ke WA
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={sibuk} onClick={() => bagikan(dipilih, "unduh")}>
            <Download className="size-3.5" />
            Unduh
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={menunggu} onClick={() => setTandai(true)}>
            <Tag className="size-3.5" />
            {tujuan ? "Pindah / sajian" : "Tandai ke menu"}
          </Button>
          {pilih.length === 1 && tujuan ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => jadikanUtama(pilih[0]), () => setPilih([]))}>
              <Star className="size-3.5" />
              Jadikan utama
            </Button>
          ) : null}
          {dipilih.every((x) => x.sembunyi) ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => sembunyikanFoto(pilih, false), () => setPilih([]))}>
              <Eye className="size-3.5" />
              Tampilkan
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => sembunyikanFoto(pilih, true), () => setPilih([]))}>
              <EyeOff className="size-3.5" />
              Sembunyikan
            </Button>
          )}
          {bolehHapus ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-full text-destructive" disabled={menunggu} onClick={() => setHapus(true)}>
              <Trash2 className="size-3.5" />
              Hapus
            </Button>
          ) : null}
          <Button type="button" size="icon-sm" variant="ghost" className="ml-auto rounded-full" aria-label="Batal pilih" onClick={() => setPilih([])}>
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      <DialogTandai
        buka={tandai}
        onBuka={setTandai}
        jumlah={pilih.length}
        opsiMenu={opsiMenu}
        opsiPaket={opsiPaket}
        sibuk={menunggu}
        onTandai={(t, s) => jalan(() => tandaiFoto(pilih, t, s), () => (setTandai(false), setPilih([])))}
      />

      <Dialog open={hapus} onOpenChange={setHapus}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus {pilih.length} foto?</DialogTitle>
            <DialogDescription>Foto dihapus permanen dari aplikasi dan penyimpanan. Kalau hanya ingin tidak tampil, pakai Sembunyikan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setHapus(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => hapusFoto(pilih), () => (setHapus(false), setPilih([])))}>
              Hapus permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={f !== null} onOpenChange={(o) => !o && setBesar(null)}>
        <DialogContent className="sm:max-w-3xl">
          {f ? (
            <>
              <DialogHeader>
                <DialogTitle>{f.tujuan ?? judul}</DialogTitle>
                <DialogDescription>{f.namaAsli ?? ""}</DialogDescription>
              </DialogHeader>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- berkas R2, sudah dikecilkan */}
                <img src={f.utama} alt={f.keterangan ?? f.tujuan ?? judul} className="max-h-[60dvh] w-full rounded-xl bg-muted object-contain" />
                {besar! > 0 ? (
                  <Button type="button" size="icon" variant="outline" className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-card/90" aria-label="Sebelumnya" onClick={() => setBesar(besar! - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                ) : null}
                {besar! < tampil.length - 1 ? (
                  <Button type="button" size="icon" variant="outline" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-card/90" aria-label="Berikutnya" onClick={() => setBesar(besar! + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                ) : null}
              </div>
              <PilihanChip kecil label="Bentuk sajian" nilai={f.sajian ?? ""} onPilih={(v) => jalan(() => aturFoto(f.id, { sajian: v || null }))} pilihan={[{ nilai: "", label: "Belum diisi" }, ...PILIHAN_SAJIAN]} />
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = new FormData(e.currentTarget).get("keterangan");
                  jalan(() => aturFoto(f.id, { keterangan: String(v ?? "") }));
                }}
              >
                <Input key={f.id} name="keterangan" defaultValue={f.keterangan ?? ""} placeholder="Keterangan, mis. versi box 2025" aria-label="Keterangan foto" className="flex-1" />
                <Button type="submit" variant="outline" className="rounded-full" disabled={menunggu}>
                  Simpan
                </Button>
              </form>
              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-full" disabled={sibuk} onClick={() => bagikan([f], "unduh")}>
                  <Download className="size-4" />
                  Unduh
                </Button>
                <Button type="button" className="rounded-full" disabled={sibuk} onClick={() => bagikan([f], "kirim")}>
                  {sibuk ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Kirim ke WA
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogTandai({
  buka,
  onBuka,
  jumlah,
  opsiMenu,
  opsiPaket,
  sibuk,
  onTandai,
}: {
  buka: boolean;
  onBuka: (b: boolean) => void;
  jumlah: number;
  opsiMenu: OpsiCari[];
  opsiPaket: OpsiCari[];
  sibuk: boolean;
  onTandai: (tujuan: { idMenu?: string | null; idPaket?: string | null }, sajian: string | null | undefined) => void;
}) {
  const [jenis, setJenis] = useState<"menu" | "paket" | "lepas">("menu");
  const [target, setTarget] = useState<OpsiCari | undefined>();
  const [sajian, setSajian] = useState("tetap");
  return (
    <Dialog open={buka} onOpenChange={onBuka}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tandai {jumlah} foto</DialogTitle>
          <DialogDescription>Foto menempel ke menu dapur — nama lain menu itu ikut menemukan fotonya.</DialogDescription>
        </DialogHeader>
        <PilihanChip
          label="Jenis tujuan"
          nilai={jenis}
          onPilih={(v) => {
            setJenis(v as typeof jenis);
            setTarget(undefined);
          }}
          pilihan={[
            { nilai: "menu", label: "Menu" },
            { nilai: "paket", label: "Paket" },
            { nilai: "lepas", label: "Lepas tanda" },
          ]}
        />
        {jenis !== "lepas" ? <PilihCari nilai={target} pilihan={jenis === "menu" ? opsiMenu : opsiPaket} onPilih={setTarget} placeholder={jenis === "menu" ? "Ketik nama menu…" : "Ketik kode / nama paket…"} /> : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Bentuk sajian</span>
          <PilihanChip kecil label="Bentuk sajian" nilai={sajian} onPilih={setSajian} pilihan={[{ nilai: "tetap", label: "Biarkan" }, ...PILIHAN_SAJIAN]} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onBuka(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={sibuk || (jenis !== "lepas" && !target)}
            onClick={() => onTandai(jenis === "menu" ? { idMenu: target?.id } : jenis === "paket" ? { idPaket: target?.id } : {}, sajian === "tetap" ? undefined : sajian)}
          >
            {sibuk ? <LoaderCircle className="size-4 animate-spin" /> : <Tag className="size-4" />}
            Tandai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
