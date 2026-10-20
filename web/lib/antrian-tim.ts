/* Untuk browser saja (IndexedDB). */

/* ==========================================================================
   ANTRIAN LAPORAN TIM LAPANGAN (Fase 3.5, D-099)

   Siap 👍, status kirim (+ foto) dan BAST selalu masuk antrian di HP dulu, lalu
   dikirim berurutan ke /api/tim/lapor. Tanpa sinyal = tetap di HP, dikirim
   lagi saat sinyal kembali / halaman dibuka. Server idempoten, jadi kirim
   ulang aman; jam yang dicatat = jam tombol ditekan.
   ========================================================================== */

export type AksiTim =
  | { jenis: "siap"; id: string; jam: number }
  | { jenis: "status"; id: string; status: string; foto: Blob | null; lat: number | null; lng: number | null; jam: number }
  | { jenis: "bast"; id: string; penerima: string; kondisi: string; catatan: string; ttd: Blob; foto: Blob | null; jam: number };
export type AksiTersimpan = AksiTim & { kunci: number };
export type HasilKirim = { terkirim: number[]; ditolak: string[]; tertunda: number; sesiHabis: boolean };

export const UBAH_ANTRIAN = "antrian-tim";

function toko<T>(mode: IDBTransactionMode, kerja: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((ok, gagal) => {
    const buka = indexedDB.open("tiska-antrian", 1);
    buka.onupgradeneeded = () => buka.result.createObjectStore("aksi", { keyPath: "kunci", autoIncrement: true });
    buka.onerror = () => gagal(buka.error);
    buka.onsuccess = () => {
      const db = buka.result;
      const q = kerja(db.transaction("aksi", mode).objectStore("aksi"));
      q.onsuccess = () => (db.close(), ok(q.result as T));
      q.onerror = () => (db.close(), gagal(q.error));
    };
  });
}

export const isiAntrian = () => toko<AksiTersimpan[]>("readonly", (s) => s.getAll());
const buang = async (kunci: number) => {
  await toko("readwrite", (s) => s.delete(kunci));
  window.dispatchEvent(new Event(UBAH_ANTRIAN));
};

/** Simpan ke antrian lalu langsung coba kirim. Hasilnya untuk toast tombol yang ditekan. */
export async function antrekan(a: AksiTim): Promise<{ kunci: number; hasil: HasilKirim }> {
  const kunci = await toko<number>("readwrite", (s) => s.add(a));
  window.dispatchEvent(new Event(UBAH_ANTRIAN));
  return { kunci, hasil: await kirimAntrian() };
}

async function kirim(): Promise<HasilKirim> {
  const h: HasilKirim = { terkirim: [], ditolak: [], tertunda: 0, sesiHabis: false };
  for (;;) {
    const [a, ...sisa] = await isiAntrian();
    if (!a) return h;
    const f = new FormData();
    for (const [k, v] of Object.entries(a)) if (v !== null && k !== "kunci") f.append(k, v instanceof Blob ? v : String(v));
    let r: Response;
    try {
      r = await fetch("/api/tim/lapor", { method: "POST", body: f, signal: AbortSignal.timeout(30_000) });
    } catch {
      return { ...h, tertunda: sisa.length + 1 }; // tanpa sinyal — coba lagi nanti
    }
    if (r.status === 401 || r.status >= 500 || r.redirected) return { ...h, tertunda: sisa.length + 1, sesiHabis: r.status === 401 };
    if (!r.ok) h.ditolak.push(((await r.json().catch(() => null)) as { pesan?: string } | null)?.pesan ?? "Laporan ditolak.");
    else h.terkirim.push(a.kunci);
    await buang(a.kunci);
  }
}

// Satu pengiriman pada satu waktu, berurutan (Berangkat sebelum Sudah sampai).
let rantai: Promise<unknown> = Promise.resolve();
export function kirimAntrian(): Promise<HasilKirim> {
  const p = rantai.then(kirim);
  rantai = p.catch(() => {});
  return p;
}
