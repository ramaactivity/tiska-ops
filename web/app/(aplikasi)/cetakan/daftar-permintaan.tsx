"use client";

import { Check, CircleHelp, PackageCheck, Send, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Permintaan } from "@/lib/cetakan";
import { STATUS_PERMINTAAN, type StatusPermintaan } from "@/lib/hitung/cetakan";
import { cn } from "@/lib/utils";

import { batalkanPermintaan, jawabPermintaan, putuskanPermintaan, tandaiDiambil } from "./actions";

const hari = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));
const waktu = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

const GAYA_STATUS: Record<string, string> = {
  diajukan: "bg-perhatian-halus text-perhatian",
  perlu_tanya: "bg-perhatian-halus text-perhatian",
  disetujui: "bg-primary/10 text-primary",
  dipesan: "bg-primary/10 text-primary",
  menunggu_bayar: "bg-primary/10 text-primary",
  dibayar: "bg-primary/10 text-primary",
  diambil: "bg-lunas-halus text-lunas",
  ditolak: "bg-muted text-muted-foreground",
  batal: "bg-muted text-muted-foreground",
};

/** Tab Permintaan (D-183): yang menunggu di atas, lalu yang sedang jalan, lalu riwayat. */
export function DaftarPermintaan({
  permintaan,
  bolehUbah,
  idSaya,
  onMasukkan,
}: {
  permintaan: Permintaan[];
  bolehUbah: boolean;
  idSaya: string;
  onMasukkan: (baris: Permintaan["baris"]) => void;
}) {
  const urutan = (s: string) => ["diajukan", "perlu_tanya", "disetujui", "dipesan", "menunggu_bayar", "dibayar"].indexOf(s);
  const urut = [...permintaan].sort((a, b) => {
    const ua = urutan(a.status);
    const ub = urutan(b.status);
    if ((ua < 0) !== (ub < 0)) return ua < 0 ? 1 : -1;
    return ua >= 0 && ua !== ub ? ua - ub : b.dibuat.localeCompare(a.dibuat);
  });
  if (!urut.length)
    return (
      <p className="kartu px-5 py-10 text-center text-muted-foreground">
        {bolehUbah ? "Belum ada permintaan cetak." : "Belum ada permintaan. Buka Katalog, pilih cetakan & jumlah lembarnya, lalu tekan Minta cetak."}
      </p>
    );
  return (
    <ul className="flex flex-col gap-4">
      {urut.map((p) => (
        <li key={p.id} id={`p${p.id}`}>
          <KartuPermintaan p={p} bolehUbah={bolehUbah} milikSaya={p.peminta.id === idSaya} onMasukkan={onMasukkan} />
        </li>
      ))}
    </ul>
  );
}

function KartuPermintaan({ p, bolehUbah, milikSaya, onMasukkan }: { p: Permintaan; bolehUbah: boolean; milikSaya: boolean; onMasukkan: (b: Permintaan["baris"]) => void }) {
  const [tulis, setTulis] = useState<"perlu_tanya" | "tolak" | "jawab" | null>(null);
  const [teks, setTeks] = useState("");
  const [sedang, mulai] = useTransition();
  const total = p.baris.reduce((s, b) => s + b.lembar, 0);
  const terbuka = p.status === "diajukan" || p.status === "perlu_tanya";
  const berjalan = ["disetujui", "dipesan", "menunggu_bayar", "dibayar"].includes(p.status);

  const jalankan = (aksi: () => Promise<{ ok: boolean; pesan: string }>, sesudah?: () => void) =>
    mulai(async () => {
      const h = await aksi();
      if (h.ok) {
        toast.success(h.pesan);
        setTulis(null);
        setTeks("");
        sesudah?.();
      } else toast.error(h.pesan);
    });

  return (
    <article className={cn("kartu overflow-hidden", terbuka && bolehUbah && "ring-1 ring-perhatian-garis")}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-5 py-4">
        <div>
          <p className="font-semibold">
            {milikSaya ? "Permintaan Anda" : p.peminta.nama} · untuk {hari(p.tanggal)}
          </p>
          <p className="text-sm text-muted-foreground">
            Diajukan {waktu.format(new Date(p.dibuat))} · {total} lembar A3
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", GAYA_STATUS[p.status])}>{STATUS_PERMINTAAN[p.status as StatusPermintaan] ?? p.status}</span>
      </header>

      <ul className="grid gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-2">
        {p.baris.map((b, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted/60">
              {b.gambar ? (
                // eslint-disable-next-line @next/next/no-img-element -- gambar R2 publik kecil
                <img src={b.gambar} alt="" className="absolute inset-1 m-auto max-h-[calc(100%-0.5rem)] max-w-[calc(100%-0.5rem)] object-contain" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium">{b.varian ?? b.nama}</span>
              {b.varian ? <span className="block text-xs text-muted-foreground">{b.nama}</span> : null}
            </span>
            <span className="text-sm font-semibold tabular-nums">{b.lembar} lbr</span>
          </li>
        ))}
      </ul>

      {p.catatan || p.balasan ? (
        <div className="flex flex-col gap-2 px-5 pb-4 text-sm">
          {p.catatan ? <p className="rounded-xl bg-muted/60 px-3 py-2 whitespace-pre-wrap">{p.catatan}</p> : null}
          {p.balasan ? (
            <p className="rounded-xl bg-perhatian-halus px-3 py-2 text-perhatian">
              <b className="font-semibold">{p.pemutus ?? "Pemegang cetakan"}:</b> {p.balasan}
            </p>
          ) : null}
        </div>
      ) : null}

      {tulis ? (
        <div className="flex flex-col gap-2 border-t px-5 py-4">
          <Textarea
            autoFocus
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={2}
            placeholder={{ perlu_tanya: "mis. Yang ukuran kecil atau besar?", tolak: "mis. Stok masih cukup sampai minggu depan", jawab: "Tulis jawaban Anda" }[tulis]}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setTulis(null)}>
              Batal
            </Button>
            <Button
              className="rounded-full px-5"
              disabled={sedang}
              onClick={() => jalankan(() => (tulis === "jawab" ? jawabPermintaan(p.id, teks) : putuskanPermintaan(p.id, tulis, teks)))}
            >
              <Send className="size-4" /> Kirim
            </Button>
          </div>
        </div>
      ) : (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-5 py-3">
          {bolehUbah && terbuka ? (
            <>
              <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setTulis("tolak")}>
                <X className="size-4" /> Tolak
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setTulis("perlu_tanya")}>
                <CircleHelp className="size-4" /> Perlu tanya
              </Button>
              <Button className="rounded-full px-5" disabled={sedang} onClick={() => jalankan(() => putuskanPermintaan(p.id, "setujui", ""), () => onMasukkan(p.baris))}>
                <Check className="size-4" /> Setujui & susun pesan
              </Button>
            </>
          ) : null}
          {bolehUbah && berjalan ? (
            <>
              <Button variant="outline" className="rounded-full" onClick={() => onMasukkan(p.baris)}>
                Susun pesan lagi
              </Button>
              <Button className="rounded-full px-5" disabled={sedang} onClick={() => jalankan(() => tandaiDiambil(p.id))}>
                <PackageCheck className="size-4" /> Sudah diambil
              </Button>
            </>
          ) : null}
          {!bolehUbah && milikSaya && p.status === "perlu_tanya" ? (
            <Button className="rounded-full px-5" onClick={() => setTulis("jawab")}>
              Jawab
            </Button>
          ) : null}
          {milikSaya && terbuka ? (
            <Button variant="ghost" className="rounded-full text-muted-foreground" disabled={sedang} onClick={() => jalankan(() => batalkanPermintaan(p.id))}>
              Batalkan
            </Button>
          ) : null}
          {!terbuka && !berjalan ? <span className="text-xs text-muted-foreground">Selesai</span> : null}
          {berjalan && !bolehUbah ? <span className="text-xs text-muted-foreground">Sedang dipesankan ke percetakan</span> : null}
        </footer>
      )}
    </article>
  );
}
