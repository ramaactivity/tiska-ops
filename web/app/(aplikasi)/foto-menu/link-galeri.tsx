"use client";

import { Check, Copy, Link2, LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { aturKeranjang, bacaKeranjang, type FotoKeranjang, KUNCI_KERANJANG } from "@/lib/foto-klien";

import { buatLinkGaleri } from "./actions";

/** Tombol "Link galeri (N)" di kepala halaman Foto Menu — muncul bila keranjang berisi (D-126). */
export function TombolKeranjang() {
  const [isi, setIsi] = useState<FotoKeranjang[]>([]);
  const [buka, setBuka] = useState(false);
  useEffect(() => {
    const segar = () => setIsi(bacaKeranjang());
    segar();
    window.addEventListener(KUNCI_KERANJANG, segar);
    window.addEventListener("storage", segar);
    return () => {
      window.removeEventListener(KUNCI_KERANJANG, segar);
      window.removeEventListener("storage", segar);
    };
  }, []);
  // Tetap terpasang selama dialog terbuka: keranjang dikosongkan begitu link dibuat, linknya masih harus tampil.
  if (!isi.length && !buka) return null;
  return (
    <>
      <Button type="button" className="rounded-full" onClick={() => setBuka(true)}>
        <Link2 className="size-4" />
        Link galeri{isi.length ? ` (${isi.length})` : ""}
      </Button>
      <DialogLinkGaleri buka={buka} onBuka={setBuka} foto={isi} onUbah={aturKeranjang} onDibuat={() => aturKeranjang([])} />
    </>
  );
}

/**
 * Buat link galeri untuk klien dari foto pilihan. `onUbah` ada = foto boleh dikeluarkan (keranjang).
 * Setelah dibuat: Salin link / Kirim ke WA (admin yang menekan kirim — tidak ada yang terkirim otomatis).
 */
export function DialogLinkGaleri({
  buka,
  onBuka,
  foto,
  onUbah,
  onDibuat,
}: {
  buka: boolean;
  onBuka: (b: boolean) => void;
  foto: FotoKeranjang[];
  onUbah?: (isi: FotoKeranjang[]) => void;
  onDibuat?: () => void;
}) {
  const [untuk, setUntuk] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const tutup = (b: boolean) => {
    onBuka(b);
    if (!b) {
      setLink(null);
      setUntuk("");
    }
  };
  const salin = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      toast.success("Link disalin. Tempel di chat klien.");
    } catch {
      toast.error("Gagal menyalin — tekan lama linknya lalu salin.");
    }
  };

  return (
    <Dialog open={buka} onOpenChange={tutup}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{link ? "Link galeri siap" : `Link galeri · ${foto.length} foto`}</DialogTitle>
          <DialogDescription>
            {link ? "Kirim link ini ke klien. Berlaku 30 hari, tanpa harga, bisa dimatikan di Foto Menu → Link galeri." : "Klien membuka foto-foto ini lewat satu link (tanpa login, tanpa harga) dan bisa mengunduhnya."}
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-xl border bg-muted px-3 py-2.5 text-sm break-all select-all">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full" onClick={() => salin(link)}>
                <Copy className="size-4" />
                Salin link
              </Button>
              <Button variant="outline" className="rounded-full" render={<a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer" />}>
                <Send className="size-4" />
                Kirim ke WA
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
              {foto.map((f) => (
                <li key={f.id} className="relative overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail R2 */}
                  <img src={f.thumb} alt={f.tujuan ?? "Foto menu"} loading="lazy" className="aspect-square w-full object-cover" />
                  {onUbah ? (
                    <button type="button" aria-label="Keluarkan foto" onClick={() => onUbah(foto.filter((x) => x.id !== f.id))} className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70">
                      <X className="size-3" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Untuk (nama klien, boleh kosong)
              <Input value={untuk} onChange={(e) => setUntuk(e.target.value)} maxLength={120} placeholder="mis. Kak Dina — nikahan 12 Des" />
            </label>
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => tutup(false)}>
              <Check className="size-4" />
              Selesai
            </Button>
          ) : (
            <>
              {onUbah ? (
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => (onUbah([]), tutup(false))}>
                  Kosongkan
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-full"
                disabled={menunggu || !foto.length}
                onClick={() =>
                  mulai(async () => {
                    const r = await buatLinkGaleri(
                      foto.map((f) => f.id),
                      untuk,
                    );
                    if (!r.ok) return void toast.error(r.pesan);
                    setLink(`${location.origin}/galeri/${r.token}`);
                    onDibuat?.();
                  })
                }
              >
                {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                Buat link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
