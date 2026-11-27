import { pecahNama, pisahSesi } from "@/lib/dapur-layar";

/**
 * Isi pesanan ringkas di kartu daftar (Jadwal Masak, Pengiriman): satu menu satu baris — jumlah di kolom kiri, nama
 * pendek tebal, keterangan abu di bawahnya; sisanya "+N menu lain" (Rama 27 Nov: deretan bertitik bertumpuk & bingung).
 */
export function DaftarMenuRingkas({ baris, maks = 4 }: { baris: { jumlah: string; nama: string }[]; maks?: number }) {
  if (!baris.length) return null;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {baris.slice(0, maks).map((b, n) => {
        const { utama, detail } = pecahNama(pisahSesi(b.nama).nama);
        return (
          <li key={n} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3">
            <span className="font-semibold tabular-nums">{b.jumlah.toLowerCase()}</span>
            <span className="min-w-0">
              <span className="font-medium">{utama}</span>
              {detail ? <span className="block text-muted-foreground">{detail}</span> : null}
            </span>
          </li>
        );
      })}
      {baris.length > maks ? <li className="pl-[5.5rem] text-muted-foreground">+{baris.length - maks} menu lain</li> : null}
    </ul>
  );
}
