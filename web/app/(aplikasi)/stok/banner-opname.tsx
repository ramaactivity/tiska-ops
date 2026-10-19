import Link from "next/link";

import { labelPeriode } from "@/lib/hitung/opname";
import { pengingatOpname } from "@/lib/stok";

/** Banner "opname bulan ini belum dilakukan" (D-088) — sejak tanggal 1 sampai opname final. */
export async function BannerOpname() {
  const p = await pengingatOpname();
  if (!p) return null;
  const teks =
    p.status === "diajukan"
      ? `Opname ${labelPeriode(p.periode)} menunggu difinalkan Finance.`
      : p.status === "berjalan"
        ? `Opname ${labelPeriode(p.periode)} sedang berjalan — belum diajukan.`
        : `Opname ${labelPeriode(p.periode)} belum dilakukan.`;
  return (
    <Link
      href={p.id ? `/stok/opname/${p.id}` : "/stok/opname"}
      className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian hover:opacity-90"
    >
      <span className="font-medium">{teks}</span>
      <span className="shrink-0 underline">Buka opname</span>
    </Link>
  );
}
