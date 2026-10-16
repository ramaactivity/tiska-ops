import "server-only";

import type { Sesi } from "./auth";

/** Sales melihat event dari quotation miliknya; peran lain semua (D-049). */
export function eventMiliknya(sesi: Sesi): { quotations?: { created_by: bigint } } {
  return sesi.peran === "sales" ? { quotations: { created_by: BigInt(sesi.id) } } : {};
}
