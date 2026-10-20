"use client";

import { Camera, Check, LoaderCircle, MapPin, Phone, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { LABEL_STATUS_DAPUR, LABEL_STATUS_KIRIM, statusBerikutnya, type StatusDapur, type StatusKirim } from "@/lib/tim";

import { kecilkanFoto } from "@/lib/foto";

import { TombolBast } from "./panel-bast";
import { useAntrian, useLapor } from "./status-sinyal";

const jamWib = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/** Lokasi bila diizinkan; tidak menghambat bila ditolak/lama (4 detik). */
function lokasi(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => ok({ lat: null, lng: null }),
      { timeout: 4000, maximumAge: 60_000 },
    );
  });
}

function StatusKirimKloter({ kloterId, lacak }: { kloterId: string; lacak: TugasTampil["lacak"] }) {
  const { lapor, menunggu } = useLapor();
  const kamera = useRef<HTMLInputElement>(null);
  // Status yang sudah ditekan tapi masih menunggu sinyal (D-099) ikut dihitung.
  const tertunda = useAntrian()
    .filter((a) => a.jenis === "status" && a.id === kloterId && !lacak.some((l) => l.status === a.status))
    .map((a) => ({ status: (a as { status: string }).status, jam: jamWib.format(a.jam), tertunda: true }));
  const semua = [...lacak, ...tertunda];
  const berikut = statusBerikutnya(semua.map((l) => l.status));
  const kirim = (status: StatusKirim, foto?: File) =>
    lapor(async () => {
      const jam = Date.now();
      const kecil = foto ? await kecilkanFoto(foto) : null;
      return { jenis: "status", id: kloterId, status, foto: kecil, jam, ...(await lokasi()) };
    }, LABEL_STATUS_KIRIM[status]);
  return (
    <div className="flex flex-col gap-2">
      {semua.length ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {semua.map((l) => (
            <li key={l.status}>
              {LABEL_STATUS_KIRIM[l.status as StatusKirim] ?? LABEL_STATUS_DAPUR[l.status as StatusDapur] ?? l.status} <b className="tabular-nums">{l.jam}</b>
              {"tertunda" in l ? <span className="text-perhatian"> ⏳ menunggu sinyal</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={kamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Foto bukti sampai"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) kirim("tiba", f);
        }}
      />
      {berikut ? (
        <Button
          variant="outline"
          className="h-14 rounded-full border-2 text-lg"
          disabled={menunggu}
          onClick={() => (berikut === "tiba" ? kamera.current?.click() : kirim(berikut))}
        >
          {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : berikut === "tiba" ? <Camera className="size-5" /> : null}
          {LABEL_STATUS_KIRIM[berikut]}
          {berikut === "tiba" ? " (foto)" : ""}
        </Button>
      ) : null}
    </div>
  );
}

export type TugasTampil = {
  id: string;
  kloterId: string;
  /** Status kirim yang sudah ditekan + jamnya (WIB). */
  lacak: { status: string; jam: string }[];
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
  /** Barang kloter ini untuk BAST (D-103) + BAST yang sudah ditandatangani. */
  barangBast: { nama: string; jumlah: string; isi: string[] }[];
  bast: { nomor: string; penerima: string } | null;
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
  const { lapor, menunggu } = useLapor();
  const antre = useAntrian();
  const siapTertunda = (id: string) => antre.some((a) => a.jenis === "siap" && a.id === id);
  const siapkan = (id: string, siapa: string) => lapor(async () => ({ jenis: "siap", id, jam: Date.now() }), `${siapa} siap 👍`);
  const siap = t.siap || siapTertunda(t.id);

  return (
    <article className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{t.hari}</span>
        {t.siap ? (
          <span className="text-sm font-medium text-lunas">✅ Sudah siap</span>
        ) : siap ? (
          <span className="text-sm font-medium text-perhatian">✅ Siap · ⏳ menunggu sinyal</span>
        ) : null}
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums">⏰ {t.jam}</p>
        <p className="text-base">berangkat dari Julang{t.catatan ? ` — ${t.catatan}` : ""}</p>
      </div>
      <div className="flex flex-col gap-1 text-base">
        {t.captain ? <p>⭐ Kamu <b>captain</b> — pimpin tim</p> : null}
        {t.captain ? (
          <Link href={`/beranda/absen/${t.kloterId}`} className="mt-1 inline-flex min-h-11 w-fit items-center rounded-xl border px-4 font-medium">
            📝 Absen & DW
          </Link>
        ) : null}
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
                  {a.siap || siapTertunda(a.id) ? "✅" : "⏳"} {a.nama}
                  {!a.siap && siapTertunda(a.id) ? <span className="text-perhatian"> · menunggu sinyal</span> : null}
                </span>
                {t.captain && !a.siap && !siapTertunda(a.id) && a.id !== t.id ? (
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
      {siap && t.hari === "Hari ini" ? <StatusKirimKloter kloterId={t.kloterId} lacak={t.lacak} /> : null}
      {siap && t.hari === "Hari ini" ? <TombolBast t={t} /> : null}
      {!siap ? (
        <Button className="h-14 rounded-full text-lg" disabled={menunggu} onClick={() => siapkan(t.id, "Kamu")}>
          {menunggu ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Check className="size-5" />}
          Siap 👍
        </Button>
      ) : null}
    </article>
  );
}
