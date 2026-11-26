"use client";

import { Volume2, WifiOff } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { bagiHalaman, type Halaman, pisahSesi, teksSisa } from "@/lib/dapur-layar";
import type { OrderLayar } from "@/lib/pesanan-dapur";
import { menitMenuju } from "@/lib/tim";

/* ==========================================================================
   MODE TV (Rama 26 Nov 2026): TV 32 inci dipasang tinggi di dapur, dibaca orang
   tua dari ±3–4 m. Prinsip: ANGKA DULU, WAKTU DULU, BACA DARI JAUH.
   - Semua ukuran memakai vh (persen tinggi layar): sama besarnya di TV 1366×768
     maupun 1920×1080. Jumlah pesanan 8vh ≈ 3 cm, nama menu 4,6vh ≈ 1,8 cm.
   - Satu pesanan per layar: KIRI panel waktu (jam target raksasa, hitung mundur,
     warna makin hangat saat mepet — berubah pelan, tanpa kedip), KANAN menu dengan
     jumlah di depan (angka lebih mudah dibaca daripada kalimat — 08-TIM-PWA §3).
   - Label sesi yang diketik tim ("[SESI I PAGI - 06.00] …") jadi judul kelompok.
   - Tidak pernah digulir: dibagi per halaman yang berganti sendiri.
   - Bawah: garis waktu hari ini dengan penanda SEKARANG.
   ========================================================================== */

const DURASI_MS = 20_000;
const PUDAR_MS = 800;

type Item = OrderLayar["items"][number];
type Blok =
  | { kunci: string; jenis: "sesi"; teks: string; order: OrderLayar; besok: boolean; halamanBaru: boolean }
  | { kunci: string; jenis: "item"; item: Item; nama: string; sesi: string | null; order: OrderLayar; besok: boolean; halamanBaru: boolean };

export type JadwalTv = { kunci: string; jam: string; judul: string; ket: string };

function blokPesanan(daftar: OrderLayar[], besok: boolean): Blok[] {
  return daftar.flatMap((o) => {
    const hasil: Blok[] = [];
    let sesiKini: string | null = null;
    o.items.forEach((item, n) => {
      const { sesi, nama } = pisahSesi(item.nama);
      if (sesi && sesi !== sesiKini) hasil.push({ kunci: `${o.id}-s${n}`, jenis: "sesi", teks: sesi, order: o, besok, halamanBaru: hasil.length === 0 });
      if (sesi) sesiKini = sesi;
      hasil.push({ kunci: `${o.id}-${n}`, jenis: "item", item, nama, sesi: sesiKini, order: o, besok, halamanBaru: hasil.length === 0 });
    });
    return hasil;
  });
}

/** "1.693 BOX" → ["1.693", "BOX"]; "2 × 30 PAX" → ["2 × 30", "PAX"]. */
function pecahJumlah(j: string): [string, string] {
  const m = /^(.*?)\s*([A-Za-z][\w./-]*)$/.exec(j.trim());
  return m && m[1] ? [m[1], m[2]] : [j, ""];
}

function IsiBlok({ b }: { b: Blok }) {
  if (b.jenis === "sesi") {
    return (
      <p className="border-b border-[#2f3a32] pt-[0.6vh] pb-[1vh] mb-[1.4vh] text-[3vh] font-bold tracking-[0.1em] text-[#d9b56c] uppercase">⏰ {b.teks}</p>
    );
  }
  const i = b.item;
  const isi = i.isi.map((n) => (i.ket?.[n] ? `${n} (${i.ket[n]})` : n)).join(" · ");
  const [angka, satuan] = i.jumlah ? pecahJumlah(i.jumlah) : ["", ""];
  // Baris tanpa nama ("[SESI II …] = 333 BOX"): isinya yang jadi nama.
  const nama = b.nama || (isi ? "" : "Pesanan");
  return (
    <div className="grid grid-cols-[17vw_minmax(0,1fr)] items-start gap-x-[1.8vw] pb-[2.2vh]">
      <div className="text-right">
        {angka ? (
          <>
            <p className="text-[8vh] leading-[0.95] font-extrabold text-[#f7d98f] tabular-nums">{angka}</p>
            <p className="text-[2.6vh] font-bold tracking-[0.12em] text-[#c9b27c]">{satuan}</p>
          </>
        ) : null}
      </div>
      <div className="min-w-0 pt-[0.8vh]">
        {i.jumlah === null ? (
          <p className="text-[3.2vh] font-bold tracking-[0.08em] text-[#9aa59d] uppercase">{nama}</p>
        ) : nama ? (
          <p className="text-[4.6vh] leading-[1.15] font-semibold">
            {i.jam ? <span className="mr-[1vw] text-[#d9b56c] tabular-nums">⏰ {i.jam}</span> : null}
            {nama}
          </p>
        ) : null}
        {isi ? <p className={`${nama ? "text-[3.4vh] text-[#d5dcd7]" : "text-[4.2vh] font-semibold"} leading-snug`}>{isi}</p> : null}
        {i.catatan.map((c, k) => (
          <p key={k} className="text-[3.4vh] leading-snug whitespace-pre-line text-[#e8cf9a] italic">
            {c}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Warna panel waktu: makin hangat makin mepet. Berganti pelan (1 dtk), tanpa kedip. */
function nadaWaktu(menit: number | null, besok: boolean) {
  if (besok || menit === null) return "bg-[#1a221c] border-[#2a342d]";
  if (menit < 0) return "bg-[#183026] border-[#4f8a68]/50";
  if (menit <= 15) return "bg-[#4a2421] border-[#e0866b]/60";
  if (menit <= 60) return "bg-[#3d3018] border-[#d9b56c]/60";
  return "bg-[#1a221c] border-[#2a342d]";
}

function PanelWaktu({ o, besok, labelBesok, kini, tanggal, lanjutan }: { o: OrderLayar; besok: boolean; labelBesok: string; kini: Date | null; tanggal: string; lanjutan: string | null }) {
  const menit = !besok && kini && o.jam ? menitMenuju(tanggal, o.jam, kini) : null;
  const sisa = teksSisa(menit);
  // Jam pesanan seperti diketik tim ("06.00–15.00", "09.30 WIB brkt dr Julang") bila lebih dari sekadar jamnya.
  const sisaJam = o.jamTeks && o.jamTeks !== o.jam ? o.jamTeks : null;
  return (
    <section className={`flex h-full min-h-0 flex-col gap-[1.4vh] overflow-hidden rounded-[2.4vh] border-[0.3vh] p-[2.4vh] transition-colors duration-1000 ${nadaWaktu(menit, besok)}`}>
      <p className="text-[2.6vh] font-bold tracking-[0.14em] text-[#c9d1cb] uppercase">{besok ? `Persiapan besok · ${labelBesok}` : "Hari ini"}</p>
      {o.jam ? (
        <div>
          <p className="text-[13vh] leading-[0.9] font-extrabold text-[#f7d98f] tabular-nums">{o.jam}</p>
          {sisaJam ? <p className="text-[2.8vh] text-[#c9d1cb]">{sisaJam}</p> : null}
          {!besok ? <p className="mt-[0.6vh] text-[4.2vh] font-semibold">{sisa ?? (menit !== null ? "Sedang berjalan" : "")}</p> : null}
        </div>
      ) : (
        <p className="text-[3.4vh] text-[#9aa59d]">Jam belum diisi di invoice</p>
      )}
      <div className="min-w-0">
        <p className="line-clamp-3 text-[5vh] leading-[1.1] font-bold">{o.nama}</p>
        {o.tempat ? <p className="mt-[0.6vh] line-clamp-2 text-[2.6vh] text-[#c9d1cb]">📍 {o.tempat}</p> : null}
      </div>
      {o.catatanDapur ? (
        <div className="min-h-0 rounded-[1.6vh] border-[0.3vh] border-[#d9b56c]/70 bg-[#2b2414] px-[1.4vw] py-[1.2vh]">
          <p className="text-[2.4vh] font-bold tracking-[0.12em] text-[#d9b56c] uppercase">Catatan dapur</p>
          <p className="line-clamp-5 text-[3.4vh] leading-tight font-semibold whitespace-pre-line">{o.catatanDapur}</p>
        </div>
      ) : null}
      {lanjutan ? <p className="mt-auto text-[2.6vh] text-[#9aa59d]">{lanjutan}</p> : null}
    </section>
  );
}

/** Garis waktu hari ini: titik tiap jadwal + penanda SEKARANG; rentang menyesuaikan isinya. */
function GarisWaktu({ jadwal, kini, tanggal }: { jadwal: JadwalTv[]; kini: Date | null; tanggal: string }) {
  if (!kini || !jadwal.length) return null;
  const titik = jadwal.flatMap((j) => {
    const m = menitMenuju(tanggal, j.jam, kini);
    return m === null ? [] : [{ ...j, m }];
  });
  if (!titik.length) return null;
  const awal = Math.min(0, ...titik.map((t) => t.m)) - 45;
  const akhir = Math.max(0, ...titik.map((t) => t.m)) + 45;
  const persen = (m: number) => ((m - awal) / (akhir - awal)) * 100;
  const posisi = (m: number) => `${persen(m)}%`;
  // Label di dekat ujung garis dirapatkan ke dalam supaya tidak terpotong tepi layar.
  const tepi = (m: number) => (persen(m) < 12 ? "kiri" : persen(m) > 88 ? "kanan" : "tengah");
  return (
    <div className="relative mx-[2vw] h-[11vh]">
      <div className="absolute inset-x-0 top-1/2 h-[0.5vh] -translate-y-1/2 rounded-full bg-[#2a342d]" />
      <div className="absolute top-1/2 left-0 h-[0.5vh] -translate-y-1/2 rounded-full bg-[#4f8a68]/70" style={{ width: posisi(0) }} />
      {titik.map((t) => (
        <div
          key={t.kunci}
          className={`absolute top-0 flex h-full flex-col justify-between ${tepi(t.m) === "kiri" ? "items-start" : tepi(t.m) === "kanan" ? "-translate-x-full items-end" : "-translate-x-1/2 items-center"}`}
          style={{ left: posisi(t.m) }}
        >
          <p className="text-[3vh] leading-none font-bold text-[#f7d98f] tabular-nums">{t.jam}</p>
          <span className={`size-[2.2vh] rounded-full border-[0.4vh] ${t.m < 0 ? "border-[#4f8a68] bg-[#4f8a68]" : "border-[#d9b56c] bg-[#111712]"}`} />
          <p className="max-w-[18vw] truncate text-[2.2vh] leading-none text-[#c9d1cb]">{t.judul}</p>
        </div>
      ))}
      <div className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center" style={{ left: posisi(0) }}>
        <p className="rounded-full bg-[#f2efe6] px-[0.8vw] text-[1.8vh] leading-[1.5] font-extrabold tracking-[0.1em] text-[#111712]">SEKARANG</p>
        <span className="w-[0.4vh] flex-1 bg-[#f2efe6]" />
      </div>
    </div>
  );
}

export function LayarTv({
  order,
  orderBesok,
  tanggal,
  kini,
  labelHariIni,
  labelBesok,
  namaDapur,
  jam,
  jadwal,
  peringatan,
  suara,
  nyalakanSuara,
  tesSuara,
}: {
  order: OrderLayar[];
  orderBesok: OrderLayar[];
  tanggal: string;
  kini: Date | null;
  labelHariIni: string;
  labelBesok: string;
  namaDapur: string | null;
  jam: string;
  jadwal: JadwalTv[];
  peringatan: string | null;
  suara: boolean;
  nyalakanSuara: () => void;
  tesSuara: () => void;
}) {
  const blok = useMemo(() => [...blokPesanan(order, false), ...blokPesanan(orderBesok, true)], [order, orderBesok]);

  const kanan = useRef<HTMLDivElement>(null);
  const ukur = useRef<HTMLDivElement>(null);
  const [halaman, setHalaman] = useState<Halaman[]>([]);

  // Ukur tinggi asli tiap blok (huruf & lebar kolom sesungguhnya), lalu bagi ke halaman: satu pesanan per halaman.
  useLayoutEffect(() => {
    const hitung = () => {
      if (!ukur.current || !kanan.current) return;
      const tinggi = [...ukur.current.querySelectorAll<HTMLElement>("[data-blok]")].map((e) => e.getBoundingClientRect().height);
      const tinggiSesi = tinggi[blok.findIndex((b) => b.jenis === "sesi")] ?? 0;
      // Label sesi diperlakukan seperti kepala: tidak sendirian di dasar halaman, dan diulang di atas halaman lanjutan.
      setHalaman(
        bagiHalaman(
          blok.map((b, n) => ({ tinggi: tinggi[n] ?? 0, order: b.jenis === "item" && b.sesi ? `${b.order.id}|${b.sesi}` : null, kepala: b.jenis === "sesi", halamanBaru: b.halamanBaru })),
          tinggiSesi,
          kanan.current.clientHeight,
        ),
      );
    };
    hitung();
    void document.fonts?.ready.then(hitung);
    const amati = new ResizeObserver(hitung);
    amati.observe(kanan.current!);
    return () => amati.disconnect();
  }, [blok]);

  const [ke, setKe] = useState(0);
  const [tampak, setTampak] = useState(true);
  useEffect(() => {
    if (halaman.length <= 1) return;
    let jeda: ReturnType<typeof setTimeout> | undefined;
    const putar = setInterval(() => {
      setTampak(false);
      jeda = setTimeout(() => {
        setKe((k) => (k + 1) % halaman.length);
        setTampak(true);
      }, PUDAR_MS);
    }, DURASI_MS);
    return () => {
      clearInterval(putar);
      clearTimeout(jeda);
    };
  }, [halaman.length]);

  const nomor = halaman.length ? Math.min(ke, halaman.length - 1) : 0;
  const aktif = halaman[nomor];
  const pertama = aktif ? blok[aktif.blok[0]] : blok[0];
  // "Bagian 2 dari 3" bila satu pesanan butuh beberapa halaman.
  const halamanPesanan = pertama ? halaman.filter((h) => blok[h.blok[0]]?.order.id === pertama.order.id && blok[h.blok[0]]?.besok === pertama.besok) : [];
  const lanjutan = halamanPesanan.length > 1 && aktif ? `Bagian ${halamanPesanan.indexOf(aktif) + 1} dari ${halamanPesanan.length}` : null;

  return (
    <div className="flex h-dvh flex-col gap-[1.4vh] overflow-hidden px-[2.4vw] py-[2vh]">
      <style>{"@keyframes jalan-halaman{from{transform:scaleX(0)}to{transform:scaleX(1)}}"}</style>
      <header className="flex items-center justify-between gap-[2vw]">
        <div className="min-w-0">
          <p className="text-[3.4vh] font-extrabold tracking-[0.16em] text-[#d9b56c] uppercase">Dapur Tiska{namaDapur ? ` · ${namaDapur}` : ""}</p>
          <p className="text-[3vh] text-[#c9d1cb]">{labelHariIni}</p>
        </div>
        <div className="flex items-center gap-[2vw]">
          <button
            type="button"
            onClick={suara ? tesSuara : nyalakanSuara}
            className="flex items-center gap-[0.8vw] rounded-full border border-[#2a342d] bg-[#1e2620] px-[1.6vw] py-[1vh] text-[2.4vh] font-semibold whitespace-nowrap text-[#c9d1cb] transition-transform active:scale-[0.97]"
          >
            <Volume2 className="size-[3vh]" />
            {suara ? "Tes suara" : "Nyalakan suara"}
          </button>
          <p className="text-[10vh] leading-none font-bold tabular-nums">{jam}</p>
        </div>
      </header>

      {peringatan ? (
        <div role="status" className="flex items-center gap-[1vw] rounded-[1.6vh] border border-[#d9b56c]/60 bg-[#3a2a1c] px-[2vw] py-[1vh] text-[3.2vh] font-semibold">
          <WifiOff className="size-[4vh] shrink-0 text-[#d9b56c]" />
          {peringatan}
        </div>
      ) : null}

      {blok.length === 0 ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-[2vh] text-center">
          <p className="text-[6vh] font-bold">{namaDapur ? `Tidak ada tugas ${namaDapur}` : "Tidak ada pesanan"}</p>
          <p className="text-[3.6vh] text-[#9aa59d]">hari ini maupun besok ({labelBesok}).</p>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,31fr)_minmax(0,69fr)] gap-[2vw]">
          <div className="min-h-0 transition-opacity ease-out" style={{ opacity: tampak ? 1 : 0, transitionDuration: `${PUDAR_MS}ms` }}>
            {pertama ? <PanelWaktu o={pertama.order} besok={pertama.besok} labelBesok={labelBesok} kini={kini} tanggal={tanggal} lanjutan={lanjutan} /> : null}
          </div>
          <div ref={kanan} className="relative min-h-0 overflow-hidden">
            {/* Pengukur: semua blok dengan lebar kolom yang sama, tak terlihat. */}
            <div ref={ukur} aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0">
              {blok.map((b) => (
                <div key={b.kunci} data-blok>
                  <IsiBlok b={b} />
                </div>
              ))}
            </div>
            <div className="h-full transition-opacity ease-out" style={{ opacity: tampak ? 1 : 0, transitionDuration: `${PUDAR_MS}ms` }}>
              {order.length === 0 && pertama?.besok ? <p className="pb-[1.6vh] text-[3.2vh] text-[#9aa59d]">Hari ini tidak ada pesanan.</p> : null}
              {aktif?.lanjutan && pertama ? <IsiBlok b={{ kunci: "lanjutan", jenis: "sesi", teks: aktif.lanjutan.slice(aktif.lanjutan.indexOf("|") + 1), order: pertama.order, besok: pertama.besok, halamanBaru: false }} /> : null}
              {aktif?.blok.map((n) => (
                <Fragment key={blok[n].kunci}>
                  <IsiBlok b={blok[n]} />
                </Fragment>
              ))}
            </div>
          </div>
        </main>
      )}

      <footer className="flex flex-col gap-[1vh] border-t border-[#2a342d] pt-[1.2vh]">
        <GarisWaktu jadwal={jadwal} kini={kini} tanggal={tanggal} />
        {halaman.length > 1 ? (
          <div className="flex items-center gap-[1.4vw]">
            <div className="h-[0.6vh] flex-1 overflow-hidden rounded-full bg-[#2a342d]">
              <div key={`${nomor}-${halaman.length}`} className="h-full origin-left bg-[#d9b56c]/70" style={{ animation: `jalan-halaman ${DURASI_MS}ms linear` }} />
            </div>
            <p className="text-[2.6vh] text-[#9aa59d] tabular-nums">
              Halaman {nomor + 1} / {halaman.length}
            </p>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
