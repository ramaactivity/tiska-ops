import { cn } from "@/lib/utils";

export type BlokSyarat = { jenis: "judul" | "teks"; isi: string } | { jenis: "butir"; nomor: string; isi: string; anak?: boolean };

/**
 * Teks S&K bebas → blok tampilan (D-163). Baris berawalan angka ("1 ", "1.", "2)") menjadi butir bernomor; baris
 * lain yang berakhir titik dua menjadi judul. Teks aslinya tidak diubah — hanya cara menampilkannya.
 */
export function pecahSyarat(teks: string): BlokSyarat[] {
  return teks
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): BlokSyarat => {
      const sub = b.match(/^(\d{1,2}\.\d{1,2})\.?\s+(\S.*)$/);
      if (sub) return { jenis: "butir", nomor: sub[1], isi: sub[2], anak: true };
      const m = b.match(/^(\d{1,2})\s*[.)]?\s+(\S.*)$/);
      if (m) return { jenis: "butir", nomor: m[1], isi: m[2] };
      // Judul: berakhiran titik dua ("Termin Pembayaran Deposit :") atau huruf kapital semua ("SYARAT DAN KETENTUAN …").
      const kapital = /[A-Z]/.test(b) && !/[a-z]/.test(b) && b.length > 3;
      return { jenis: b.endsWith(":") || kapital ? "judul" : "teks", isi: b.replace(/\s*:$/, ":") };
    });
}

/** Daftar S&K bernomor dengan indentasi gantung: baris lanjutan sejajar huruf pertama, bukan nomornya. */
export function TeksSyarat({ teks, className, lapang = false }: { teks: string; className?: string; /** Layar: judul bagian dipisah garis tipis (cetakan tetap rapat). */ lapang?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-[0.35em]", className)}>
      {pecahSyarat(teks).map((b, i) =>
        b.jenis === "butir" ? (
          <div key={i} className={cn("flex gap-[0.5em]", b.anak && "pl-[1.9em]")}>
            <span className={cn("shrink-0 text-right tabular-nums", b.anak ? "w-[2em]" : "w-[1.4em]")}>{b.nomor}{b.anak ? "" : "."}</span>
            <span className="min-w-0">{b.isi}</span>
          </div>
        ) : (
          <div
            key={i}
            className={
              b.jenis === "judul" ? cn("font-semibold", i > 0 && (lapang ? "mt-[0.9em] border-t border-dashed pt-[0.8em]" : "mt-[0.6em]"), lapang && "text-foreground") : undefined
            }
          >
            {b.isi}
          </div>
        ),
      )}
    </div>
  );
}
