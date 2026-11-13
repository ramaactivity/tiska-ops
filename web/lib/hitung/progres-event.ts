/* ==========================================================================
   PROGRES PESANAN — langkah-langkah satu event dari disetujui sampai lunas
   (D-171). Murni: dipakai daftar Pesanan & Event dan detail event, jadi
   keduanya tidak bisa menghitung progres dengan cara berbeda.

   `uang` = false untuk peran yang tidak boleh membuka Invoice (dapur,
   gudang): langkah & peringatan soal invoice/pembayaran ikut hilang.
   ========================================================================== */

export type DataProgres = {
  status: string; // events.status
  caraLayanan: string; // antar | ambil | setup_service
  tanggal: string | null; // tanggal acara pertama, YYYY-MM-DD
  /** Invoice quotation ini yang tidak dibatalkan. */
  invoice: { status: string; dibayar: number }[];
  terkunci: boolean;
  /** Kloter acara ini (tanpa kloter Ikut Menu Pesta). */
  kloter: { anggota: number; selesai: boolean }[];
  jumlahBast: number;
  rekap: string | null; // diajukan | disetujui | dikunci
};

export type Langkah = { kunci: string; label: string; selesai: boolean; uang?: boolean };

export type Progres = { langkah: Langkah[]; peringatan: string[] };

/** Selisih hari kalender (WIB) dari hari ini ke tanggal acara; negatif = sudah lewat. */
function selisihHari(tanggal: string, hariIni: string): number {
  return Math.round((Date.parse(`${tanggal}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / 86_400_000);
}

export function progresEvent(d: DataProgres, hariIni: string, uang = true): Progres {
  if (d.status === "batal") return { langkah: [], peringatan: [] };
  const ambil = d.caraLayanan === "ambil";
  const adaInvoice = d.invoice.length > 0;
  const kirimSelesai = d.status === "selesai" || (d.kloter.length > 0 && d.kloter.every((k) => k.selesai));
  const timAda = d.kloter.some((k) => k.anggota > 0);

  const langkah: (Langkah | null)[] = [
    { kunci: "disetujui", label: "Disetujui", selesai: true },
    { kunci: "invoice", label: "Invoice dibuat", selesai: adaInvoice, uang: true },
    { kunci: "dp", label: "DP masuk", selesai: d.invoice.some((i) => i.dibayar > 0 || i.status === "paid"), uang: true },
    { kunci: "kunci", label: "Menu dikunci", selesai: d.terkunci || kirimSelesai },
    // Diambil customer: tidak ada tim yang berangkat.
    ambil ? null : { kunci: "tim", label: "Tim ditugaskan", selesai: timAda || kirimSelesai },
    { kunci: "kirim", label: ambil ? "Sudah diambil" : "Terkirim", selesai: kirimSelesai },
    // BAST = serah terima perlengkapan, hanya untuk set-up & service.
    d.caraLayanan === "setup_service" ? { kunci: "bast", label: "BAST", selesai: d.jumlahBast > 0 } : null,
    { kunci: "rekap", label: "Rekap", selesai: d.rekap === "disetujui" || d.rekap === "dikunci" },
    { kunci: "lunas", label: "Lunas", selesai: adaInvoice && d.invoice.every((i) => i.status === "paid"), uang: true },
  ];

  const peringatan: string[] = [];
  if (d.status !== "selesai" && d.tanggal) {
    const h = selisihHari(d.tanggal, hariIni);
    if (!ambil && !timAda && h >= 0 && h <= 2) peringatan.push(`Tim belum ditugaskan, acara ${h === 0 ? "hari ini" : `H-${h}`}`);
    if (uang && !adaInvoice && h < 0) peringatan.push("Acara sudah lewat, invoice belum dibuat");
  }
  return { langkah: langkah.filter((l): l is Langkah => l !== null && (uang || !l.uang)), peringatan };
}
