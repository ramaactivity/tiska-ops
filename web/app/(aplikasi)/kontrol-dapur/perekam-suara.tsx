"use client";

import { Mic, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DURASI_SUARA_MAKS_MS } from "@/lib/kontrol-dapur";

type Rekaman = {
  mr: MediaRecorder;
  potong: Blob[];
  mulai: number;
  batal: boolean;
};

const menitDetik = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Pesan suara ke dapur (permintaan atasan: "dari HP/laptop ngomong, suaranya keluar di speaker dapur").
 * Rekam dengan MediaRecorder → unggah ke /kontrol-dapur/suara → TV memutarnya sesudah ding-dong pada sinyal
 * berikutnya (≤6 dtk). Sambungan langsung tanpa jeda (WebRTC) menyusul.
 */
export function PerekamSuara({ onTerkirim }: { onTerkirim: () => void }) {
  const [status, setStatus] = useState<"siap" | "merekam" | "mengirim">("siap");
  const [detik, setDetik] = useState(0);
  const rekam = useRef<Rekaman | null>(null);

  useEffect(() => {
    if (status !== "merekam") return;
    const t = setInterval(() => {
      const r = rekam.current;
      if (!r) return;
      const lama = Date.now() - r.mulai;
      setDetik(Math.floor(lama / 1000));
      // Batas 1 menit: berhenti & terkirim sendiri.
      if (lama >= DURASI_SUARA_MAKS_MS && r.mr.state === "recording")
        r.mr.stop();
    }, 250);
    return () => clearInterval(t);
  }, [status]);

  const mulai = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(
        "Browser ini belum bisa merekam suara. Pakai Chrome atau Safari terbaru.",
      );
      return;
    }
    try {
      const aliran = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const jenis =
        ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((j) =>
          MediaRecorder.isTypeSupported(j),
        ) ?? "";
      const mr = new MediaRecorder(
        aliran,
        jenis ? { mimeType: jenis, audioBitsPerSecond: 32_000 } : undefined,
      );
      const r: Rekaman = { mr, potong: [], mulai: Date.now(), batal: false };
      mr.ondataavailable = (e) => {
        if (e.data.size) r.potong.push(e.data);
      };
      mr.onstop = async () => {
        aliran.getTracks().forEach((t) => t.stop());
        rekam.current = null;
        if (r.batal) {
          setStatus("siap");
          return;
        }
        const ms = Math.min(DURASI_SUARA_MAKS_MS, Date.now() - r.mulai);
        const berkas = new Blob(r.potong, {
          type: mr.mimeType || jenis || "audio/webm",
        });
        setStatus("mengirim");
        try {
          const res = await fetch(`/kontrol-dapur/suara?ms=${ms}`, {
            method: "POST",
            headers: { "content-type": berkas.type },
            body: berkas,
          });
          if (!res.ok)
            throw new Error(
              ((await res.json().catch(() => ({}))) as { galat?: string })
                .galat ?? "Gagal mengirim pesan suara.",
            );
          toast.success(
            "Pesan suara dikirim — diputar di dapur dalam beberapa detik",
          );
          onTerkirim();
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Gagal mengirim pesan suara.",
          );
        } finally {
          setStatus("siap");
        }
      };
      rekam.current = r;
      mr.start(1000);
      setDetik(0);
      setStatus("merekam");
    } catch {
      toast.error(
        "Mikrofon tidak bisa dipakai. Izinkan akses mikrofon untuk situs ini di browser, lalu coba lagi.",
      );
    }
  };

  const berhenti = (batal: boolean) => {
    const r = rekam.current;
    if (!r || r.mr.state !== "recording") return;
    r.batal = batal;
    r.mr.stop();
  };

  if (status === "merekam") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-tempo/30 bg-tempo-halus px-4 py-3">
        {/* Titik merah tetap (tanpa kedip) = sedang merekam. */}
        <span className="size-3 rounded-full bg-tempo" aria-hidden="true" />
        <p className="font-semibold text-tempo tabular-nums">
          Merekam {menitDetik(detik)}{" "}
          <span className="font-normal text-muted-foreground">/ 1:00</span>
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-full px-4"
            onClick={() => berhenti(true)}
          >
            <X className="size-4" /> Batal
          </Button>
          <Button
            className="h-11 rounded-full px-5"
            onClick={() => berhenti(false)}
          >
            <Send className="size-4" /> Kirim ke dapur
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Button
      className="h-14 w-full rounded-2xl text-base"
      disabled={status === "mengirim"}
      onClick={() => void mulai()}
    >
      <Mic className="size-5" />{" "}
      {status === "mengirim" ? "Mengirim…" : "Mulai bicara"}
    </Button>
  );
}
