import { Ban, CircleAlert, CircleCheck, CircleDashed, CircleX, Clock, Hourglass, type LucideIcon, PencilLine, Send } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Chip status (sistem desain v2, D-059): pill tanpa garis tepi, ikon 15px,
 * warna dari token status. Ikon membuat status tetap terbaca oleh pengguna
 * yang sulit membedakan warna.
 */

export type Nada = "lunas" | "info" | "tempo" | "perhatian" | "netral";

const NADA: Record<Nada, string> = {
  lunas: "bg-lunas-halus text-lunas",
  info: "bg-info-halus text-info",
  tempo: "bg-tempo-halus text-tempo",
  perhatian: "bg-perhatian-halus text-perhatian",
  netral: "bg-secondary text-muted-foreground",
};

type Status = { label: string; nada: Nada; ikon: LucideIcon };

const STATUS_TAGIHAN: Record<string, Status> = {
  paid: { label: "Lunas", nada: "lunas", ikon: CircleCheck },
  partial: { label: "Sebagian", nada: "info", ikon: CircleDashed },
  overdue: { label: "Jatuh tempo", nada: "tempo", ikon: CircleAlert },
  unpaid: { label: "Belum dibayar", nada: "netral", ikon: Clock },
  cancelled: { label: "Dibatalkan", nada: "netral", ikon: Ban },
};

const STATUS_PENAWARAN: Record<string, Status> = {
  approved: { label: "Disetujui", nada: "lunas", ikon: CircleCheck },
  sent: { label: "Terkirim", nada: "info", ikon: Send },
  rejected: { label: "Ditolak", nada: "tempo", ikon: CircleX },
  expired: { label: "Kadaluarsa", nada: "perhatian", ikon: Hourglass },
  draft: { label: "Draft", nada: "netral", ikon: PencilLine },
};

export function ChipStatus({ label, nada, ikon: Ikon }: { label: string; nada: Nada; ikon?: LucideIcon }) {
  return (
    <span className={cn("inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium whitespace-nowrap", NADA[nada])}>
      {Ikon ? <Ikon className="size-[15px]" strokeWidth={2} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

export function StatusTagihan({ status }: { status: string }) {
  const s = STATUS_TAGIHAN[status] ?? { label: status, nada: "netral" as const, ikon: Clock };
  return <ChipStatus {...s} />;
}

export function StatusPenawaran({ status }: { status: string }) {
  const s = STATUS_PENAWARAN[status] ?? { label: status, nada: "netral" as const, ikon: PencilLine };
  return <ChipStatus {...s} />;
}
