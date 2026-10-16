import "server-only";

import type { Sesi } from "./auth";

/** Sales hanya melihat & mengubah lead yang dipegangnya (D-047); peran lain semua. */
export function leadMiliknya(sesi: Sesi): { owner_user_id?: bigint } {
  return sesi.peran === "sales" ? { owner_user_id: BigInt(sesi.id) } : {};
}
