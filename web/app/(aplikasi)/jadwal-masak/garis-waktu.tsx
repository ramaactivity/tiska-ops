import { linimasa, type Rencana, TITIK_MS } from "@/lib/rencana-masak";
import { cn } from "@/lib/utils";

const JAM_MS = 3_600_000;
const jam = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(ms).replace(":", ".");

/**
 * Garis waktu gabungan satu tanggal (docs/24 M1): kiri teks pekerjaan utuh (tidak dipotong), kanan batang jam.
 * Pekerjaan bersamaan terlihat bertumpuk di kolom jam yang sama — dasar peringatan bentrok di M2.
 */
export function GarisWaktu({ rencana }: { rencana: Rencana[] }) {
  const langkah = linimasa(rencana);
  if (!langkah.length) return null;
  const awal = Math.floor(Math.min(...langkah.map((l) => l.mulai)) / JAM_MS) * JAM_MS;
  const akhir = Math.ceil(Math.max(...langkah.map((l) => l.selesai ?? l.mulai + TITIK_MS)) / JAM_MS) * JAM_MS;
  const rentang = Math.max(JAM_MS, akhir - awal);
  const jumlahJam = rentang / JAM_MS;
  const tiap = jumlahJam > 12 ? 2 : 1;
  const posisi = (ms: number) => `${((ms - awal) / rentang) * 100}%`;
  const banyakPesanan = new Set(langkah.map((l) => l.pesanan)).size > 1;
  const kelompok = banyakPesanan
    ? [...new Set(langkah.map((l) => l.pesanan))].map((p) => ({ nama: p, langkah: langkah.filter((l) => l.pesanan === p) }))
    : [{ nama: null, langkah }];

  const garis = Array.from({ length: jumlahJam + 1 }, (_, n) => (
    <span key={n} className="absolute inset-y-0 w-px bg-border/70" style={{ left: posisi(awal + n * JAM_MS) }} aria-hidden />
  ));

  return (
    <div className="mt-5">
      {/* Kepala jam (layar lebar): label tiap 1–2 jam di atas kolom batang. */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 sm:grid">
        <span />
        <div className="relative h-5 text-xs text-muted-foreground tabular-nums">
          {Array.from({ length: Math.floor(jumlahJam / tiap) + 1 }, (_, n) => (
            <span key={n} className="absolute -translate-x-1/2" style={{ left: posisi(awal + n * tiap * JAM_MS) }}>
              {jam(awal + n * tiap * JAM_MS)}
            </span>
          ))}
        </div>
      </div>
      {kelompok.map((k) => (
        <div key={k.nama ?? "-"} className="mt-2">
          {k.nama ? <p className="pt-3 pb-1 text-sm font-semibold text-primary-strong">{k.nama}</p> : null}
          <ol className="flex flex-col divide-y">
            {k.langkah.map((l) => {
              const titik = l.selesai === null;
              return (
                <li key={l.kunci} className="grid gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
                  <div className="min-w-0 text-sm">
                    <span className="font-mono font-semibold tabular-nums">{titik ? l.jamMulai : `${l.jamMulai}–${l.jamSelesai}`}</span>{" "}
                    <span className={cn(titik && "font-semibold")}>{l.teks}</span>
                    {l.rincian.length ? <span className="block text-xs text-muted-foreground">{l.rincian.join(" · ")}</span> : null}
                  </div>
                  <div className="relative h-6 rounded-full bg-muted/50">
                    {garis}
                    {titik ? (
                      <span
                        className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-tempo shadow-sm"
                        style={{ left: posisi(l.mulai) }}
                        title={`Kloter ${l.jamMulai}`}
                      />
                    ) : (
                      <span
                        className="absolute inset-y-1 rounded-full bg-primary/80"
                        style={{ left: posisi(l.mulai), width: `max(0.5rem, ${(((l.selesai ?? l.mulai) - l.mulai) / rentang) * 100}%)` }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
