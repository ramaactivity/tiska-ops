"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PilihanChip } from "@/components/pilihan-chip";
import { hitungSkalaMuat, labelSkala, PILIHAN_SKALA } from "@/lib/skala-cetak";

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
const OTOMATIS = "otomatis";

export function SkalaCetak() {
  const [pilihan, setPilihan] = useState(OTOMATIS);
  const keterangan = useRef<HTMLSpanElement>(null);

  /** Memasang skalanya, dan menyebutkan berapa yang akhirnya dipakai. */
  const pasang = useCallback((nilai: number, otomatis: boolean) => {
    document.documentElement.style.setProperty("--skala-cetak", String(nilai));
    if (keterangan.current) {
      keterangan.current.textContent = otomatis ? labelSkala(nilai) : "";
    }
  }, []);

  /**
   * Mengukur tinggi isinya pada skala 1, lalu menghitung yang muat.
   *
   * Tinggi halaman diukur lewat elemen setinggi 273mm — A4 dikurangi margin
   * 12mm di atas dan di bawah, sesuai @page di globals.css. DIUKUR, bukan
   * dihitung dari angka 96 dpi: perbandingan piksel ke milimeter berbeda
   * antar browser dan antar perangkat.
   */
  const hitungOtomatis = useCallback(() => {
    const lembar = document.querySelector<HTMLElement>(".lembar-cetak");
    if (!lembar) return;

    // Diukur pada skala 1, kalau tidak hasilnya bergantung pada skala
    // sebelumnya dan mengecil terus setiap kali dipilih.
    document.documentElement.style.setProperty("--skala-cetak", "1");

    const penggaris = document.createElement("div");
    // Halaman yang kertasnya bukan A4 (kwitansi A5) memasang --tinggi-isi-cetak sendiri.
    penggaris.style.cssText = "position:absolute;visibility:hidden;height:var(--tinggi-isi-cetak,273mm)";
    document.body.appendChild(penggaris);
    const tinggiHalaman = penggaris.offsetHeight;
    penggaris.remove();

    // Arahan yang hanya tampil di layar (print:hidden, mis. pengingat meterai kwitansi) tidak ikut tercetak.
    const hanyaLayar = [...lembar.querySelectorAll<HTMLElement>(":scope > .print\\:hidden")].reduce((t, el) => {
      const g = getComputedStyle(el);
      return t + el.offsetHeight + parseFloat(g.marginTop) + parseFloat(g.marginBottom);
    }, 0);
    pasang(hitungSkalaMuat(lembar.scrollHeight - hanyaLayar, tinggiHalaman), true);
  }, [pasang]);

  const terapkan = useCallback(
    (nilai: string) => {
      if (nilai === OTOMATIS) hitungOtomatis();
      else pasang(Number(nilai), false);
    },
    [hitungOtomatis, pasang],
  );

  // Pilihan terakhir diingat: yang mencetak dokumen biasanya mencetak
  // beberapa sekaligus, dan memilih ulang tiap kali hanya melelahkan.
  useEffect(() => {
    let tersimpan: string | null = null;
    try {
      tersimpan = window.localStorage.getItem(KUNCI_SIMPAN);
    } catch {
      // Penyimpanan browser bisa ditutup. Bukan alasan untuk gagal.
    }

    const awal = tersimpan ?? OTOMATIS;
    // Menyelaraskan dengan pilihan tersimpan di browser (sistem luar) sekali saat dibuka.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPilihan(awal);
    terapkan(awal);
  }, [terapkan]);

  function ubah(nilai: string) {
    try {
      window.localStorage.setItem(KUNCI_SIMPAN, nilai);
    } catch {
      // Lihat di atas.
    }
    setPilihan(nilai);
    terapkan(nilai);
  }

  return (
    <div className="flex items-center gap-2">
      <PilihanChip
        kecil
        label="Ukuran cetak"
        nilai={pilihan}
        onPilih={ubah}
        pilihan={[{ nilai: OTOMATIS, label: "Muat 1 halaman" }, ...PILIHAN_SKALA.map((s) => ({ nilai: String(s), label: labelSkala(s) }))]}
      />
      {/* Skala yang akhirnya dipakai hitungan otomatisnya. Tanpa angka ini,
          pilihan "Muat 1 halaman" tidak memberi tahu apa pun tentang
          seberapa kecil dokumennya menjadi. */}
      <span ref={keterangan} className="text-xs tabular-nums text-muted-foreground" />
    </div>
  );
}
