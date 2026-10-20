"use client";

import { Eraser } from "lucide-react";
import { useEffect, useImperativeHandle, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Papan tanda tangan jari (BAST, D-103). Hasilnya PNG lewat `ambil()` —
 * null bila belum ada coretan. Garis hitam di latar putih supaya tetap
 * terbaca saat dicetak.
 */
export type PapanTtd = { ambil: () => Promise<Blob | null> };

export function PapanTandaTangan({ ref }: { ref: React.Ref<PapanTtd> }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const ada = useRef(false);

  useEffect(() => {
    const c = kanvas.current!;
    const r = c.getBoundingClientRect();
    const skala = window.devicePixelRatio || 1;
    c.width = r.width * skala;
    c.height = r.height * skala;
    const g = c.getContext("2d")!;
    g.scale(skala, skala);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, r.width, r.height);
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#111";
  }, []);
  useImperativeHandle(ref, () => ({
    ambil: () => (ada.current ? new Promise((ok) => kanvas.current!.toBlob((b) => ok(b), "image/png")) : Promise.resolve(null)),
  }));

  const titik = (e: React.PointerEvent) => {
    const r = kanvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const hapus = () => {
    const c = kanvas.current!;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    ada.current = false;
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={kanvas}
        aria-label="Kotak tanda tangan"
        className="h-48 w-full touch-none rounded-2xl border-2 border-dashed bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const g = e.currentTarget.getContext("2d")!;
          const [x, y] = titik(e);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 0.1, y + 0.1);
          g.stroke();
          ada.current = true;
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          const g = e.currentTarget.getContext("2d")!;
          const [x, y] = titik(e);
          g.lineTo(x, y);
          g.stroke();
        }}
      />
      <Button type="button" variant="outline" size="sm" className="w-fit rounded-full" onClick={hapus}>
        <Eraser className="size-4" />
        Ulangi tanda tangan
      </Button>
    </div>
  );
}
