"use client";

import { AppWindow, FileText, GripVertical, Globe, LoaderCircle, Send, Share2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* ==========================================================================
   KIRIM KE WHATSAPP (D-203, D-206)

   HP: lembar bagikan bawaan langsung (WhatsApp ada di sana).

   Laptop (Rama: "beda laptop, beda orang beda WhatsApp-nya — kadang aplikasi,
   kadang tab browser"): sekali ditanya, diingat per laptop.
     Aplikasi WhatsApp → lembar bagikan Windows/Mac (WhatsApp desktop terdaftar
                         di sana); browser tanpa lembar bagikan: berkas diunduh
                         lalu aplikasinya dibuka (whatsapp://).
     WhatsApp Web      → tab WhatsApp dibuka; berkas diseret dari kartu di sini
                         (atau dari ikon unduhan browser) ke chat. Website TIDAK
                         bisa membuka folder atau menyalin berkas PDF ke clipboard
                         — aturan semua browser — jadi menyeret itulah jalannya.
   Yang terkirim hanya berkasnya, tanpa teks/tautan.
   ========================================================================== */

type Cara = "aplikasi" | "web";
const KUNCI = "cara-wa";
const diam = () => () => {};

function bacaCara(): Cara | null {
  try {
    const v = localStorage.getItem(KUNCI);
    return v === "aplikasi" || v === "web" ? v : null;
  } catch {
    return null;
  }
}

function unduh(berkas: File) {
  const url = URL.createObjectURL(berkas);
  const a = document.createElement("a");
  a.href = url;
  a.download = berkas.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const ukuran = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

export function KirimWa({ label, siapkan }: { label: string; siapkan: () => Promise<File> }) {
  const laptop = useSyncExternalStore(diam, () => matchMedia("(pointer: fine)").matches, () => false);
  const [buka, setBuka] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [sedang, setSedang] = useState(false);
  const [cara, setCara] = useState<Cara | null>(null);
  const [petunjuk, setPetunjuk] = useState<Cara | null>(null);
  // HP: PDF dibuat >5 dtk sesudah klik → izin lembar bagikan habis; berkas disimpan, satu klik lagi mengirim.
  const [siapKirim, setSiapKirim] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!berkas) return;
    const u = URL.createObjectURL(berkas);
    // Alamat berkas untuk kartu seret (sistem luar: URL objek browser).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [berkas]);

  /** Selalu menurut pilihan halaman saat ini (ukuran tulisan bisa berganti); PDF pratinjau tersimpan, jadi cepat. */
  async function ambil(): Promise<File | null> {
    setSedang(true);
    try {
      const b = await siapkan();
      setBerkas(b);
      return b;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Berkas gagal dibuat. Coba lagi.");
      return null;
    } finally {
      setSedang(false);
    }
  }

  async function bagikan(b: File): Promise<boolean> {
    if (!navigator.canShare?.({ files: [b] })) return false;
    try {
      await navigator.share({ files: [b] });
      setSiapKirim(null);
    } catch (e) {
      const n = (e as Error).name;
      if (n === "NotAllowedError") setSiapKirim(b);
      else if (n !== "AbortError") toast.error("Gagal membuka menu bagikan. Pakai Unduh lalu lampirkan manual.");
    }
    return true;
  }

  async function klikHp() {
    const b = siapKirim ?? (await ambil());
    if (!b) return;
    if (!(await bagikan(b))) {
      unduh(b);
      toast.success(`${b.name} tersimpan di Unduhan — lampirkan di chat WhatsApp.`);
    }
  }

  async function kirimLaptop(c: Cara) {
    try {
      localStorage.setItem(KUNCI, c);
    } catch {
      // Tidak diingat bukan alasan untuk gagal.
    }
    setCara(c);
    const b = berkas;
    if (!b) return;
    if (c === "aplikasi") {
      if (await bagikan(b)) return setBuka(false);
      unduh(b);
      const a = document.createElement("a");
      a.href = "whatsapp://send";
      a.click();
    } else {
      window.open("https://web.whatsapp.com/", "whatsapp-web");
      unduh(b);
    }
    setPetunjuk(c);
  }

  const tombolUtama = (
    <>
      {sedang && !buka ? <LoaderCircle className="size-4 animate-spin" /> : siapKirim ? <Send className="size-4" /> : <Share2 className="size-4" />}
      {sedang && !buka ? "Menyiapkan…" : siapKirim ? "Kirim sekarang" : label}
    </>
  );

  if (!laptop)
    return (
      <Button size="sm" variant={siapKirim ? "default" : "outline"} disabled={sedang} onClick={klikHp}>
        {tombolUtama}
      </Button>
    );

  return (
    <Popover
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (v) {
          setCara(bacaCara());
          setPetunjuk(null);
          setBerkas(null);
          void ambil();
        }
      }}
    >
      <PopoverTrigger render={<Button size="sm" variant="outline" />}>{tombolUtama}</PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] gap-3 p-4">
        <p className="text-sm font-semibold">Kirim ke WhatsApp</p>
        {berkas ? (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              try {
                e.dataTransfer.items.add(berkas);
              } catch {
                // Sebagian browser tidak mengizinkan; DownloadURL di bawah tetap jalan di Chrome.
              }
              if (url) e.dataTransfer.setData("DownloadURL", `${berkas.type}:${berkas.name}:${url}`);
            }}
            className="flex cursor-grab items-center gap-3 rounded-[12px] border bg-muted/50 p-3 active:cursor-grabbing"
            title="Seret ke chat WhatsApp"
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground" />
            <FileText className="size-8 shrink-0 text-destructive" strokeWidth={1.5} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{berkas.name}</span>
              <span className="block text-xs text-muted-foreground">{ukuran(berkas.size)} · bisa diseret ke chat</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[12px] border bg-muted/50 p-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Menyiapkan berkas…
          </div>
        )}
        <p className="text-[13px] text-muted-foreground">WhatsApp di laptop ini dibuka lewat:</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["aplikasi", "Aplikasi", AppWindow],
              ["web", "WhatsApp Web", Globe],
            ] as const
          ).map(([c, judul, Ikon]) => (
            <button
              key={c}
              type="button"
              disabled={!berkas}
              onClick={() => kirimLaptop(c)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors disabled:opacity-50",
                cara === c ? "border-primary bg-primary/[0.06] shadow-[inset_0_0_0_1px_var(--primary)]" : "hover:border-primary/40 hover:bg-accent",
              )}
            >
              <Ikon className={cn("size-5", cara === c ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
              <span className="text-sm font-medium">{judul}</span>
              <span className="text-xs text-muted-foreground">{c === "aplikasi" ? "terpasang di laptop" : "di tab browser"}</span>
            </button>
          ))}
        </div>
        {petunjuk ? (
          <p className="rounded-[10px] bg-info-halus px-3 py-2 text-[13px] leading-snug">
            {petunjuk === "aplikasi"
              ? "Berkas tersimpan di Unduhan. Di WhatsApp: buka chatnya → klik ikon klip (Lampirkan) → Dokumen → pilih berkas ini, atau seret kartu di atas ke chat."
              : "Tab WhatsApp Web dibuka. Seret kartu di atas ke chat yang dituju (tahan, geser ke tab WhatsApp, lepas di chat) — atau seret dari ikon unduhan di pojok kanan atas browser."}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Pilihan diingat di laptop ini. Yang terkirim hanya berkasnya.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
