/* ==========================================================================
   PENUGASAN TIM & ARMADA (01-SPEC G, D-051). Murni.
   ========================================================================== */

export const PERAN_TUGAS = {
  captain: "Captain (PIC)",
  driver: "Driver",
  steward: "Steward",
  delivery_lauk: "Delivery lauk",
  crew: "Crew",
  dw: "DW / freelance",
} as const;
export type PeranTugas = keyof typeof PERAN_TUGAS;

export type Penugasan = {
  idEvent: string;
  namaEvent: string;
  tanggal: string;
  kloter: number;
  jam: string;
  orang: string; // kunci orang: "u:<id>" atau "n:<nama kecil>"
  namaOrang: string;
  kendaraan: string | null;
  namaKendaraan: string | null;
};

/** Orang/kendaraan yang dipakai di LEBIH dari satu event pada tanggal yang sama. */
export function cariBentrok(semua: Penugasan[]): Map<string, string[]> {
  const kelompok = new Map<string, Penugasan[]>();
  for (const p of semua) {
    for (const kunci of [`orang|${p.tanggal}|${p.orang}`, p.kendaraan ? `kendaraan|${p.tanggal}|${p.kendaraan}` : null]) {
      if (kunci) kelompok.set(kunci, [...(kelompok.get(kunci) ?? []), p]);
    }
  }
  const hasil = new Map<string, string[]>();
  for (const [kunci, daftar] of kelompok) {
    const event = new Set(daftar.map((d) => d.idEvent));
    if (event.size < 2) continue;
    const [jenis] = kunci.split("|");
    const nama = jenis === "orang" ? daftar[0].namaOrang : daftar[0].namaKendaraan;
    const pesan = `${nama} juga dijadwalkan di ${[...new Set(daftar.map((d) => `${d.namaEvent} (kloter ${d.kloter} ${d.jam})`))].join(" & ")}`;
    for (const d of daftar) hasil.set(d.idEvent, [...new Set([...(hasil.get(d.idEvent) ?? []), pesan])]);
  }
  return hasil;
}
