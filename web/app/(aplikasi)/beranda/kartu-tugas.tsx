"use client";

import { Check, LoaderCircle, MapPin, Phone, Volume2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { konfirmasiTugas } from "./actions";

export type TugasTampil = {
  id: string;
  hari: string;
  jam: string;
  catatan: string | null;
  peran: string;
  kendaraan: string | null;
  tugas: string | null;
  tujuan: string | null;
  alamat: string | null;
  maps: string | null;
  pic: string | null;
  hpPic: string | null;
  order: { nama: string; jumlah: string; isi: string[] }[];
  tim: { id: string; nama: string; siap: boolean }[];
  siap: boolean;
  captain: boolean;
  suara: string;
};

function dengarkan(teks: string) {
  if (!("speechSynthesis" in window)) return toast.error("HP ini belum mendukung suara.");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(teks);
  u.lang = "id-ID";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function KartuTugas({ t }: { t: TugasTampil }) {
  const [menunggu, mulai] = useTransition();
  const siapkan = (id: string, siapa: string) =>
    mulai(async () => {
      try {
        await konfirmasiTugas(id);
        toast.success(`${siapa} siap 👍`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{t.hari}</span>
        {t.siap ? <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✅ Sudah siap</span> : null}
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums">⏰ {t.jam}</p>
        <p className="text-base">berangkat dari Julang{t.catatan ? ` — ${t.catatan}` : ""}</p>
      </div>
      <div className="flex flex-col gap-1 text-base">
        {t.captain ? <p>⭐ Kamu <b>captain</b> — pimpin tim</p> : null}
        {t.kendaraan ? <p>🚐 Bawa <b>{t.kendaraan}</b></p> : null}
        {t.tugas ? <p>👉🏻 {t.tugas}</p> : null}
        {t.tujuan || t.alamat ? <p>📍 {[t.tujuan, t.alamat].filter(Boolean).join(" — ")}</p> : null}
      </div>
      {t.order.length ? (
        <div className="rounded-xl bg-muted/50 p-3">
          {t.order.map((o, i) => (
            <div key={i} className="py-1">
              <p className="font-semibold">🍱 {o.nama} = <span className="tabular-nums">{o.jumlah}</span></p>
              {o.isi.length ? <p className="text-sm text-muted-foreground">{o.isi.join(", ")}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {t.tim.length > 1 ? (
        <div className="text-sm">
          <p className="pb-1 font-medium">👥 Tim</p>
          <ul className="flex flex-col gap-1">
            {t.tim.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>
                  {a.siap ? "✅" : "⏳"} {a.nama}
                </span>
                {t.captain && !a.siap && a.id !== t.id ? (
                  <Button size="sm" variant="outline" className="h-9 rounded-full" disabled={menunggu} onClick={() => siapkan(a.id, a.nama)}>
                    Tandai siap
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 rounded-full text-base" onClick={() => dengarkan(t.suara)}>
          <Volume2 className="size-5" />
          Dengarkan
        </Button>
        {t.maps ? (
          <Button variant="outline" className="h-12 rounded-full text-base" render={<a href={t.maps} target="_blank" rel="noopener" />}>
            <MapPin className="size-5" />
            Maps
          </Button>
        ) : t.hpPic ? (
          <Button variant="outline" className="h-12 rounded-full text-base" render={<a href={`tel:${t.hpPic.replace(/[^\d+]/g, "")}`} />}>
            <Phone className="size-5" />
            Telepon PIC
          </Button>
        ) : (
          <span />
        )}
      </div>
      {t.maps && t.hpPic ? (
        <Button variant="outline" className="h-12 rounded-full text-base" render={<a href={`tel:${t.hpPic.replace(/[^\d+]/g, "")}`} />}>
          <Phone className="size-5" />
          Telepon {t.pic ?? "PIC"}
        </Button>
      ) : null}
      {!t.siap ? (
        <Button className="h-14 rounded-full text-lg" disabled={menunggu} onClick={() => siapkan(t.id, "Kamu")}>
          {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Check className="size-5" />}
          Siap 👍
        </Button>
      ) : null}
    </article>
  );
}
