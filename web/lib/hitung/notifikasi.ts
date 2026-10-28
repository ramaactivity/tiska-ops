/* ==========================================================================
   TEKS NOTIFIKASI HP (08-TIM-PWA §1 "Notifikasi jelas", D-096). Murni.

   Pendek, kata sehari-hari, tanpa angka uang untuk tim lapangan. Satu tempat
   supaya push sekarang dan Hermes nanti memakai kalimat yang sama.
   ========================================================================== */

export type PesanPush = { judul: string; isi: string; url: string; tag?: string };

const hari = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** Pengingat sore untuk tim lapangan: tugas besok (urut jam). */
export function pesanJadwalBesok(tanggal: string, tugas: { jam: string; event: string; kloter: number; captain: boolean; sudahSiap: boolean }[]): PesanPush | null {
  if (!tugas.length) return null;
  const urut = [...tugas].sort((a, b) => a.jam.localeCompare(b.jam));
  const pertama = urut[0];
  const lain = urut.length > 1 ? ` (+${urut.length - 1} tugas lagi)` : "";
  const belum = urut.some((t) => !t.sudahSiap);
  return {
    judul: `Besok berangkat ${pertama.jam}`,
    isi: `${hari(tanggal)} · ${pertama.event} kloter ${pertama.kloter}${pertama.captain ? " · kamu captain" : ""}${lain}.${belum ? ' Tekan "Siap 👍".' : ""}`,
    url: "/beranda",
    tag: `jadwal-${tanggal}`,
  };
}

export function pesanDitugaskan(x: { event: string; tanggal: string; jam: string; peran: string }): PesanPush {
  return { judul: "Tugas baru", isi: `${x.event} · ${hari(x.tanggal)} berangkat ${x.jam} · ${x.peran}`, url: "/beranda", tag: `tugas-${x.tanggal}` };
}

export function pesanPrDiajukan(nomor: string, idPr: string, tanggal: string): PesanPush {
  return { judul: "PR menunggu persetujuan", isi: `${nomor} untuk ${hari(tanggal)}`, url: `/belanja/${idPr}`, tag: `pr-${idPr}` };
}

export function pesanPrDiputus(nomor: string, idPr: string, disetujui: boolean): PesanPush {
  return disetujui
    ? { judul: "PR disetujui ✅", isi: `${nomor} disetujui Finance — dana belanja dicatat.`, url: `/belanja/${idPr}`, tag: `pr-${idPr}` }
    : { judul: "PR dikembalikan", isi: `${nomor} dikembalikan Finance — lihat catatannya.`, url: `/belanja/${idPr}`, tag: `pr-${idPr}` };
}

export function pesanAbsenMasuk(event: string, kloter: number): PesanPush {
  return { judul: "Absen tim masuk", isi: `${event} kloter ${kloter} — fee perlu dikunci.`, url: "/honor", tag: "honor" };
}

export function pesanOpnameDiajukan(bulan: string, idOpname: string): PesanPush {
  return { judul: "Opname menunggu Finance", isi: `Opname ${bulan} diajukan — periksa & finalkan.`, url: `/stok/opname/${idOpname}`, tag: `opname-${idOpname}` };
}

export function pesanPengingatOpname(bulan: string): PesanPush {
  return { judul: "Waktunya stock opname", isi: `Opname ${bulan} belum dilakukan. Buka Stok → Stock opname.`, url: "/stok/opname", tag: "opname" };
}

export function pesanHutangJatuhTempo(jumlah: number): PesanPush | null {
  return jumlah ? { judul: "Hutang supplier jatuh tempo", isi: `${jumlah} tagihan supplier jatuh tempo hari ini / sudah lewat.`, url: "/hutang-supplier", tag: "hutang" } : null;
}

/** Status kirim kloter ke admin & sales pemegang event (D-100): "✅ Sudah sampai 09.28 · Pak Agus". */
export function pesanStatusKirim(x: { label: string; jam: string; oleh: string; event: string; kloter: number; idEvent: string; idKloter: string; foto: boolean }): PesanPush {
  return {
    judul: `${x.label} ${x.jam} · ${x.oleh}`,
    isi: `${x.event} kloter ${x.kloter}${x.foto ? " · foto bukti di halaman event" : ""}`,
    url: `/event/${x.idEvent}`,
    tag: `kirim-${x.idKloter}`,
  };
}

/** Event dibatalkan dengan uang yang harus dikembalikan → Finance (D-102). */
export function pesanRefundMenunggu(event: string, nominal: number, idEvent: string): PesanPush {
  return { judul: "Refund menunggu Finance", isi: `${event} dibatalkan — kembalikan Rp ${nominal.toLocaleString("id-ID")}.`, url: `/event/${idEvent}`, tag: `refund-${idEvent}` };
}

/** Pengingat ulang tahun karyawan (D-109) — pagi hari ke owner & admin (yang berulang tahun tidak ikut dikirimi). */
export function pesanUlangTahun(hariIni: string[], besok: string[]): PesanPush | null {
  if (!hariIni.length && !besok.length) return null;
  const gabung = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(", ")} & ${n.at(-1)}` : n[0]);
  return hariIni.length
    ? { judul: `🎂 Hari ini ulang tahun ${gabung(hariIni)}`, isi: besok.length ? `Besok: ${gabung(besok)}. Jangan lupa ucapan & perayaan kecilnya.` : "Jangan lupa ucapan & perayaan kecilnya.", url: "/ulang-tahun", tag: "ulang-tahun" }
    : { judul: `🎂 Besok ulang tahun ${gabung(besok)}`, isi: "Siapkan ucapan & perayaan kecilnya dari sekarang.", url: "/ulang-tahun", tag: "ulang-tahun" };
}

