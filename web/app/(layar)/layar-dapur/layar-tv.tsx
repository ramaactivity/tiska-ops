"use client";

import { MapPin, Volume2, WifiOff } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { bagiHalaman, type Halaman, jamPertama, pisahSesi, teksSisa } from "@/lib/dapur-layar";
import type { OrderLayar } from "@/lib/pesanan-dapur";
import { menitMenuju } from "@/lib/tim";

/* ==========================================================================
   MODE TV — papan produksi (Rama 26 Nov 2026). TV 32 inci dipasang tinggi di dapur,
   dibaca pekerja yang kebanyakan orang tua dari ±3–4 m.

   - Ukuran memakai vh (persen tinggi layar): sama besarnya di TV 1366×768 maupun
     1080p. Jumlah 10vh ≈ 4 cm, nama menu 4,8vh ≈ 2 cm.
   - Warna seperti Tiska Ops, rasa poster (referensi Rama): biru indigo pekat,
     putih tebal Plus Jakarta Sans ExtraBold, satu aksen hijau limau untuk angka.
   - Tanpa kartu: satu pesanan selebar layar. Kiri = waktu (jam target raksasa,
     warnanya putih → amber → koral makin mepet; berubah pelan, tanpa kedip), nama
     pemesan, catatan dapur blok putih bertulisan indigo. Kanan = baris bergaris
     tipis, jumlah di depan. Sesi tim ("[SESI I PAGI - 06.00]") jadi judul berjam.
   - Tidak pernah digulir: halaman berganti sendiri; bawah = penanda halaman +
     apa yang tampil berikutnya.
   ========================================================================== */

const DURASI_MS = 20_000;
const PUDAR_MS = 800;
/** Angka & judul besar: Jakarta ExtraBold, jarak huruf dirapatkan seperti judul poster. */
const PAPAN: CSSProperties = { fontWeight: 800, letterSpacing: "-0.03em" };

const WARNA = {
  krem: "#FFFFFF",
  redup: "#C9D2F5",
  garis: "rgba(255,255,255,0.16)",
  emas: "#C6F06A",
  amber: "#FFC857",
  koral: "#FF8A6B",
  mint: "#FFFFFF",
  tinta: "#142074",
};

type Item = OrderLayar["items"][number];
type Blok =
  | { kunci: string; jenis: "sesi"; teks: string; order: OrderLayar; besok: boolean; halamanBaru: boolean }
  | { kunci: string; jenis: "item"; item: Item; nama: string; sesi: string | null; order: OrderLayar; besok: boolean; halamanBaru: boolean };

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

/** "1.693 BOX" → ["1.693", "box"]; "2 × 30 PAX" → ["2 × 30", "pax"]. */
function pecahJumlah(j: string): [string, string] {
  const m = /^(.*?)\s*([A-Za-z][\w./-]*)$/.exec(j.trim());
  return m && m[1] ? [m[1], m[2].toLowerCase()] : [j, ""];
}

/** "STARTER" → "Starter" — judul kelompok yang diketik kapital semua dibaca sebagai kalimat biasa. */
const kalimat = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t);

/** Judul sesi: jamnya pindah ke kolom angka, sisanya jadi judul ("SESI I PAGI · TIBA DI LOKASI"). */
function judulSesi(teks: string): { jam: string | null; judul: string } {
  const jam = jamPertama(teks);
  const judul = teks
    .replace(/(?<!\d)([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/, "")
    .replace(/\s+[-–]\s+/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[-–·]\s*|\s*[-–·]$/g, "")
    .replace(/\s*·\s*·\s*/g, " · ")
    .trim();
  return { jam, judul };
}

function IsiBlok({ b, pertama }: { b: Blok; pertama: boolean }) {
  if (b.jenis === "sesi") {
    const { jam, judul } = judulSesi(b.teks);
    return (
      <div className={`grid grid-cols-[18vw_minmax(0,1fr)] items-baseline gap-x-[2vw] pt-[2.2vh] pb-[0.6vh] ${pertama ? "" : "border-t-[0.35vh]"}`} style={{ borderColor: "rgba(255,255,255,0.45)" }}>
        <p className="text-right text-[5vh] leading-none tabular-nums" style={{ ...PAPAN, color: WARNA.emas }}>
          {jam}
        </p>
        <p className="text-[4.2vh] leading-[1.05]" style={PAPAN}>
          {judul}
        </p>
      </div>
    );
  }
  const i = b.item;
  const isi = i.isi.map((n) => (i.ket?.[n] ? `${n} (${i.ket[n]})` : n)).join(" · ");
  const [angka, satuan] = i.jumlah ? pecahJumlah(i.jumlah) : ["", ""];
  // Baris tanpa nama ("[SESI II …] = 333 BOX"): isinya yang jadi bacaan utama.
  const nama = b.nama ? kalimat(b.nama) : "";
  const utama = nama && i.jumlah !== null;
  return (
    <div className={`grid grid-cols-[18vw_minmax(0,1fr)] gap-x-[2vw] py-[1.7vh] ${pertama ? "" : "border-t"}`} style={{ borderColor: WARNA.garis }}>
      <div className="text-right">
        {angka ? (
          <p className="text-[8.6vh] leading-[0.9] tabular-nums" style={{ ...PAPAN, color: WARNA.emas }}>
            {angka}
            <span className="ml-[0.5vw] text-[3vh] font-semibold tracking-normal" style={{ color: WARNA.redup }}>
              {satuan}
            </span>
          </p>
        ) : null}
      </div>
      <div className="min-w-0">
        {i.jumlah === null ? (
          <p className="text-[3.6vh] leading-tight font-semibold" style={{ color: WARNA.redup }}>
            {nama}
          </p>
        ) : nama ? (
          <p className="text-[4.6vh] leading-[1.1] font-bold tracking-[-0.01em] text-balance">
            {i.jam ? (
              <span className="mr-[1vw] tabular-nums" style={{ ...PAPAN, color: WARNA.emas }}>
                {i.jam}
              </span>
            ) : null}
            {nama}
          </p>
        ) : null}
        {isi ? (
          <p className={utama ? "mt-[0.4vh] text-[3.2vh] leading-[1.3]" : "text-[4vh] leading-[1.2] font-semibold"} style={{ color: utama ? WARNA.redup : WARNA.krem }}>
            {isi}
          </p>
        ) : null}
        {i.catatan.map((c, k) => (
          <p key={k} className="mt-[0.4vh] text-[3.2vh] leading-[1.3] whitespace-pre-line italic" style={{ color: "#E9F7C4" }}>
            {c}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Warna jam target: tenang (krem) → ≤60 menit emas → ≤15 menit koral → sudah lewat mint. */
function warnaWaktu(menit: number | null, besok: boolean) {
  if (besok || menit === null) return WARNA.krem;
  if (menit < 0) return WARNA.mint;
  if (menit <= 15) return WARNA.koral;
  if (menit <= 60) return WARNA.amber;
  return WARNA.krem;
}

function KolomWaktu({ o, besok, labelBesok, kini, tanggal, bagian }: { o: OrderLayar; besok: boolean; labelBesok: string; kini: Date | null; tanggal: string; bagian: string | null }) {
  const menit = !besok && kini && o.jam ? menitMenuju(tanggal, o.jam, kini) : null;
  const warna = warnaWaktu(menit, besok);
  const status = besok ? `Besok, ${labelBesok}` : (teksSisa(menit) ?? (menit !== null ? "Sedang berjalan" : null));
  return (
    <section className="flex min-h-0 w-full flex-col border-r pr-[2.4vw]" style={{ borderColor: WARNA.garis }}>
      {o.jam ? (
        <p className="text-[19vh] leading-[0.85] tabular-nums transition-colors duration-1000" style={{ ...PAPAN, color: warna }}>
          {o.jam}
        </p>
      ) : (
        <p className="text-[4.4vh] leading-tight" style={{ color: WARNA.redup }}>
          Jam belum diisi di invoice
        </p>
      )}
      {status ? (
        <p className="mt-[1.4vh] text-[4.4vh] leading-none font-bold transition-colors duration-1000" style={{ color: besok ? WARNA.emas : warna }}>
          {status}
        </p>
      ) : null}
      {o.jamTeks && o.jamTeks !== o.jam ? (
        <p className="mt-[0.8vh] text-[2.8vh]" style={{ color: WARNA.redup }}>
          Di invoice: {o.jamTeks}
        </p>
      ) : null}

      <span className="mt-[3.2vh] block h-[0.6vh] w-[5vw] rounded-full" style={{ background: WARNA.emas }} />
      <p className="mt-[2.4vh] line-clamp-3 text-[5.6vh] leading-[1.05] text-balance" style={PAPAN}>
        {o.nama}
      </p>
      {o.tempat ? (
        <p className="mt-[1vh] flex gap-[0.6vw] text-[2.8vh] leading-snug" style={{ color: WARNA.redup }}>
          <MapPin className="mt-[0.5vh] size-[2.8vh] shrink-0" strokeWidth={1.75} />
          <span className="line-clamp-2">{o.tempat}</span>
        </p>
      ) : null}
      {bagian ? (
        <p className="mt-[1.4vh] text-[2.8vh]" style={{ color: WARNA.redup }}>
          {bagian}
        </p>
      ) : null}

      {o.catatanDapur ? (
        <div className="mt-auto rounded-[1.4vh] px-[1.4vw] py-[1.6vh]" style={{ background: "#FFFFFF", color: WARNA.tinta, boxShadow: "0 1.2vh 3vh rgba(8,14,60,0.35)" }}>
          <p className="text-[2.8vh] font-bold">Catatan dapur</p>
          <p className="mt-[0.4vh] line-clamp-6 text-[3.6vh] leading-[1.2] font-semibold whitespace-pre-line">{o.catatanDapur}</p>
        </div>
      ) : null}
    </section>
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
      // Judul sesi diperlakukan seperti kepala: tidak sendirian di dasar halaman, dan diulang di atas halaman lanjutan.
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
  const halamanPesanan = pertama ? halaman.filter((h) => blok[h.blok[0]]?.order.id === pertama.order.id && blok[h.blok[0]]?.besok === pertama.besok) : [];
  const bagian = halamanPesanan.length > 1 && aktif ? `Bagian ${halamanPesanan.indexOf(aktif) + 1} dari ${halamanPesanan.length}` : null;
  const berikut = halaman.length > 1 ? blok[halaman[(nomor + 1) % halaman.length].blok[0]] : null;
  const teksBerikut = !berikut
    ? null
    : berikut.order.id !== pertama?.order.id || berikut.besok !== pertama?.besok
      ? `${berikut.besok ? "Besok · " : ""}${berikut.order.nama}`
      : berikut.jenis === "sesi"
        ? judulSesi(berikut.teks).judul
        : "Lanjutan pesanan ini";
  const pudar: CSSProperties = { opacity: tampak ? 1 : 0, transition: `opacity ${PUDAR_MS}ms cubic-bezier(0.23, 1, 0.32, 1)` };

  return (
    <div className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-[3vw] py-[2.6vh]">
      <style>{"@keyframes jalan-halaman{from{transform:scaleX(0)}to{transform:scaleX(1)}}"}</style>

      <header className="flex items-center justify-between pb-[2vh]">
        <div className="flex items-center gap-[1.6vw]">
          <Image src="/brand/unduh/logo-tiska-putih-mendatar.png" alt="Tiska Catering" width={1747} height={868} priority className="h-[9vh] w-auto" />
          {namaDapur ? (
            <p className="border-l pl-[1.6vw] text-[3.6vh]" style={{ ...PAPAN, borderColor: WARNA.garis, color: WARNA.redup }}>
              {namaDapur}
            </p>
          ) : null}
        </div>
        <div className="flex items-baseline gap-[1.6vw]">
          <p className="text-[3.4vh]" style={{ color: WARNA.redup }}>
            {labelHariIni}
          </p>
          <p className="text-[9vh] leading-[0.85] tabular-nums" style={PAPAN}>
            {jam}
          </p>
        </div>
      </header>

      {peringatan ? (
        <div role="status" className="mb-[2vh] flex items-center gap-[1vw] rounded-[1vh] px-[1.6vw] py-[1.2vh] text-[3.2vh] font-semibold" style={{ background: WARNA.amber, color: WARNA.tinta }}>
          <WifiOff className="size-[3.8vh] shrink-0" strokeWidth={2} />
          {peringatan}
        </div>
      ) : (
        <div />
      )}

      {blok.length === 0 ? (
        <main className="flex flex-col justify-center border-t" style={{ borderColor: WARNA.garis }}>
          <p className="text-[10vh] leading-[0.95]" style={PAPAN}>
            {namaDapur ? `Tidak ada tugas ${namaDapur}` : "Tidak ada pesanan"}
          </p>
          <p className="mt-[2vh] text-[4vh]" style={{ color: WARNA.redup }}>
            Hari ini maupun besok, {labelBesok}.
          </p>
        </main>
      ) : (
        <main className="grid min-h-0 grid-cols-[minmax(0,33fr)_minmax(0,67fr)] gap-[2.4vw] border-t pt-[2.6vh]" style={{ borderColor: WARNA.garis }}>
          <div className="flex min-h-0" style={pudar}>
            {pertama ? <KolomWaktu o={pertama.order} besok={pertama.besok} labelBesok={labelBesok} kini={kini} tanggal={tanggal} bagian={bagian} /> : null}
          </div>
          <div ref={kanan} className="relative min-h-0 overflow-hidden">
            {/* Pengukur: semua blok dengan lebar kolom yang sama, tak terlihat. */}
            <div ref={ukur} aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0">
              {blok.map((b) => (
                <div key={b.kunci} data-blok>
                  <IsiBlok b={b} pertama={false} />
                </div>
              ))}
            </div>
            <div className="h-full" style={pudar}>
              {order.length === 0 && pertama?.besok ? (
                <p className="pb-[1.6vh] text-[3.4vh]" style={{ color: WARNA.redup }}>
                  Hari ini tidak ada pesanan. Ini persiapan untuk besok.
                </p>
              ) : null}
              {aktif?.lanjutan && pertama ? (
                <IsiBlok b={{ kunci: "lanjutan", jenis: "sesi", teks: aktif.lanjutan.slice(aktif.lanjutan.indexOf("|") + 1), order: pertama.order, besok: pertama.besok, halamanBaru: false }} pertama />
              ) : null}
              {aktif?.blok.map((n, k) => (
                <Fragment key={blok[n].kunci}>
                  <IsiBlok b={blok[n]} pertama={k === 0 && !aktif.lanjutan} />
                </Fragment>
              ))}
            </div>
          </div>
        </main>
      )}

      <footer className="flex items-center gap-[2vw] pt-[2vh]">
        {halaman.length > 1 ? (
          <>
            <div className="flex w-[22vw] shrink-0 gap-[0.5vw]" aria-label={`Halaman ${nomor + 1} dari ${halaman.length}`}>
              {halaman.map((_, n) => (
                <span key={n} className="h-[0.8vh] flex-1 overflow-hidden rounded-full" style={{ background: n < nomor ? WARNA.redup : WARNA.garis }}>
                  {n === nomor ? (
                    <span key={`${nomor}-${halaman.length}`} className="block h-full origin-left" style={{ background: WARNA.emas, animation: `jalan-halaman ${DURASI_MS}ms linear` }} />
                  ) : null}
                </span>
              ))}
            </div>
            {teksBerikut ? (
              <p className="min-w-0 truncate text-[3.2vh]" style={{ color: WARNA.redup }}>
                Berikutnya: <span style={{ color: WARNA.krem }}>{teksBerikut}</span>
              </p>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          onClick={suara ? tesSuara : nyalakanSuara}
          className="ml-auto flex shrink-0 items-center gap-[0.6vw] rounded-full border px-[1.4vw] py-[0.9vh] text-[2.4vh] font-semibold whitespace-nowrap transition-transform active:scale-[0.97]"
          style={{ borderColor: WARNA.garis, color: suara ? WARNA.redup : WARNA.krem }}
        >
          <Volume2 className="size-[2.8vh]" strokeWidth={1.75} />
          {suara ? "Tes suara" : "Nyalakan suara"}
        </button>
      </footer>
    </div>
  );
}
