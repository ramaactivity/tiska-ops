"use client";

import { Bell, BellOff, Check, Download, FileUp, LoaderCircle, Receipt, Stamp, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { mintaUnggahBuktiBayar, simpanKwitansiMeterai, tandaiMeterai } from "../actions";

const CARA = [
  { nilai: "digital", label: "e-Meterai (dikirim PDF)" },
  { nilai: "fisik", label: "Meterai tempel (dicetak, dikirim asli)" },
];

/**
 * Meterai kwitansi (D-130): e-meterai dibubuhkan di portal distributor resmi lalu PDF-nya diunggah balik, ATAU kwitansi
 * dicetak, ditempel meterai fisik, dan aslinya dikirim. Langkahnya ditulis lengkap di layar — jarang dipakai, mudah lupa.
 */
export function KwitansiMeterai({
  id,
  perlu,
  batas,
  jumlah,
  cara,
  tanggal,
}: {
  id: string;
  perlu: boolean;
  batas: string;
  jumlah: string;
  /** "digital" | "fisik" | "tidak" | null (belum). */
  cara: string | null;
  /** Kapan PDF diunggah / meterai fisik ditandai. */
  tanggal: string | null;
}) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);
  const [pilih, setPilih] = useState("digital");
  const [mengunggah, setMengunggah] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [menunggu, mulai] = useTransition();
  const jalan = (kerja: () => Promise<{ ok: boolean; pesan: string }>) =>
    mulai(async () => {
      const r = await kerja();
      if (!r.ok) return void toast.error(r.pesan);
      toast.success(r.pesan);
      setHapus(false);
      router.refresh();
    });

  async function unggah(berkas: File) {
    if (berkas.type !== "application/pdf") return toast.error("Pilih berkas PDF hasil e-meterai (bukan foto / screenshot).");
    if (berkas.size > 10 * 1024 * 1024) return toast.error("PDF lebih dari 10 MB.");
    setMengunggah(true);
    try {
      const t = await mintaUnggahBuktiBayar("application/pdf");
      const r = await fetch(t.url, { method: "PUT", headers: { "content-type": "application/pdf" }, body: berkas });
      if (!r.ok) throw new Error(`Unggah gagal (${r.status}). Coba lagi.`);
      jalan(() => simpanKwitansiMeterai(id, t.jalur));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unggah gagal.");
    } finally {
      setMengunggah(false);
      if (masukan.current) masukan.current.value = "";
    }
  }

  const tombolUnggah = (label: string, varian: "default" | "outline" = "default") => (
    <Button type="button" variant={varian} className="rounded-full" disabled={mengunggah || menunggu} onClick={() => masukan.current?.click()}>
      {mengunggah ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
      {mengunggah ? "Mengunggah…" : label}
    </Button>
  );
  const bukaKwitansi = (
    <Button variant="outline" className="rounded-full bg-card" render={<a href={`/pembayaran/${id}/kwitansi`} target="_blank" rel="noopener" />}>
      <Receipt className="size-4" />
      Buka kwitansi
    </Button>
  );
  const ingatkan = perlu && !cara;
  const selesai = cara === "digital" || cara === "fisik";

  return (
    <section className={cn("mb-6 flex flex-col gap-3 rounded-[14px] border p-5", selesai ? "border-lunas-garis bg-lunas-halus" : ingatkan ? "border-perhatian-garis bg-perhatian-halus" : "bg-card")}>
      <input ref={masukan} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && unggah(e.target.files[0])} />
      <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
        <Stamp className="size-4" />
        Meterai kwitansi
      </h2>

      {cara === "digital" ? (
        <>
          <p className="text-[0.9375rem]">
            ✅ e-Meterai sudah dibubuhkan, PDF diunggah {tanggal}. <b>Kirim PDF ini ke klien</b> — bukan kwitansi biasa dari tombol Kwitansi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full" render={<a href={`/pembayaran/${id}/kwitansi-meterai`} target="_blank" rel="noopener noreferrer" />}>
              <Download className="size-4" />
              Unduh kwitansi ber-e-meterai
            </Button>
            {tombolUnggah("Ganti PDF", "outline")}
            <Button type="button" variant="ghost" className="rounded-full text-destructive" onClick={() => setHapus(true)}>
              <Trash2 className="size-4" />
              Lepas PDF
            </Button>
          </div>
        </>
      ) : cara === "fisik" ? (
        <>
          <p className="text-[0.9375rem]">✅ Meterai tempel sudah dipasang & kwitansi asli dikirim ke klien (ditandai {tanggal}).</p>
          <div>
            <Button type="button" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => tandaiMeterai(id, null))}>
              <Undo2 className="size-4" />
              Batalkan tanda
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[0.9375rem]">
            {ingatkan ? (
              <>
                ⚠️ Kwitansi ini <b>{jumlah}</b> — di atas {batas}, jadi <b>wajib meterai</b> dan <b>belum diberi meterai</b>. Finance diingatkan tiap pagi sampai salah satu langkah di bawah selesai.
              </>
            ) : cara === "tidak" ? (
              "Ditandai tidak perlu meterai — tidak diingatkan lagi."
            ) : (
              `Nilainya di bawah ${batas}, tidak wajib meterai. Kalau klien tetap minta, pilih caranya di bawah.`
            )}
          </p>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Cara memberi meterai
            <PilihanChip pilihan={CARA} nilai={pilih} onPilih={setPilih} label="Cara memberi meterai" kecil />
          </div>
          {pilih === "digital" ? (
            <>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[0.9375rem]">
                <li>
                  Tekan <b>Buka kwitansi</b> → <b>Cetak</b> → pada Tujuan/Printer pilih <b>Save as PDF</b> (Simpan sebagai PDF) → simpan ke laptop.
                </li>
                <li>
                  Buka situs <b>e-meterai resmi</b> tempat Tiska membeli e-meterai (portal Peruri <span className="font-mono">e-meterai.co.id</span> atau distributor resmi lain) → unggah PDF tadi → taruh e-meterai tepat di <b>kotak &quot;Materai&quot;</b> di sebelah tanda tangan → bubuhkan → <b>unduh PDF hasilnya</b>.
                </li>
                <li>
                  Kembali ke halaman ini → <b>Unggah PDF ber-e-meterai</b>. Selesai — kirim PDF itu ke klien.
                </li>
              </ol>
              <p className="text-sm text-muted-foreground">Jangan cetak ulang, edit, atau screenshot PDF hasil e-meterai — e-meterainya jadi tidak sah. Unggah dan kirim berkas aslinya.</p>
              <div className="flex flex-wrap gap-2">
                {bukaKwitansi}
                {tombolUnggah("Unggah PDF ber-e-meterai")}
              </div>
            </>
          ) : (
            <>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[0.9375rem]">
                <li>
                  Tekan <b>Buka kwitansi</b> → <b>Cetak</b> ke printer.
                </li>
                <li>
                  Tempel <b>meterai Rp 10.000</b> di <b>kotak &quot;Materai&quot;</b>, lalu penandatangan menandatangani <b>sebagian di atas meterai</b> (sebagian tanda tangan mengenai meterai) dan beri cap perusahaan bila ada.
                </li>
                <li>
                  Kirim <b>kwitansi aslinya</b> ke klien → tekan <b>Sudah ditempel &amp; dikirim</b>. Kalau perlu, foto kwitansinya dulu untuk arsip.
                </li>
              </ol>
              <div className="flex flex-wrap gap-2">
                {bukaKwitansi}
                <Button type="button" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => tandaiMeterai(id, "fisik"))}>
                  <Check className="size-4" />
                  Sudah ditempel &amp; dikirim
                </Button>
              </div>
            </>
          )}
          {perlu ? (
            <div>
              <Button type="button" variant="ghost" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => tandaiMeterai(id, cara === "tidak" ? null : "tidak"))}>
                {cara === "tidak" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                {cara === "tidak" ? "Ingatkan lagi" : "Tidak perlu meterai (klien tidak minta kwitansi)"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={hapus} onOpenChange={setHapus}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lepas PDF ber-e-meterai?</DialogTitle>
            <DialogDescription>PDF-nya dilepas dari payment ini dan pengingat aktif lagi. Simpan dulu salinannya kalau masih dibutuhkan — e-meterai yang sudah dibubuhkan tidak bisa dipakai ulang.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setHapus(false)}>
              Batal
            </Button>
            <Button variant="destructive" className="rounded-full" disabled={menunggu} onClick={() => jalan(() => simpanKwitansiMeterai(id, null))}>
              Lepas PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
