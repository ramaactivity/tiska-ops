"use client";

import { ClipboardList, ExternalLink, File, FileText, FolderOpen, Link2, LoaderCircle, Palette, Pencil, Plus, Presentation, Sheet, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type OpsiCari, PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AsetTampil } from "@/lib/aset";
import { jenisTautan, type JenisTautan, KATEGORI_ASET, type KategoriAset, rapikanTautan } from "@/lib/hitung/aset";
import { cn } from "@/lib/utils";

import { hapusAset, sematkanAset, simpanAset } from "./actions";

const IKON: Record<JenisTautan, { ikon: typeof File; warna: string }> = {
  folder: { ikon: FolderOpen, warna: "bg-amber-50 text-amber-700" },
  drive: { ikon: File, warna: "bg-sky-50 text-sky-700" },
  docs: { ikon: FileText, warna: "bg-blue-50 text-blue-700" },
  sheets: { ikon: Sheet, warna: "bg-emerald-50 text-emerald-700" },
  slides: { ikon: Presentation, warna: "bg-orange-50 text-orange-700" },
  form: { ikon: ClipboardList, warna: "bg-violet-50 text-violet-700" },
  canva: { ikon: Palette, warna: "bg-cyan-50 text-cyan-700" },
  lain: { ikon: Link2, warna: "bg-muted text-muted-foreground" },
};
const PILIHAN_KATEGORI = Object.entries(KATEGORI_ASET).map(([nilai, label]) => ({ nilai, label }));

/**
 * Daftar tautan (D-127): ketuk kartu = buka di tab baru (Drive/Canva terbuka di aplikasinya di HP).
 * `idEvent` = bagian dokumentasi di halaman Event: tautan baru otomatis menempel ke acara itu.
 */
export function DaftarAset({
  aset,
  bolehUbah,
  opsiAcara = [],
  idEvent,
  kosong,
}: {
  aset: AsetTampil[];
  bolehUbah: boolean;
  opsiAcara?: OpsiCari[];
  idEvent?: string;
  kosong: string;
}) {
  const router = useRouter();
  const [menunggu, mulai] = useTransition();
  const [form, setForm] = useState<AsetTampil | "baru" | null>(null);
  const [hapus, setHapus] = useState<AsetTampil | null>(null);
  const jalan = (kerja: () => Promise<{ ok: boolean; pesan: string }>, sesudah?: () => void) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      sesudah?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {bolehUbah ? (
        <div>
          <Button type="button" className="rounded-full" onClick={() => setForm("baru")}>
            <Plus className="size-4" />
            {idEvent ? "Tambah link dokumentasi" : "Tambah tautan"}
          </Button>
        </div>
      ) : null}
      {aset.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {aset.map((a) => {
            const { ikon: Ikon, warna } = IKON[a.jenis.jenis];
            return (
              <li key={a.id} className="flex min-w-0 flex-col rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <a href={a.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 gap-3 rounded-t-2xl p-4 transition-colors hover:bg-accent/50">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", warna)}>
                    <Ikon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-start gap-1.5 text-[0.9375rem] leading-snug font-medium">
                      {a.sematkan ? <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Penting" /> : null}
                      <span className="line-clamp-2">{a.judul}</span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {a.jenis.label} · {KATEGORI_ASET[a.kategori as KategoriAset] ?? a.kategori}
                    </span>
                    {a.acara && !idEvent ? <span className="truncate text-xs text-muted-foreground">{a.acara.nama}</span> : null}
                    {a.catatan ? <span className="line-clamp-2 pt-1 text-sm text-muted-foreground">{a.catatan}</span> : null}
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </a>
                {bolehUbah ? (
                  <div className="flex items-center gap-1 border-t px-2 py-1.5">
                    <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => sematkanAset(a.id, !a.sematkan))}>
                      <Star className={cn("size-3.5", a.sematkan && "fill-amber-400 text-amber-500")} />
                      {a.sematkan ? "Penting" : "Tandai penting"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setForm(a)}>
                      <Pencil className="size-3.5" />
                      Ubah
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" className="ml-auto rounded-full text-muted-foreground" aria-label={`Hapus ${a.judul}`} onClick={() => setHapus(a)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="kartu px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">{kosong}</p>
      )}

      {form ? (
        <FormAset
          awal={form === "baru" ? null : form}
          idEvent={idEvent}
          opsiAcara={opsiAcara}
          sibuk={menunggu}
          onTutup={() => setForm(null)}
          onSimpan={(isi) => jalan(() => simpanAset(isi), () => setForm(null))}
        />
      ) : null}

      <Dialog open={hapus !== null} onOpenChange={(b) => !b && setHapus(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus tautan ini?</DialogTitle>
            <DialogDescription>&quot;{hapus?.judul}&quot; hilang dari Tiska Ops. Berkas aslinya di Google Drive / Canva tidak ikut terhapus.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setHapus(null)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" className="rounded-full" disabled={menunggu} onClick={() => hapus && jalan(() => hapusAset(hapus.id), () => setHapus(null))}>
              Hapus tautan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormAset({
  awal,
  idEvent,
  opsiAcara,
  sibuk,
  onTutup,
  onSimpan,
}: {
  awal: AsetTampil | null;
  idEvent?: string;
  opsiAcara: OpsiCari[];
  sibuk: boolean;
  onTutup: () => void;
  onSimpan: (isi: Parameters<typeof simpanAset>[0]) => void;
}) {
  const [tautan, setTautan] = useState(awal?.url ?? "");
  const [judul, setJudul] = useState(awal?.judul ?? (idEvent ? "Dokumentasi" : ""));
  const [kategori, setKategori] = useState<string>(awal?.kategori ?? (idEvent ? "dokumentasi" : "dokumen"));
  const [catatan, setCatatan] = useState(awal?.catatan ?? "");
  const [acara, setAcara] = useState<OpsiCari | undefined>(awal?.acara ? { id: awal.acara.id, label: awal.acara.nama } : undefined);
  const [sematkan, setSematkan] = useState(awal?.sematkan ?? false);
  const rapi = rapikanTautan(tautan);

  return (
    <Dialog open onOpenChange={(b) => !b && onTutup()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{awal ? "Ubah tautan" : idEvent ? "Link dokumentasi acara" : "Tautan baru"}</DialogTitle>
          <DialogDescription>Salin link dari tombol Bagikan / Share di Google Drive atau Canva, lalu tempel di sini.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Link
            <Input value={tautan} onChange={(e) => setTautan(e.target.value)} placeholder="https://drive.google.com/…" inputMode="url" autoFocus={!awal} />
            {tautan.trim() ? (
              <span className={cn("text-xs font-normal", rapi ? "text-muted-foreground" : "text-destructive")}>{rapi ? `Terbaca: ${jenisTautan(rapi).label}` : "Belum terbaca sebagai link."}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Judul
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={150} placeholder="mis. Pricelist Prasmanan 2026" />
          </label>
          {idEvent ? null : (
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Kategori
              <PilihanChip pilihan={PILIHAN_KATEGORI} nilai={kategori} onPilih={setKategori} label="Kategori" kecil />
            </div>
          )}
          {!idEvent && kategori === "dokumentasi" ? (
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Acara (opsional)
              <PilihCari nilai={acara} pilihan={opsiAcara} onPilih={setAcara} placeholder="Ketik nama customer…" />
            </div>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Catatan (opsional)
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} placeholder="mis. versi terbaru Okt 2026, ukuran A5" />
          </label>
          <PilihanChip
            pilihan={[
              { nilai: "biasa", label: "Biasa" },
              { nilai: "penting", label: "★ Penting (tampil paling atas)" },
            ]}
            nilai={sematkan ? "penting" : "biasa"}
            onPilih={(n) => setSematkan(n === "penting")}
            label="Tanda penting"
            kecil
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" className="rounded-full" onClick={onTutup}>
            Batal
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={sibuk || !rapi || !judul.trim()}
            onClick={() =>
              onSimpan({
                id: awal?.id ?? null,
                judul,
                tautan,
                kategori: kategori as KategoriAset,
                catatan,
                idEvent: idEvent ?? (kategori === "dokumentasi" ? (acara?.id ?? null) : null),
                sematkan,
              })
            }
          >
            {sibuk ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
