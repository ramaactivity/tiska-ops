"use client";

import { useCallback, useEffect, useState } from "react";

import { PilihanChip } from "@/components/pilihan-chip";
import { hitungSkalaMuat, labelSkala, NAMA_SKALA, PILIHAN_SKALA } from "@/lib/skala-cetak";

/* ==========================================================================
   PENGATUR SKALA HALAMAN CETAK

   Quotation dan invoice katering kadang hanya lebih panjang sedikit dari
   satu halaman A4, dan lembar keduanya hampir kosong. Pilihan ini
   memperkecil dokumennya secukupnya supaya muat.

   Skalanya dipasang sebagai variabel CSS pada <html>, dipakai aturan
   .lembar-cetak di globals.css. Satu tempat mengatur layar DAN kertas
   sekaligus — yang terlihat sebelum menekan Cetak adalah yang akan keluar
   dari printer.

   Dipakai `zoom`, BUKAN `transform: scale()`. Transform tidak mengubah
   tinggi yang dipakai browser memotong halaman, jadi dokumen yang terlihat
   mengecil di layar tetap tercetak dua lembar — perbaikan yang tampak
   berhasil padahal tidak.

   Pilihannya tombol pill (DESIGN.md: tanpa <select> bawaan); skalanya
   tetap hidup di variabel CSS.
   ========================================================================== */

const KUNCI_SIMPAN = "skala-cetak";
const MUAT = "muat";

/**
 * Pilihan dengan kata, bukan persen (D-205, Rama: "prosentase 100% dan sebagainya bikin bingung"). Yang menyala
 * selalu ukuran yang benar-benar dipakai — dulu "Muat 1 halaman" menyala padahal dicetak 100%.
 */
const UKURAN = PILIHAN_SKALA.map((s) => ({ nilai: String(s), label: NAMA_SKALA[s] }));

/** Mengabari pratinjau halaman (PratinjauPdf) bahwa ukurannya berganti. */
const kabari = () => window.dispatchEvent(new Event("skala-cetak"));

/**
 * Tinggi isi dibanding tinggi halaman, pada skala 1. Tinggi halaman diukur lewat elemen setinggi 273mm — A4
 * dikurangi margin 12mm di atas dan di bawah (@page di globals.css). DIUKUR, bukan dihitung dari 96 dpi.
 */
function ukurIsi(): { isi: number; halaman: number } | null {
  const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
  if (!lembar) return null;
  const sebelum = document.documentElement.style.getPropertyValue("--skala-cetak");
  document.documentElement.style.setProperty("--skala-cetak", "1");
  const penggaris = document.createElement("div");
  // Halaman yang kertasnya bukan A4 (kwitansi A5) memasang --tinggi-isi-cetak sendiri.
  penggaris.style.cssText = "position:absolute;visibility:hidden;height:var(--tinggi-isi-cetak,273mm)";
  document.body.appendChild(penggaris);
  const halaman = penggaris.offsetHeight;
  penggaris.remove();
  // Arahan yang hanya tampil di layar (print:hidden, mis. pengingat meterai kwitansi) tidak ikut tercetak.
  const hanyaLayar = [...lembar.querySelectorAll<HTMLElement>(":scope > .print\\:hidden")].reduce((t, el) => {
    const g = getComputedStyle(el);
    return t + el.offsetHeight + parseFloat(g.marginTop) + parseFloat(g.marginBottom);
  }, 0);
  const isi = lembar.scrollHeight - hanyaLayar;
  document.documentElement.style.setProperty("--skala-cetak", sebelum || "1");
  return { isi, halaman };
}

export function SkalaCetak() {
  const [pilihan, setPilihan] = useState<string>("1");
  // Skala "Muat 1 halaman" bila memang mungkin (≥ 70%, belum muat di 100%); null = tidak ditawarkan.
  const [muat, setMuat] = useState<number | null>(null);
  const [sudahMuat, setSudahMuat] = useState(false);

  const pasang = useCallback((nilai: number) => {
    document.documentElement.style.setProperty("--skala-cetak", String(nilai));
    kabari();
  }, []);

  // Diukur sekali saat dibuka; pilihan terakhir diingat (yang mencetak biasanya mencetak beberapa sekaligus).
  useEffect(() => {
    const u = ukurIsi();
    const skalaMuat = u ? hitungSkalaMuat(u.isi, u.halaman) : 1;
    const muatPas = u ? u.isi <= u.halaman : false;
    const bisaMuat = !muatPas && skalaMuat < 1 ? skalaMuat : null;
    let tersimpan: string | null = null;
    try {
      tersimpan = window.localStorage.getItem(KUNCI_SIMPAN);
    } catch {
      // Penyimpanan browser bisa ditutup. Bukan alasan untuk gagal.
    }
    // Bawaan: muat 1 halaman bila bisa, selain itu Normal. Pilihan tersimpan yang tidak berlaku di dokumen ini
    // (mis. "muat" pada dokumen 4 halaman) jatuh ke bawaan.
    const sah = (v: string | null) => (v === MUAT ? bisaMuat !== null : UKURAN.some((u) => u.nilai === v));
    const awal = sah(tersimpan) ? tersimpan! : bisaMuat !== null ? MUAT : "1";
    // Menyelaraskan dengan ukuran isi & pilihan tersimpan di browser (sistem luar) sekali saat dibuka.
    /* eslint-disable react-hooks/set-state-in-effect */
    setMuat(bisaMuat);
    setSudahMuat(muatPas);
    setPilihan(awal);
    /* eslint-enable react-hooks/set-state-in-effect */
    pasang(awal === MUAT ? bisaMuat! : Number(awal));
  }, [pasang]);

  function ubah(nilai: string) {
    try {
      window.localStorage.setItem(KUNCI_SIMPAN, nilai);
    } catch {
      // Lihat di atas.
    }
    setPilihan(nilai);
    pasang(nilai === MUAT && muat !== null ? muat : Number(nilai));
  }

  return (
    <div className="flex flex-col gap-2">
      <PilihanChip
        kecil
        label="Ukuran tulisan"
        nilai={pilihan}
        onPilih={ubah}
        pilihan={[...(muat !== null ? [{ nilai: MUAT, label: "Muat 1 halaman" }] : []), ...UKURAN]}
      />
      <p className="text-[13px] leading-snug text-muted-foreground">
        {sudahMuat ? "Dokumen ini sudah muat 1 halaman. " : null}
        {pilihan === MUAT && muat !== null ? `Tulisan diperkecil ke ${labelSkala(muat)} supaya muat 1 halaman. ` : null}
        Pratinjau halaman ikut berubah — PDF, WA, dan cetakan memakai hasil yang sama.
      </p>
    </div>
  );
}
